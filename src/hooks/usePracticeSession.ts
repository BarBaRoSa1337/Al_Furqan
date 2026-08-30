import { useEffect, useMemo, useRef, useState } from 'react';
import { getContentRepository } from '../lib/content/repository';
import { evaluateActivity, evaluateQuestion } from '../lib/activities/activityEngine';
import { createActivityEvaluationContext } from '../lib/activities/activityContext';
import { getPracticeLevelSteps } from '../lib/content/lessonSteps';
import { getAppProgress, recordActivityAttempt, recordQuestionAttempt } from '../lib/progress/storage';
import type { QuestionBlock } from '../types/content';
import { useLocalization } from '../lib/localization/LocalizationProvider';
import { isLessonLocaleAvailable } from '../lib/content/publication';
import { advanceSessionCursor, createSessionCursor } from '../lib/progress/sessionSequence';
import type { ExerciseSubmissionResult } from '../types/activities';

export type PracticeSessionStatus = 'loading' | 'ready' | 'locked' | 'locale_unavailable' | 'not_found' | 'error';
export type PracticeFeedback = { correct: boolean };

export function usePracticeSession(levelId: string | undefined) {
  const { preferences } = useLocalization();
  const lessonLocale = preferences.lessonLocale;
  const repo = getContentRepository();
  const level = levelId ? repo.getLevelById(levelId) : undefined;
  const path = level ? repo.getLearningPathById(level.pathId) : undefined;
  const steps = useMemo(() => level ? getPracticeLevelSteps(level) : [], [level]);
  const [status, setStatus] = useState<PracticeSessionStatus>('loading');
  const [cursor, setCursor] = useState(() => createSessionCursor(0));
  const [feedback, setFeedback] = useState<PracticeFeedback | null>(null);
  const [finished, setFinished] = useState(false);
  const [stepRevision, setStepRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const operationLocked = useRef(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const currentStepIndex = cursor.currentStepIndex;
  const step = steps[currentStepIndex];
  const questionIds = step?.blocks.filter(block => block.type === 'question').map(block => block.id) ?? [];
  const activityIds = step?.blocks.filter((block): block is Extract<typeof block, { type: 'activity' }> => block.type === 'activity').map(block => block.activity.id) ?? [];
  const hasInteraction = questionIds.length > 0 || activityIds.length > 0;
  const canProceed = !hasInteraction;
  const isLastStep = cursor.phase === 'retry'
    ? cursor.retryStepIndexes.length === 1
    : currentStepIndex === steps.length - 1 && cursor.retryStepIndexes.length === 0;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus('loading');
      setError(null);
      if (!level || !path || steps.length === 0) {
        if (!cancelled) setStatus('not_found');
        return;
      }
      const contentPackage = repo.getPackageForLevel(level.id);
      if (!contentPackage || !isLessonLocaleAvailable(contentPackage, lessonLocale)) {
        if (!cancelled) setStatus('locale_unavailable');
        return;
      }
      try {
        const progress = await getAppProgress();
        if (!progress.completedLevelIds.includes(level.id)) {
          if (!cancelled) setStatus('locked');
          return;
        }
        if (!cancelled) {
          setCursor(createSessionCursor(0));
          setFeedback(null);
          setFinished(false);
          setStepRevision(0);
          setStatus('ready');
        }
      } catch (cause) {
        if (!cancelled) {
          setError(toErrorMessage(cause));
          setStatus('error');
        }
      }
    }
    void load();
    return () => { cancelled = true; if (advanceTimer.current) clearTimeout(advanceTimer.current); };
  }, [lessonLocale, level, levelId, path, repo, steps]);

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
    if (!level || !path || !step || !activityIds.includes(activityId) || operationLocked.current || feedback) return { correct: false };
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

  async function advance(): Promise<boolean> {
    if (!level || !path || !step || hasInteraction || !canProceed || operationLocked.current) return false;
    let sessionFinished = false;
    const saved = await runExclusive(async () => {
      sessionFinished = await moveToNextStep(true);
    });
    return saved && sessionFinished;
  }

  function scheduleAutomaticAdvance(correct: boolean): void {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      void runExclusive(async () => {
        const sessionFinished = await moveToNextStep(correct);
        if (sessionFinished) setFinished(true);
      });
    }, correct ? 700 : 400);
  }

  async function moveToNextStep(correct: boolean): Promise<boolean> {
      const next = advanceSessionCursor(steps.length, cursor, correct);
      setFeedback(null);
      if (next.complete) return true;
      setCursor(next.cursor);
      setStepRevision(current => current + 1);
      return false;
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
    step,
    status,
    currentStepIndex,
    displayStepIndex: cursor.phase === 'retry' ? Math.max(0, steps.length - 1) : currentStepIndex,
    stepRenderKey: `${step?.id ?? 'missing'}:${stepRevision}`,
    totalSteps: steps.length,
    canProceed,
    hasInteraction,
    feedback,
    finished,
    retryCount: cursor.phase === 'retry' ? cursor.retryStepIndexes.length : 0,
    isLastStep,
    busy,
    error,
    answerQuestion,
    answerActivity,
    advance,
  };
}

function toErrorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Practice progress could not be saved. Please try again.';
}
