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
  const [correctQuestionIds, setCorrectQuestionIds] = useState<string[]>([]);
  const [activityResults, setActivityResults] = useState<Record<string, boolean>>({});
  const [draftAnswer, setDraftAnswer] = useState<{ id: string; answer: unknown; kind: 'activity' | 'question' } | null>(null);
  const [feedback, setFeedback] = useState<SessionFeedback | null>(null);
  const [stepRevision, setStepRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<ProgressRecoveryWarning | null>(null);
  const operationLocked = useRef(false);
  const preSessionRef = useRef<LevelProgress | undefined>(undefined);

  const currentStepIndex = cursor.currentStepIndex;
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
          setCorrectQuestionIds([]);
          setActivityResults({});
          setDraftAnswer(null);
          setFeedback(null);
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
    return () => { cancelled = true; };
  }, [lessonLocale, levelId, startMode]);

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
        await recordQuestionAttempt({ levelId: level.id, pathId: path.id, questionId: block.id, selectedAnswer: draftAnswer.answer, correct, locale: lessonLocale });
        if (correct) setCorrectQuestionIds(current => current.includes(block.id) ? current : [...current, block.id]);
      }
      if (needsCheck && draftAnswer?.kind === 'activity') {
        const activity = step.blocks.find((block): block is Extract<typeof block, { type: 'activity' }> => block.type === 'activity' && block.activity.id === draftAnswer.id)?.activity;
        if (!activity) throw new Error('Activity is unavailable for this step.');
        correct = evaluateActivity(activity, draftAnswer.answer, createActivityEvaluationContext(repo)).correct;
        await recordActivityAttempt({ levelId: level.id, pathId: path.id, activityId: activity.id, answer: draftAnswer.answer, correct, evaluationVersion: '1', locale: lessonLocale, languageIndependent: activity.languageIndependent });
        setActivityResults(current => ({ ...current, [activity.id]: correct }));
      }
      setFeedback({ correct });
    });
    return receipt;
  }

  async function moveToNextStep(correct: boolean): Promise<CompletionReceipt | null> {
      const next = advanceSessionCursor(coreSteps.length, cursor, correct);
      const targetStep = next.complete ? undefined : coreSteps[next.cursor.currentStepIndex];
      await completeLevelStep(level!.id, path!.id, step!.id, targetStep?.id);
      setDraftAnswer(null);
      setFeedback(null);
      if (!next.complete) {
        setCursor(next.cursor);
        setStepRevision(current => current + 1);
        setCorrectQuestionIds([]);
        setActivityResults({});
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
    needsCheck,
    feedback,
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
