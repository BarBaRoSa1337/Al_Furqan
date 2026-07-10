// Local progress storage — AsyncStorage backed level progress with XP and streaks.

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppProgress,
  DEFAULT_PROGRESS,
  LearningPathProgress,
  LevelProgress,
  XP_REWARDS,
  XPRecord,
} from '../../types/progress';

const KEYS = {
  LEVEL_PREFIX: 'qlp_level_',
  PATH_PREFIX: 'qlp_path_',
  APP_PROGRESS: 'qlp_app_progress',
  LEGACY_LESSON_PREFIX: 'qlp_lesson_',
  LEGACY_PACKAGE_PREFIX: 'qlp_package_',
} as const;

interface LegacyAppProgress extends Partial<AppProgress> {
  completedLessonIds?: string[];
  completedPackageIds?: string[];
  currentLessonId?: string;
}

interface LegacyStoredProgress {
  lessonId?: string;
  packageId?: string;
  completed?: boolean;
  startedAt?: string | Date;
  completedAt?: string | Date;
  currentBlockIndex?: number;
  blockProgress?: Record<string, unknown>;
}

export interface LevelCompletionResult {
  progress: AppProgress;
  alreadyCompleted: boolean;
  learningPathJustCompleted: boolean;
  awardedLevelXp: number;
  awardedLearningPathXp: number;
}

export type LessonCompletionResult = LevelCompletionResult & {
  packageJustCompleted: boolean;
  awardedLessonXp: number;
  awardedPackageXp: number;
};

export async function getAppProgress(): Promise<AppProgress> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.APP_PROGRESS);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const normalized = normalizeProgress(JSON.parse(raw) as LegacyAppProgress);

    if (raw.includes('completedLessonIds') || raw.includes('completedPackageIds') || raw.includes('currentLessonId')) {
      await saveAppProgress(normalized);
    }

    return normalized;
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

function normalizeProgress(progress: LegacyAppProgress): AppProgress {
  return {
    ...DEFAULT_PROGRESS,
    ...progress,
    streak: {
      ...DEFAULT_PROGRESS.streak,
      ...progress.streak,
    },
    xpHistory: progress.xpHistory ?? [],
    completedLevelIds: progress.completedLevelIds ?? progress.completedLessonIds ?? [],
    completedLearningPathIds: progress.completedLearningPathIds ?? progress.completedPackageIds ?? [],
    currentLevelId: progress.currentLevelId ?? progress.currentLessonId,
  };
}

async function saveAppProgress(progress: AppProgress): Promise<void> {
  await AsyncStorage.setItem(KEYS.APP_PROGRESS, JSON.stringify(progress));
}

export async function addXP(amount: number, reason: string): Promise<AppProgress> {
  const progress = await getAppProgress();
  const record: XPRecord = { amount, reason, earnedAt: new Date().toISOString() };
  const updated: AppProgress = {
    ...progress,
    xp: progress.xp + amount,
    xpHistory: [...progress.xpHistory, record],
  };
  await saveAppProgress(updated);
  return updated;
}

export async function updateStreak(): Promise<AppProgress> {
  const progress = await getAppProgress();
  const today = new Date().toISOString().split('T')[0];
  const last = progress.streak.lastActiveDate;

  if (last === today) return progress;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const newStreak = last === yesterdayStr ? progress.streak.currentStreak + 1 : 1;

  const updated: AppProgress = {
    ...progress,
    streak: {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, progress.streak.longestStreak),
      lastActiveDate: today,
    },
  };
  await saveAppProgress(updated);
  return updated;
}

