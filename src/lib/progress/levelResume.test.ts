import type { LevelProgress } from '../../types/progress';
import { surahAlFilLevels } from '../../content/packages/surah-al-fil/v1';
import { getResumeStepIndex } from './levelResume';
import { getCoreLevelSteps } from '../content/lessonSteps';

test('rewinds schema-v1 progress to a newly inserted required step', () => {
  const level = surahAlFilLevels[0];
  const progress: LevelProgress = {
    levelId: level.id, pathId: level.pathId, completed: false, startedAt: '2026-01-01T00:00:00.000Z',
    currentStepId: 'l1-recall', completedStepIds: ['l1-context', 'l1-read', 'l1-meaning'], questionAttempts: [], activityAttempts: [],
  };

  expect(level.steps[getResumeStepIndex(level.steps, progress)].id).toBe('l1-word-meaning');
});

test('keeps a normal current step when no earlier required step is missing', () => {
  const level = surahAlFilLevels[0];
  const progress: LevelProgress = {
    levelId: level.id, pathId: level.pathId, completed: false, startedAt: '2026-01-01T00:00:00.000Z',
    currentStepId: 'l1-meaning', completedStepIds: ['l1-context', 'l1-read'], questionAttempts: [], activityAttempts: [],
  };

  expect(level.steps[getResumeStepIndex(level.steps, progress)].id).toBe('l1-meaning');
});

test('rewinds unfinished Level 2 progress to its newly inserted retrieval step', () => {
  const level = surahAlFilLevels[1];
  const progress: LevelProgress = {
    levelId: level.id, pathId: level.pathId, completed: false, startedAt: '2026-01-01T00:00:00.000Z',
    currentStepId: 'l2-meaning', completedStepIds: ['l2-context', 'l2-read', 'l2-translation'], questionAttempts: [], activityAttempts: [],
  };

  expect(level.steps[getResumeStepIndex(level.steps, progress)].id).toBe('l2-retrieval');
});

test('moves a legacy resume position from optional practice to the next core step', () => {
  const level = surahAlFilLevels[0];
  const coreSteps = getCoreLevelSteps(level);
  const progress: LevelProgress = {
    levelId: level.id, pathId: level.pathId, completed: false, startedAt: '2026-01-01T00:00:00.000Z',
    currentStepId: 'l1-memory-practice',
    completedStepIds: ['l1-context', 'l1-read', 'l1-meaning', 'l1-word-meaning', 'l1-tafsir', 'l1-recall'],
    questionAttempts: [], activityAttempts: [],
  };

  expect(coreSteps[getResumeStepIndex(coreSteps, progress, level.steps)].id).toBe('l1-quiz');
});
