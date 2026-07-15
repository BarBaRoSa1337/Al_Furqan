import { useEffect, useRef, useState } from 'react';
import { getContentRepository } from '../lib/content/repository';
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

export type LevelSessionStatus = 'loading' | 'ready' | 'locked' | 'not_found' | 'error';

export function useLevelSession(levelId: string | undefined) {
  const repo = getContentRepository();
  const level = levelId ? repo.getLevelById(levelId) : undefined;
  const path = level ? repo.getLearningPathById(level.pathId) : undefined;
  const [status, setStatus] = useState<LevelSessionStatus>('loading');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [correctQuestionIds, setCorrectQuestionIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<ProgressRecoveryWarning | null>(null);
  const operationLocked = useRef(false);

  const step = level?.steps[currentStepIndex];
  const questionIds = step?.blocks.filter(block => block.type === 'question').map(block => block.id) ?? [];
  const canProceed = questionIds.every(questionId => correctQuestionIds.includes(questionId));
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
        const savedIndex = level.steps.findIndex(candidate => candidate.id === progress.currentStepId);
        const nextIndex = savedIndex >= 0 ? savedIndex : 0;
        if (!cancelled) {
          setCurrentStepIndex(nextIndex);
          setCorrectQuestionIds(getCorrectQuestionIds(level.steps[nextIndex]?.blocks.map(block => block.id) ?? [], progress));
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

  async function answerQuestion(blockId: string, selectedAnswer: string | number, correct: boolean): Promise<void> {
    if (!level || !path || operationLocked.current) return;
    const saved = await runExclusive(async () => {
      await recordQuestionAttempt({ levelId: level.id, pathId: path.id, questionId: blockId, selectedAnswer, correct });
      if (correct) setCorrectQuestionIds(current => current.includes(blockId) ? current : [...current, blockId]);
    });
    if (!saved) throw new Error('Answer could not be saved. Please try again.');
  }

  async function answerActivity(activityId: string, answer: unknown, correct: boolean): Promise<void> {
    if (!level || !path || operationLocked.current) return;
    const saved = await runExclusive(async () => { await recordActivityAttempt({ levelId: level.id, pathId: path.id, activityId, answer, correct, evaluationVersion: '1' }); });
    if (!saved) throw new Error('Activity could not be saved. Please try again.');
  }

  async function advance(): Promise<CompletionReceipt | null> {
    if (!level || !path || !step || !canProceed || operationLocked.current) return null;
    let receipt: CompletionReceipt | null = null;
    await runExclusive(async () => {
      const nextStep = level.steps[currentStepIndex + 1];
      const progress = await completeLevelStep(level.id, path.id, step.id, nextStep?.id);
      if (isLastStep) {
        receipt = await completeLevel(level, path);
        return;
      }
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      setCorrectQuestionIds(getCorrectQuestionIds(nextStep.blocks.map(block => block.id), progress));
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

function toErrorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Progress could not be saved. Please try again.';
}