export async function markLevelCompleted(
  levelId: string,
  learningPathId: string,
  totalPathLevels: number
): Promise<LevelCompletionResult> {
  const existingLevel = await getStoredLevelProgress(levelId);
  const alreadyCompleted = existingLevel?.completed === true;
  const now = new Date().toISOString();

  const levelProgress: LevelProgress = {
    levelId,
    pathId: learningPathId,
    completed: true,
    startedAt: existingLevel?.startedAt ?? now,
    completedAt: now,
    currentStepId: existingLevel?.currentStepId,
    completedStepIds: existingLevel?.completedStepIds ?? [],
    questionAttempts: existingLevel?.questionAttempts ?? [],
  };
  await AsyncStorage.setItem(KEYS.LEVEL_PREFIX + levelId, JSON.stringify(levelProgress));

  let appProgress = await getAppProgress();
  const learningPathAlreadyCompleted = appProgress.completedLearningPathIds.includes(learningPathId);

  if (!appProgress.completedLevelIds.includes(levelId)) {
    appProgress = {
      ...appProgress,
      completedLevelIds: [...appProgress.completedLevelIds, levelId],
      currentLevelId: levelId,
      lastActiveAt: now,
    };
  }

  const completedInPath = await getCompletedLevelIdsForPath(learningPathId);
  const learningPathJustCompleted =
    completedInPath.length >= totalPathLevels && !learningPathAlreadyCompleted;

  if (learningPathJustCompleted) {
    appProgress = {
      ...appProgress,
      completedLearningPathIds: [...appProgress.completedLearningPathIds, learningPathId],
    };
  }

  await saveAppProgress(appProgress);
  await updateLearningPathProgress(learningPathId, completedInPath.length, totalPathLevels);

  let awardedLevelXp = 0;
  let awardedLearningPathXp = 0;

  if (!alreadyCompleted) {
    await addXP(XP_REWARDS.LEVEL_COMPLETE, `Completed level: ${levelId}`);
    awardedLevelXp = XP_REWARDS.LEVEL_COMPLETE;
    await updateStreak();
  }

  if (learningPathJustCompleted) {
    await addXP(XP_REWARDS.LEARNING_PATH_COMPLETE, `Completed learning path: ${learningPathId}`);
    awardedLearningPathXp = XP_REWARDS.LEARNING_PATH_COMPLETE;
  }

  return {
    progress: await getAppProgress(),
    alreadyCompleted,
    learningPathJustCompleted,
    awardedLevelXp,
    awardedLearningPathXp,
  };
}

async function getStoredLevelProgress(levelId: string): Promise<LevelProgress | null> {
  const raw = await AsyncStorage.getItem(KEYS.LEVEL_PREFIX + levelId);
  if (raw) return JSON.parse(raw) as LevelProgress;

  const legacyRaw = await AsyncStorage.getItem(KEYS.LEGACY_LESSON_PREFIX + levelId);
  if (!legacyRaw) return null;

  const legacy = JSON.parse(legacyRaw) as LegacyStoredProgress;
  if (!legacy.completed) return null;

  return {
    levelId,
    pathId: legacy.packageId ?? '',
    completed: true,
    startedAt: toIsoString(legacy.startedAt),
    completedAt: toIsoString(legacy.completedAt),
    completedStepIds: [],
    questionAttempts: [],
  };
}

async function getCompletedLevelIdsForPath(learningPathId: string): Promise<string[]> {
  const keys = await AsyncStorage.getAllKeys();
  const levelKeys = keys.filter(key => key.startsWith(KEYS.LEVEL_PREFIX));
  const completed: string[] = [];

  for (const key of levelKeys) {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) continue;
    const progress = JSON.parse(raw) as LevelProgress;
    if (progress.pathId === learningPathId && progress.completed) {
      completed.push(progress.levelId);
    }
  }

  const legacyKeys = keys.filter(key => key.startsWith(KEYS.LEGACY_LESSON_PREFIX));
  for (const key of legacyKeys) {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) continue;
    const legacy = JSON.parse(raw) as LegacyStoredProgress;
    const legacyLevelId = legacy.lessonId ?? key.replace(KEYS.LEGACY_LESSON_PREFIX, '');
    if (legacy.packageId === learningPathId && legacy.completed && !completed.includes(legacyLevelId)) {
      completed.push(legacyLevelId);
    }
  }

  return completed;
}

