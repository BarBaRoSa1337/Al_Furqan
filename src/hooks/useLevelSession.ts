import { useEffect, useRef, useState } from 'react';
import { getContentRepository } from '../lib/content/repository';
import { evaluateActivity, evaluateQuestion } from '../lib/activities/activityEngine';
import { createActivityEvaluationContext } from '../lib/activities/activityContext';
import { isLevelAccessible } from '../lib/progress/lessonAccess';
import {
  completeLevel,
  completeLevelStep,
  getAppProgress,
  getLevelProgress,
  getProgressRecoveryWarning,
  recordQuestionAttempt,
  recordActivityAttempt,
  restartLevel,
  startLevel,
  abandonLevel,
} from '../lib/progress/storage';
import { CompletionReceipt, LevelProgress, ProgressRecoveryWarning } from '../types/progress';
import { LevelStep, QuestionBlock } from '../types/content';
import { getResumeStepIndex } from '../lib/progress/levelResume';
import { getCoreLevelSteps } from '../lib/content/lessonSteps';
import { useLocalization } from '../lib/localization/LocalizationProvider';
import { isLessonLocaleAvailable } from '../lib/content/publication';
import { advanceSessionCursor, createSessionCursor } from '../lib/progress/sessionSequence';
import type { ExerciseSubmissionResult } from '../types/activities';

export type LevelSessionStatus = 'loading' | 'ready' | 'locked' | 'locale_unavailable' | 'not_found' | 'error';
export type SessionFeedback = { correct: boolean };
export type LevelStartMode = 'resume' | 'start_over';

