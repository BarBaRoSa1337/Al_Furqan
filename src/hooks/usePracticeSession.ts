import { useEffect, useRef, useState } from 'react';
import { getContentRepository } from '../lib/content/repository';
import { evaluateActivity, evaluateQuestion } from '../lib/activities/activityEngine';
import { createActivityEvaluationContext } from '../lib/activities/activityContext';
import { getPracticeLevelSteps } from '../lib/content/lessonSteps';
import { getAppProgress, recordActivityAttempt, recordQuestionAttempt } from '../lib/progress/storage';
import type { QuestionBlock } from '../types/content';

export type PracticeSessionStatus = 'loading' | 'ready' | 'locked' | 'not_found' | 'error';
export type PracticeFeedback = { correct: boolean };

export function usePracticeSession(levelId: string | undefined) {
  const repo = getContentRepository();
  const level = levelId ? repo.getLevelById(levelId) : undefined;
  const path = level ? repo.getLearningPathById(level.pathId) : undefined;
  const steps = level ? getPracticeLevelSteps(level) : [];
  const [status, setStatus] = useState<PracticeSessionStatus>('loading');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [correctQuestionIds, setCorrectQuestionIds] = useState<string[]>([]);
  const [activityResults, setActivityResults] = useState<Record<string, boolean>>({});
  const [draftAnswer, setDraftAnswer] = useState<{ id: string; answer: unknown; kind: 'activity' | 'question' } | null>(null);
  const [retryStepIndexes, setRetryStepIndexes] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<PracticeFeedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const operationLocked = useRef(false);
  const step = steps[currentStepIndex];
  const questionIds = step?.blocks.filter(block => block.type === 'question').map(block => block.id) ?? [];
  const activityIds = step?.blocks.filter((block): block is Extract<typeof block, { type: 'activity' }> => block.type === 'activity').map(block => block.activity.id) ?? [];
  const interactionComplete = questionIds.every(id => correctQuestionIds.includes(id)) && activityIds.every(id => activityResults[id] === true);
  const hasInteraction = questionIds.length > 0 || activityIds.length > 0;
  const hasDraftAnswer = Boolean(draftAnswer && (questionIds.includes(draftAnswer.id) || activityIds.includes(draftAnswer.id)));
  const canProceed = feedback !== null || (hasInteraction ? interactionComplete || hasDraftAnswer : true);
  const needsCheck = feedback === null && hasInteraction && !interactionComplete && hasDraftAnswer;
  const isLastStep = currentStepIndex === steps.length - 1;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus('loading');
      setError(null);
      if (!level || !path || steps.length === 0) {
        if (!cancelled) setStatus('not_found');
        return;
      }
      try {
        const progress = await getAppProgress();
        if (!progress.completedLevelIds.includes(level.id)) {
          if (!cancelled) setStatus('locked');
          return;
        }
        if (!cancelled) setStatus('ready');
      } catch (cause) {
        if (!cancelled) {
          setError(toErrorMessage(cause));
          setStatus('error');
        }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [levelId]);

  async function answerQuestion(blockId: string, selectedAnswer: unknown): Promise<void> {
    if (!questionIds.includes(blockId) || operationLocked.current || feedback) return;
    setDraftAnswer({ id: blockId, answer: selectedAnswer, kind: 'question' });
  }

  async function answerActivity(activityId: string, answer: unknown): Promise<void> {
    if (!activityIds.includes(activityId) || operationLocked.current || feedback) return;
    setDraftAnswer({ id: activityId, answer, kind: 'activity' });
  }

  async function advance(): Promise<boolean> {
    if (!level || !path || !step || !canProceed || operationLocked.current) return false;
    let sessionFinished = false;
    const saved = await runExclusive(async () => {
      if (feedback) {
        sessionFinished = await moveToNextStep(feedback.correct);
        return;
      }
      if (!needsCheck) {
        sessionFinished = await moveToNextStep(true);
        return;
      }
      let correct = true;
      if (needsCheck && draftAnswer?.kind === 'question') {
        const block = step.blocks.find((candidate): candidate is QuestionBlock => candidate.type === 'question' && candidate.id === draftAnswer.id);
        if (!block) throw new Error('Practice question is unavailable.');
        correct = evaluateQuestion(block, draftAnswer.answer);
        await recordQuestionAttempt({ levelId: level.id, pathId: path.id, questionId: block.id, selectedAnswer: draftAnswer.answer, correct });
        if (correct) setCorrectQuestionIds(current => current.includes(block.id) ? current : [...current, block.id]);
      }
      if (needsCheck && draftAnswer?.kind === 'activity') {
        const activity = step.blocks.find((block): block is Extract<typeof block, { type: 'activity' }> => block.type === 'activity' && block.activity.id === draftAnswer.id)?.activity;
        if (!activity) throw new Error('Practice activity is unavailable.');
        correct = evaluateActivity(activity, draftAnswer.answer, createActivityEvaluationContext(repo)).correct;
        await recordActivityAttempt({ levelId: level.id, pathId: path.id, activityId: activity.id, answer: draftAnswer.answer, correct, evaluationVersion: '1' });
        setActivityResults(current => ({ ...current, [activity.id]: correct }));
      }
      setFeedback({ correct });
    });
    return saved && sessionFinished;
  }

  async function moveToNextStep(correct: boolean): Promise<boolean> {
      const nextRetries = correct || retryStepIndexes.includes(currentStepIndex) ? retryStepIndexes : [...retryStepIndexes, currentStepIndex];
      const nextIndex = currentStepIndex + 1;
      const targetIndex = nextIndex < steps.length ? nextIndex : nextRetries[0];
      setDraftAnswer(null);
      setFeedback(null);
      if (targetIndex === undefined) return true;
      setCurrentStepIndex(targetIndex);
      setRetryStepIndexes(nextIndex < steps.length ? nextRetries : nextRetries.slice(1));
      setCorrectQuestionIds([]);
      setActivityResults({});
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

  return { level, step, status, currentStepIndex, totalSteps: steps.length, canProceed, needsCheck, feedback, retryCount: retryStepIndexes.length, isLastStep, busy, error, answerQuestion, answerActivity, advance };
}

function toErrorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Practice progress could not be saved. Please try again.';
}
