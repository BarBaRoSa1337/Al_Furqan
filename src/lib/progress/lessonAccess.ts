import { Lesson, Level } from '../../types/content';

export type LessonAccessState = 'completed' | 'active' | 'locked';
export type LevelAccessState = LessonAccessState;

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

export function getLessonAccessState(
  lessons: Lesson[],
  completedLessonIds: string[],
  lessonId: string
): LessonAccessState {
  const lessonIndex = lessons.findIndex((lesson) => lesson.id === lessonId);

  if (lessonIndex === -1) {
    return 'locked';
  }

  if (completedLessonIds.includes(lessonId)) {
    return 'completed';
  }

  if (lessonIndex === 0) {
    return 'active';
  }

  const previousLesson = lessons[lessonIndex - 1];
  return completedLessonIds.includes(previousLesson.id) ? 'active' : 'locked';
}

export function isLessonAccessible(
  lessons: Lesson[],
  completedLessonIds: string[],
  lessonId: string
): boolean {
  return getLessonAccessState(lessons, completedLessonIds, lessonId) !== 'locked';
}
