import { useEffect, useRef, useState } from 'react';
import { getContentRepository } from '../lib/content/repository';
import { evaluateActivity, evaluateQuestion } from '../lib/activities/activityEngine';
import { createActivityEvaluationContext } from '../lib/activities/activityContext';
import { isLevelAccessible } from '../lib/progress/lessonAccess';
import {
  completeLevel,
  completeLevelStep,
  getAppProgress,
  getProgressRecoveryWarning,
  recordQuestionAttempt,
  recordActivityAttempt,
  startLevel,
} from '../lib/progress/storage';
import { CompletionReceipt, LevelProgress, ProgressRecoveryWarning } from '../types/progress';
import { QuestionBlock } from '../types/content';
import { getResumeStepIndex } from '../lib/progress/levelResume';

export type LevelSessionStatus = 'loading' | 'ready' | 'locked' | 'not_found' | 'error';

export function useLevelSession(levelId: string | undefined) {
  const repo = getContentRepository();
  const level = levelId ? repo.getLevelById(levelId) : undefined;
  const path = level ? repo.getLearningPathById(level.pathId) : undefined;
  const [status, setStatus] = useState<LevelSessionStatus>('loading');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [correctQuestionIds, setCorrectQuestionIds] = useState<string[]>([]);
  const [activityResults, setActivityResults] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<ProgressRecoveryWarning | null>(null);
  const operationLocked = useRef(false);

  const step = level?.steps[currentStepIndex];
  const questionIds = step?.required === false ? [] : step?.blocks.filter(block => block.type === 'question').map(block => block.id) ?? [];
  const requiredActivityIds = step?.required === false ? [] : step?.blocks
    .filter((block): block is Extract<typeof block, { type: 'activity' }> => block.type === 'activity' && block.activity.required)
    .map(block => block.activity.id) ?? [];
  const canProceed = questionIds.every(questionId => correctQuestionIds.includes(questionId))
    && requiredActivityIds.every(activityId => activityResults[activityId] === true);
  const isLastStep = Boolean(level && currentStepIndex === level.steps.length - 1);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      setStatus('loading');
      setError(null);
      if (!level || !path) {
        if (!cancelled) setStatus('not_found');
        return;
      }

      try {
        const appProgress = await getAppProgress();
        const levels = repo.getLevelsForLearningPath(path.id);
        if (!isLevelAccessible(levels, appProgress.completedLevelIds, level.id)) {
          if (!cancelled) setStatus('locked');
          return;
        }

        const progress = await startLevel(level.id, path.id, level.steps[0]?.id ?? '');
        const nextIndex = getResumeStepIndex(level.steps, progress);
        if (!cancelled) {
          setCurrentStepIndex(nextIndex);
          setCorrectQuestionIds(getCorrectQuestionIds(level.steps[nextIndex]?.blocks.map(block => block.id) ?? [], progress));
          setActivityResults(getLatestActivityResults(level.steps[nextIndex]?.blocks.map(block => block.id) ?? [], progress));
          setWarning(getProgressRecoveryWarning());
          setStatus('ready');
        }
      } catch (cause) {
        if (!cancelled) {
          setError(toErrorMessage(cause));
          setStatus('error');
        }
      }
    }

    void loadSession();
    return () => { cancelled = true; };
  }, [levelId]);

  async function answerQuestion(blockId: string, selectedAnswer: unknown): Promise<void> {
    if (!level || !path || operationLocked.current) return;
    const block = level.steps.flatMap(candidate => candidate.blocks)
      .find((candidate): candidate is QuestionBlock => candidate.type === 'question' && candidate.id === blockId);
    if (!block) throw new Error('Question is unavailable for this level.');
    const correct = evaluateQuestion(block, selectedAnswer);
    const saved = await runExclusive(async () => {
      await recordQuestionAttempt({ levelId: level.id, pathId: path.id, questionId: blockId, selectedAnswer, correct });
      if (correct) setCorrectQuestionIds(current => current.includes(blockId) ? current : [...current, blockId]);
    });
    if (!saved) throw new Error('Answer could not be saved. Please try again.');
  }

  async function answerActivity(activityId: string, answer: unknown): Promise<void> {
    if (!level || !path || operationLocked.current) return;
    const activity = level.steps.flatMap(candidate => candidate.blocks)
      .find((block): block is Extract<typeof block, { type: 'activity' }> => block.type === 'activity' && block.activity.id === activityId)
      ?.activity;
    if (!activity) throw new Error('Activity is unavailable for this level.');
    const evaluation = evaluateActivity(activity, answer, createActivityEvaluationContext(repo));
    const saved = await runExclusive(async () => {
      await recordActivityAttempt({ levelId: level.id, pathId: path.id, activityId, answer, correct: evaluation.correct, evaluationVersion: '1' });
      setActivityResults(current => ({ ...current, [activityId]: evaluation.correct }));
    });
    if (!saved) throw new Error('Activity could not be saved. Please try again.');
  }

  async function advance(): Promise<CompletionReceipt | null> {
    if (!level || !path || !step || !canProceed || operationLocked.current) return null;
    let receipt: CompletionReceipt | null = null;
    await runExclusive(async () => {
      const nextStep = level.steps[currentStepIndex + 1];
      const progress = await completeLevelStep(level.id, path.id, step.id, nextStep?.id);
      if (isLastStep) {
        receipt = await completeLevel(level, path, { packageRevisionId: repo.getPackageForLevel(level.id)?.revisionId });
        return;
      }
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      setCorrectQuestionIds(getCorrectQuestionIds(nextStep.blocks.map(block => block.id), progress));
      setActivityResults(getLatestActivityResults(nextStep.blocks.map(block => block.id), progress));
    });
    return receipt;
  }

  async function runExclusive(operation: () => Promise<void>): Promise<boolean> {
    operationLocked.current = true;
    setBusy(true);
    setError(null);
    try {
      await operation();
      return true;
    } catch (cause) {
      setError(toErrorMessage(cause));
      return false;
    } finally {
      operationLocked.current = false;
      setBusy(false);
    }
  }

  return {
    level,
    path,
    step,
    status,
    currentStepIndex,
    canProceed,
    isLastStep,
    busy,
    error,
    warning,
    answerQuestion,
    answerActivity,
    advance,
    clearError: () => setError(null),
  };
}

function getCorrectQuestionIds(blockIds: string[], progress: LevelProgress): string[] {
  return blockIds.filter(blockId => progress.questionAttempts.some(attempt => attempt.questionId === blockId && attempt.correct));
}

function getLatestActivityResults(blockIds: string[], progress: LevelProgress): Record<string, boolean> {
  return progress.activityAttempts.reduce<Record<string, boolean>>((results, attempt) => {
    if (blockIds.includes(attempt.activityId)) results[attempt.activityId] = attempt.correct;
    return results;
  }, {});
}

function toErrorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Progress could not be saved. Please try again.';
}
