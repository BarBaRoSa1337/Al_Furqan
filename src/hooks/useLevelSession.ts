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
import { LevelStep, QuestionBlock } from '../types/content';
import { getResumeStepIndex } from '../lib/progress/levelResume';
import { getCoreLevelSteps } from '../lib/content/lessonSteps';

export type LevelSessionStatus = 'loading' | 'ready' | 'locked' | 'not_found' | 'error';
export type SessionFeedback = { correct: boolean };

export function useLevelSession(levelId: string | undefined) {
  const repo = getContentRepository();
  const level = levelId ? repo.getLevelById(levelId) : undefined;
  const path = level ? repo.getLearningPathById(level.pathId) : undefined;
  const coreSteps = level ? getCoreLevelSteps(level) : [];
  const [status, setStatus] = useState<LevelSessionStatus>('loading');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [correctQuestionIds, setCorrectQuestionIds] = useState<string[]>([]);
  const [activityResults, setActivityResults] = useState<Record<string, boolean>>({});
  const [draftAnswer, setDraftAnswer] = useState<{ id: string; answer: unknown; kind: 'activity' | 'question' } | null>(null);
  const [retryStepIds, setRetryStepIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<SessionFeedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<ProgressRecoveryWarning | null>(null);
  const operationLocked = useRef(false);

  const step = coreSteps[currentStepIndex];
  const questionIds = step?.required === false ? [] : step?.blocks.filter(block => block.type === 'question').map(block => block.id) ?? [];
  const requiredActivityIds = step?.required === false ? [] : step?.blocks
    .filter((block): block is Extract<typeof block, { type: 'activity' }> => block.type === 'activity' && block.activity.required)
    .map(block => block.activity.id) ?? [];
  const canProceed = questionIds.every(questionId => correctQuestionIds.includes(questionId))
    && requiredActivityIds.every(activityId => activityResults[activityId] === true);
  const hasRequiredInteraction = questionIds.length > 0 || requiredActivityIds.length > 0;
  const interactionComplete = canProceed;
  const hasDraftAnswer = Boolean(draftAnswer && (questionIds.includes(draftAnswer.id) || requiredActivityIds.includes(draftAnswer.id)));
  const canAdvance = feedback !== null || (hasRequiredInteraction ? interactionComplete || hasDraftAnswer : true);
  const needsCheck = feedback === null && hasRequiredInteraction && !interactionComplete && hasDraftAnswer;
  const isLastStep = Boolean(level && currentStepIndex === coreSteps.length - 1);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      setStatus('loading');
      setError(null);
      if (!level || !path) {
        if (!cancelled) setStatus('not_found');
        return null;
      }

      try {
        const appProgress = await getAppProgress();
        const levels = repo.getLevelsForLearningPath(path.id);
        if (!isLevelAccessible(levels, appProgress.completedLevelIds, level.id)) {
          if (!cancelled) setStatus('locked');
          return null;
        }

        const progress = await startLevel(level.id, path.id, coreSteps[0]?.id ?? '');
        const nextIndex = getResumeStepIndex(coreSteps, progress, level.steps);
        if (!cancelled) {
          setCurrentStepIndex(nextIndex);
          setCorrectQuestionIds(getCorrectQuestionIds(coreSteps[nextIndex]?.blocks.map(block => block.id) ?? [], progress));
          setActivityResults(getLatestActivityResults(coreSteps[nextIndex]?.blocks.map(block => block.id) ?? [], progress));
          setDraftAnswer(null);
          setFeedback(null);
          setRetryStepIds(getPendingRetryStepIds(coreSteps, progress));
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
    if (!questionIds.includes(blockId) || operationLocked.current || feedback) return;
    setDraftAnswer({ id: blockId, answer: selectedAnswer, kind: 'question' });
  }

  async function answerActivity(activityId: string, answer: unknown): Promise<void> {
    if (!requiredActivityIds.includes(activityId) || operationLocked.current || feedback) return;
    setDraftAnswer({ id: activityId, answer, kind: 'activity' });
  }

  async function advance(): Promise<CompletionReceipt | null> {
    if (!level || !path || !step || !canAdvance || operationLocked.current) return null;
    let receipt: CompletionReceipt | null = null;
    await runExclusive(async () => {
      if (feedback) {
        receipt = await moveToNextStep(feedback.correct);
        return;
      }
      if (!needsCheck) {
        receipt = await moveToNextStep(true);
        return;
      }
      let correct = true;
      if (needsCheck && draftAnswer?.kind === 'question') {
        const block = step.blocks.find((candidate): candidate is QuestionBlock => candidate.type === 'question' && candidate.id === draftAnswer.id);
        if (!block) throw new Error('Question is unavailable for this step.');
        correct = evaluateQuestion(block, draftAnswer.answer);
        await recordQuestionAttempt({ levelId: level.id, pathId: path.id, questionId: block.id, selectedAnswer: draftAnswer.answer, correct });
        if (correct) setCorrectQuestionIds(current => current.includes(block.id) ? current : [...current, block.id]);
      }
      if (needsCheck && draftAnswer?.kind === 'activity') {
        const activity = step.blocks.find((block): block is Extract<typeof block, { type: 'activity' }> => block.type === 'activity' && block.activity.id === draftAnswer.id)?.activity;
        if (!activity) throw new Error('Activity is unavailable for this step.');
        correct = evaluateActivity(activity, draftAnswer.answer, createActivityEvaluationContext(repo)).correct;
        await recordActivityAttempt({ levelId: level.id, pathId: path.id, activityId: activity.id, answer: draftAnswer.answer, correct, evaluationVersion: '1' });
        setActivityResults(current => ({ ...current, [activity.id]: correct }));
      }
      setFeedback({ correct });
    });
    return receipt;
  }

  async function moveToNextStep(correct: boolean): Promise<CompletionReceipt | null> {
      const nextRetryStepIds = correct || retryStepIds.includes(step!.id) ? retryStepIds : [...retryStepIds, step!.id];
      const nextStep = coreSteps[currentStepIndex + 1];
      const retryStepId = nextRetryStepIds[0];
      const retryStepIndex = retryStepId ? coreSteps.findIndex(candidate => candidate.id === retryStepId) : -1;
      const retryStep = retryStepIndex >= 0 ? coreSteps[retryStepIndex] : undefined;
      const targetStep = nextStep ?? retryStep;
      const progress = await completeLevelStep(level!.id, path!.id, step!.id, targetStep?.id);
      setDraftAnswer(null);
      setFeedback(null);
      if (nextStep) {
        const nextIndex = currentStepIndex + 1;
        setCurrentStepIndex(nextIndex);
        setRetryStepIds(nextRetryStepIds);
        setCorrectQuestionIds(getCorrectQuestionIds(nextStep.blocks.map(block => block.id), progress));
        setActivityResults(getLatestActivityResults(nextStep.blocks.map(block => block.id), progress));
        return null;
      }
      if (retryStepId) {
        if (retryStep && retryStepIndex >= 0) {
          setCurrentStepIndex(retryStepIndex);
          setRetryStepIds(nextRetryStepIds.slice(1));
          setCorrectQuestionIds(getCorrectQuestionIds(retryStep.blocks.map(block => block.id), progress));
          setActivityResults(getLatestActivityResults(retryStep.blocks.map(block => block.id), progress));
          return null;
        }
      }
      if (!correct) throw new Error('The exercise could not be scheduled for retry.');
      return completeLevel(level!, path!, { packageRevisionId: repo.getPackageForLevel(level!.id)?.revisionId });
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
    totalCoreSteps: coreSteps.length,
    canProceed: canAdvance,
    needsCheck,
    feedback,
    retryCount: retryStepIds.length,
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

function getPendingRetryStepIds(steps: readonly LevelStep[], progress: LevelProgress): string[] {
  return steps.flatMap(step => {
    if (!progress.completedStepIds.includes(step.id) || step.required === false) return [];
    const questionIds = step.blocks.filter(block => block.type === 'question').map(block => block.id);
    const activityIds = step.blocks
      .filter((block): block is Extract<typeof block, { type: 'activity' }> => block.type === 'activity' && block.activity.required)
      .map(block => block.activity.id);
    const hasInteraction = questionIds.length > 0 || activityIds.length > 0;
    const passed = questionIds.every(id => progress.questionAttempts.some(attempt => attempt.questionId === id && attempt.correct))
      && activityIds.every(id => progress.activityAttempts.some(attempt => attempt.activityId === id && attempt.correct));
    return hasInteraction && !passed ? [step.id] : [];
  });
}

function toErrorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Progress could not be saved. Please try again.';
}
