import type { LevelProgress } from '../../types/progress';
import { resolveLevelEntryState } from './levelEntry';

const progress: LevelProgress = {
  levelId: 'level-1',
  pathId: 'path-1',
  completed: false,
  startedAt: '2026-01-01T00:00:00.000Z',
  currentStepId: 'step-2',
  completedStepIds: ['step-1'],
  questionAttempts: [],
  activityAttempts: [],
};

test('resolves level entry choices from persisted progress', () => {
  expect(resolveLevelEntryState(null)).toBe('new');
  expect(resolveLevelEntryState(progress)).toBe('in_progress');
  expect(resolveLevelEntryState({ ...progress, completed: true })).toBe('completed');
});
