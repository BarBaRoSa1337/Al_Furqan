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

  const level = levels[levelIndex];
  const requiredLevelIds = level.unlockRules?.requiresLevelIds;
  if (requiredLevelIds && requiredLevelIds.length > 0) {
    return requiredLevelIds.every((requiredId) => completedLevelIds.includes(requiredId)) ? 'active' : 'locked';
  }

  if (levelIndex === 0) {
    return 'active';
  }

  const previousLevel = levels[levelIndex - 1];
  return completedLevelIds.includes(previousLevel.id) ? 'active' : 'locked';
}

export function isLevelAccessible(
  levels: Level[],
  completedLevelIds: string[],
  levelId: string
): boolean {
  return getLevelAccessState(levels, completedLevelIds, levelId) !== 'locked';
}
