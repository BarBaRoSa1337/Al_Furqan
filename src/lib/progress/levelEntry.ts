import type { LevelProgress } from '../../types/progress';

export type LevelEntryState = 'new' | 'in_progress' | 'completed';

export function resolveLevelEntryState(progress: LevelProgress | null): LevelEntryState {
  if (!progress) return 'new';
  return progress.completed ? 'completed' : 'in_progress';
}
