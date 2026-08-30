import { Level } from '../../types/content';

export type LevelAccessState = 'completed' | 'active' | 'available' | 'locked';

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

  const firstIncompleteIndex = levels.findIndex(level => !completedLevelIds.includes(level.id));
  // Open navigation stays unrestricted; only one lesson receives current emphasis.
  return levelIndex === firstIncompleteIndex ? 'active' : 'available';
}

export function isLevelAccessible(
  levels: Level[],
  completedLevelIds: string[],
  levelId: string
): boolean {
  return getLevelAccessState(levels, completedLevelIds, levelId) !== 'locked';
}
