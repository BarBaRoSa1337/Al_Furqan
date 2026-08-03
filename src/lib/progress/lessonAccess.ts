import { Level } from '../../types/content';

export type LevelAccessState = 'completed' | 'active' | 'locked';

export function getLevelAccessState(
  levels: Level[],
  completedLevelIds: string[],
  levelId: string
): LevelAccessState {
  const levelIndex = levels.findIndex((level) => level.id === levelId);

  if (levelIndex === -1) {
    return 'locked';
  }

  if (completedLevelIds.includes(levelId)) {
    return 'completed';
  }

  // Learners may enter any published lesson directly. Unlock rules remain in
  // the content contract for future guided modes, but never block navigation.
  return 'active';
}

export function isLevelAccessible(
  levels: Level[],
  completedLevelIds: string[],
  levelId: string
): boolean {
  return getLevelAccessState(levels, completedLevelIds, levelId) !== 'locked';
}