async function updateLearningPathProgress(
  learningPathId: string,
  completedCount: number,
  totalCount: number
): Promise<void> {
  const key = KEYS.PATH_PREFIX + learningPathId;
  const raw = await AsyncStorage.getItem(key);
  const existing = raw ? (JSON.parse(raw) as LearningPathProgress) : null;
  const now = new Date().toISOString();

  const progress: LearningPathProgress = {
    learningPathId,
    totalLevels: totalCount,
    completedLevels: completedCount,
    overallProgress: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    levels: existing?.levels ?? [],
    startedAt: existing?.startedAt ?? now,
    completedAt: completedCount >= totalCount ? now : existing?.completedAt,
  };

  await AsyncStorage.setItem(key, JSON.stringify(progress));
}

export async function isLevelCompleted(levelId: string): Promise<boolean> {
  const progress = await getStoredLevelProgress(levelId);
  return progress?.completed === true;
}

export async function getLearningPathProgress(learningPathId: string): Promise<LearningPathProgress | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PATH_PREFIX + learningPathId);
    return raw ? JSON.parse(raw) as LearningPathProgress : null;
  } catch {
    return null;
  }
}

export async function getCompletedLevelIds(): Promise<string[]> {
  const progress = await getAppProgress();
  return progress.completedLevelIds;
}

export async function resetProgress(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const toRemove = keys.filter(key =>
    key.startsWith(KEYS.LEVEL_PREFIX) ||
    key.startsWith(KEYS.PATH_PREFIX) ||
    key.startsWith(KEYS.LEGACY_LESSON_PREFIX) ||
    key.startsWith(KEYS.LEGACY_PACKAGE_PREFIX) ||
    key === KEYS.APP_PROGRESS
  );
  if (toRemove.length > 0) await AsyncStorage.multiRemove(toRemove);
}

function toIsoString(value: string | Date | undefined): string {
  if (!value) return new Date().toISOString();
  return typeof value === 'string' ? value : value.toISOString();
}

export async function markLessonCompleted(
  lessonId: string,
  packageId: string,
  totalPackageLessons: number
): Promise<LessonCompletionResult> {
  const result = await markLevelCompleted(lessonId, packageId, totalPackageLessons);
  return {
    ...result,
    packageJustCompleted: result.learningPathJustCompleted,
    awardedLessonXp: result.awardedLevelXp,
    awardedPackageXp: result.awardedLearningPathXp,
  };
}

export async function isLessonCompleted(lessonId: string): Promise<boolean> {
  return isLevelCompleted(lessonId);
}

export async function getCompletedLessonIds(): Promise<string[]> {
  return getCompletedLevelIds();
}

export async function getPackageProgress(packageId: string): Promise<LearningPathProgress | null> {
  return getLearningPathProgress(packageId);
}

export class LocalProgressStorage {
  async markLevelCompleted(levelId: string, learningPathId: string): Promise<void> {
    await markLevelCompleted(levelId, learningPathId, 7);
  }
  async markLessonCompleted(lessonId: string, packageId: string): Promise<void> {
    await markLessonCompleted(lessonId, packageId, 7);
  }
  async isLevelCompleted(levelId: string): Promise<boolean> {
    return isLevelCompleted(levelId);
  }
  async isLessonCompleted(lessonId: string): Promise<boolean> {
    return isLessonCompleted(lessonId);
  }
  async clearProgress(): Promise<void> {
    return resetProgress();
  }
  async getPackageProgress(packageId: string): Promise<LearningPathProgress | null> {
    return getPackageProgress(packageId);
  }
}

export function getProgressStorage(): LocalProgressStorage {
  return new LocalProgressStorage();
}

export default LocalProgressStorage;