export function useLevelSession(levelId: string | undefined, startMode: LevelStartMode = 'resume') {
  const { preferences } = useLocalization();
  const lessonLocale = preferences.lessonLocale;
  const repo = getContentRepository();
  const level = levelId ? repo.getLevelById(levelId) : undefined;
  const path = level ? repo.getLearningPathById(level.pathId) : undefined;
  const coreSteps = level ? getCoreLevelSteps(level) : [];
  const [status, setStatus] = useState<LevelSessionStatus>('loading');
  const [cursor, setCursor] = useState(() => createSessionCursor(0));
  const [feedback, setFeedback] = useState<SessionFeedback | null>(null);
  const [completionReceipt, setCompletionReceipt] = useState<CompletionReceipt | null>(null);
  const [stepRevision, setStepRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<ProgressRecoveryWarning | null>(null);
  const operationLocked = useRef(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const preSessionRef = useRef<LevelProgress | undefined>(undefined);

  const currentStepIndex = cursor.currentStepIndex;
  const step = coreSteps[currentStepIndex];
  const questionIds = step?.required === false ? [] : step?.blocks.filter(block => block.type === 'question').map(block => block.id) ?? [];
  const requiredActivityIds = step?.required === false ? [] : step?.blocks
    .filter((block): block is Extract<typeof block, { type: 'activity' }> => block.type === 'activity' && block.activity.required)
    .map(block => block.activity.id) ?? [];
  const hasRequiredInteraction = questionIds.length > 0 || requiredActivityIds.length > 0;
  const canAdvance = !hasRequiredInteraction;
  const isLastStep = cursor.phase === 'retry'
    ? cursor.retryStepIndexes.length === 1
    : Boolean(level && currentStepIndex === coreSteps.length - 1 && cursor.retryStepIndexes.length === 0);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      setStatus('loading');
      setError(null);
      if (!level || !path) {
        if (!cancelled) setStatus('not_found');
        return null;
      }
      const contentPackage = repo.getPackageForLevel(level.id);
      if (!contentPackage || !isLessonLocaleAvailable(contentPackage, lessonLocale)) {
        if (!cancelled) setStatus('locale_unavailable');
        return null;
      }

      try {
        const appProgress = await getAppProgress();
        const levels = repo.getLevelsForLearningPath(path.id);
        if (!isLevelAccessible(levels, appProgress.completedLevelIds, level.id)) {
          if (!cancelled) setStatus('locked');
          return null;
        }

        const initialStepId = coreSteps[0]?.id ?? '';
        const existingProgress = await getLevelProgress(level.id);
        if (!cancelled) {
          preSessionRef.current = existingProgress ?? undefined;
        }

        const progress = startMode === 'start_over'
          ? await restartLevel(level.id, path.id, initialStepId)
          : await startLevel(level.id, path.id, initialStepId);
        const nextIndex = startMode === 'start_over' ? 0 : getResumeStepIndex(coreSteps, progress, level.steps);
        const pendingRetryIndexes = startMode === 'start_over'
          ? []
          : getPendingRetryStepIds(coreSteps, progress, lessonLocale)
            .map(id => coreSteps.findIndex(candidate => candidate.id === id))
            .filter(index => index >= 0);
        const retryPhase = coreSteps.length > 0
          && coreSteps.every(candidate => progress.completedStepIds.includes(candidate.id))
          && pendingRetryIndexes.length > 0;
        if (!cancelled) {
          setCursor(createSessionCursor(nextIndex, pendingRetryIndexes, retryPhase));
          setFeedback(null);
          setCompletionReceipt(null);
          setStepRevision(0);
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
    return () => { cancelled = true; if (advanceTimer.current) clearTimeout(advanceTimer.current); };
  }, [lessonLocale, levelId, startMode]);

  async function answerQuestion(blockId: string, selectedAnswer: unknown): Promise<ExerciseSubmissionResult> {
    if (!level || !path || !step || !questionIds.includes(blockId) || operationLocked.current || feedback) return { correct: false };
    const block = step.blocks.find((candidate): candidate is QuestionBlock => candidate.type === 'question' && candidate.id === blockId);
    if (!block) return { correct: false };
    const correct = evaluateQuestion(block, selectedAnswer);
    const saved = await runExclusive(async () => {
      await recordQuestionAttempt({ levelId: level.id, pathId: path.id, questionId: block.id, selectedAnswer, correct, locale: lessonLocale });
      setFeedback({ correct });
    });
    if (saved) scheduleAutomaticAdvance(correct);
    return { correct };
  }

  async function answerActivity(activityId: string, answer: unknown): Promise<ExerciseSubmissionResult> {
    if (!level || !path || !step || !requiredActivityIds.includes(activityId) || operationLocked.current || feedback) return { correct: false };
    const activity = step.blocks.find((block): block is Extract<typeof block, { type: 'activity' }> => block.type === 'activity' && block.activity.id === activityId)?.activity;
    if (!activity) return { correct: false };
    const correct = evaluateActivity(activity, answer, createActivityEvaluationContext(repo)).correct;
    const saved = await runExclusive(async () => {
      await recordActivityAttempt({ levelId: level.id, pathId: path.id, activityId: activity.id, answer, correct, evaluationVersion: '1', locale: lessonLocale, languageIndependent: activity.languageIndependent });
      setFeedback({ correct });
    });
    if (saved) scheduleAutomaticAdvance(correct);
    return { correct };
  }

  async function advance(): Promise<CompletionReceipt | null> {
    if (!level || !path || !step || hasRequiredInteraction || !canAdvance || operationLocked.current) return null;
    let receipt: CompletionReceipt | null = null;
    await runExclusive(async () => {
      receipt = await moveToNextStep(true);
    });
    return receipt;
  }

  function scheduleAutomaticAdvance(correct: boolean): void {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      void runExclusive(async () => {
        const receipt = await moveToNextStep(correct);
        if (receipt) setCompletionReceipt(receipt);
      });
    }, correct ? 500 : 400);
  }

  async function moveToNextStep(correct: boolean): Promise<CompletionReceipt | null> {
      const next = advanceSessionCursor(coreSteps.length, cursor, correct);
      const targetStep = next.complete ? undefined : coreSteps[next.cursor.currentStepIndex];
      await completeLevelStep(level!.id, path!.id, step!.id, targetStep?.id);
      setFeedback(null);
      if (!next.complete) {
        setCursor(next.cursor);
        setStepRevision(current => current + 1);
        return null;
      }
      return completeLevel(level!, path!, { packageRevisionId: repo.getPackageForLevel(level!.id)?.revisionId, locale: lessonLocale });
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
    displayStepIndex: cursor.phase === 'retry' ? Math.max(0, coreSteps.length - 1) : currentStepIndex,
    stepRenderKey: `${step?.id ?? 'missing'}:${stepRevision}`,
    totalCoreSteps: coreSteps.length,
    canProceed: canAdvance,
    hasInteraction: hasRequiredInteraction,
    feedback,
    completionReceipt,
    retryCount: cursor.phase === 'retry' ? cursor.retryStepIndexes.length : 0,
    isLastStep,
    busy,
    error,
    warning,
    answerQuestion,
    answerActivity,
    advance,
    abandonSession: async () => {
      if (!level) return;
      await abandonLevel(level.id, preSessionRef.current);
    },
    clearError: () => setError(null),
  };
}

function getPendingRetryStepIds(steps: readonly LevelStep[], progress: LevelProgress, locale: string): string[] {
  return steps.flatMap(step => {
    if (!progress.completedStepIds.includes(step.id) || step.required === false) return [];
    const questionIds = step.blocks.filter(block => block.type === 'question').map(block => block.id);
    const activities = step.blocks
      .filter((block): block is Extract<typeof block, { type: 'activity' }> => block.type === 'activity' && block.activity.required)
      .map(block => block.activity);
    const hasInteraction = questionIds.length > 0 || activities.length > 0;
    const passed = questionIds.every(id => progress.questionAttempts
      .filter(attempt => attempt.questionId === id && (attempt.locale ?? 'en') === locale)
      .at(-1)?.correct === true)
      && activities.every(activity => progress.activityAttempts
        .filter(attempt => attempt.activityId === activity.id
          && (activity.languageIndependent ? attempt.languageIndependent : (attempt.locale ?? 'en') === locale))
        .at(-1)?.correct === true);
    return hasInteraction && !passed ? [step.id] : [];
  });
}

function toErrorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Progress could not be saved. Please try again.';
}
