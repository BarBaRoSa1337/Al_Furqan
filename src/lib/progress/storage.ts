import AsyncStorage from '@react-native-async-storage/async-storage';
import { LearningPath, Level } from '../../types/content';
import type { ActivityReviewSchedule, RecallRating, ReviewOutcome } from '../../types/activities';
import { getLevelStepKind } from '../content/stepKind';
import { isReviewDue, reviewStateKey, scheduleActivityReview } from './reviewScheduler';
import {
  AppProgress,
  CompletionReceipt,
  createDefaultProgress,
  LearningPathProgress,
  LevelProgress,
  ProgressRecoveryWarning,
  ProgressSnapshotV2,
  ProgressSnapshotV3,
  QuestionAttempt,
  ActivityAttempt,
  ActivityReviewState,
  XP_REWARDS,
  XPRecord,
} from '../../types/progress';

const KEYS = {
  SNAPSHOT: 'qlp_progress_v3',
  SNAPSHOT_V2: 'qlp_progress_v2',
  APP_PROGRESS: 'qlp_app_progress',
  LEVEL_PREFIX: 'qlp_level_',
  PATH_PREFIX: 'qlp_path_',
  LEGACY_LESSON_PREFIX: 'qlp_lesson_',
  LEGACY_PACKAGE_PREFIX: 'qlp_package_',
  CORRUPT_PREFIX: 'qlp_progress_corrupt_',
} as const;

const LEGACY_PATH_IDS: Record<string, string> = {
  'surah-al-fil-v1': 'surah-al-fil-path-v1',
};

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
}

export interface RecordQuestionAttemptInput {
  levelId: string;
  pathId: string;
  questionId: string;
  selectedAnswer: string | number;
  correct: boolean;
}
export interface RecordActivityAttemptInput { levelId: string; pathId: string; activityId: string; answer: unknown; correct: boolean; evaluationVersion: string; }
export interface RecordReviewAttemptInput extends RecordActivityAttemptInput {
  packageRevisionId: string;
  reviewSchedule: ActivityReviewSchedule;
  outcome: ReviewOutcome;
  now?: Date;
}

export interface CompleteLevelOptions {
  packageRevisionId?: string;
  now?: Date;
}
export interface ReviewCatalogEntry { level: Level; packageRevisionId: string; }

export class ProgressStorageError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'ProgressStorageError';
  }
}

let mutationQueue: Promise<void> = Promise.resolve();
let recoveryWarning: ProgressRecoveryWarning | null = null;

export async function getAppProgress(): Promise<AppProgress> {
  const snapshot = await readAfterMutations();
  return snapshot.app;
}

export async function getLevelProgress(levelId: string): Promise<LevelProgress | null> {
  const snapshot = await readAfterMutations();
  return snapshot.levels[levelId] ?? null;
}

export async function getReviewStates(): Promise<ActivityReviewState[]> {
  return Object.values((await readAfterMutations()).reviews);
}

export async function getDueReviewStates(now: Date = new Date()): Promise<ActivityReviewState[]> {
  return (await getReviewStates())
    .filter(state => isReviewDue(state, now))
    .sort((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? ''));
}

export async function syncCompletedLevelReviews(entries: ReviewCatalogEntry[], now: Date = new Date()): Promise<void> {
  await mutateSnapshot(snapshot => {
    entries.forEach(({ level, packageRevisionId }) => {
      const progress = snapshot.levels[level.id];
      if (progress?.completed) registerLevelReviews(snapshot, level, packageRevisionId, validDate(progress.completedAt) ?? now);
    });
  });
}

export async function getLastCompletionReceipt(levelId?: string): Promise<CompletionReceipt | null> {
  const snapshot = await readAfterMutations();
  const receipt = snapshot.lastCompletionReceipt;
  return receipt && (!levelId || receipt.levelId === levelId) ? receipt : null;
}

export function getProgressRecoveryWarning(): ProgressRecoveryWarning | null {
  return recoveryWarning;
}

export async function startLevel(levelId: string, pathId: string, initialStepId: string): Promise<LevelProgress> {
  return mutateSnapshot(snapshot => {
    const now = new Date().toISOString();
    const existing = snapshot.levels[levelId];
    const progress = existing ?? {
      levelId,
      pathId,
      completed: false,
      startedAt: now,
      currentStepId: initialStepId,
      completedStepIds: [],
      questionAttempts: [],
      activityAttempts: [],
    };
    snapshot.levels[levelId] = progress;
    snapshot.app.currentLevelId = levelId;
    snapshot.app.lastActiveAt = now;
    return progress;
  });
}

export async function completeLevelStep(
  levelId: string,
  pathId: string,
  stepId: string,
  nextStepId?: string
): Promise<LevelProgress> {
  return mutateSnapshot(snapshot => {
    const now = new Date().toISOString();
    const existing = snapshot.levels[levelId];
    const progress: LevelProgress = {
      levelId,
      pathId,
      completed: existing?.completed ?? false,
      startedAt: existing?.startedAt ?? now,
      completedAt: existing?.completedAt,
      currentStepId: nextStepId,
      completedStepIds: existing?.completedStepIds.includes(stepId)
        ? existing.completedStepIds
        : [...(existing?.completedStepIds ?? []), stepId],
      questionAttempts: existing?.questionAttempts ?? [],
      activityAttempts: existing?.activityAttempts ?? [],
    };
    snapshot.levels[levelId] = progress;
    return progress;
  });
}

export async function recordQuestionAttempt(input: RecordQuestionAttemptInput): Promise<QuestionAttempt> {
  return mutateSnapshot(snapshot => {
    const now = new Date().toISOString();
    const existing = snapshot.levels[input.levelId];
    const attempt: QuestionAttempt = {
      questionId: input.questionId,
      levelId: input.levelId,
      selectedAnswer: input.selectedAnswer,
      correct: input.correct,
      attemptedAt: now,
    };
    snapshot.levels[input.levelId] = {
      levelId: input.levelId,
      pathId: input.pathId,
      completed: existing?.completed ?? false,
      startedAt: existing?.startedAt ?? now,
      completedAt: existing?.completedAt,
      currentStepId: existing?.currentStepId,
      completedStepIds: existing?.completedStepIds ?? [],
      questionAttempts: [...(existing?.questionAttempts ?? []), attempt],
      activityAttempts: existing?.activityAttempts ?? [],
    };
    return attempt;
  });
}

export async function recordActivityAttempt(input: RecordActivityAttemptInput): Promise<ActivityAttempt> {
  return mutateSnapshot(snapshot => {
    const now = new Date().toISOString(); const existing = snapshot.levels[input.levelId];
    const attempt: ActivityAttempt = { activityId: input.activityId, levelId: input.levelId, answer: input.answer, correct: input.correct, attemptedAt: now, evaluationVersion: input.evaluationVersion };
    snapshot.levels[input.levelId] = { levelId: input.levelId, pathId: input.pathId, completed: existing?.completed ?? false, startedAt: existing?.startedAt ?? now, completedAt: existing?.completedAt, currentStepId: existing?.currentStepId, completedStepIds: existing?.completedStepIds ?? [], questionAttempts: existing?.questionAttempts ?? [], activityAttempts: [...(existing?.activityAttempts ?? []), attempt] };
    return attempt;
  });
}

export async function recordReviewAttempt(input: RecordReviewAttemptInput): Promise<ActivityAttempt> {
  return mutateSnapshot(snapshot => {
    const now = input.now ?? new Date();
    const attemptedAt = now.toISOString();
    const existing = snapshot.levels[input.levelId];
    const attempt: ActivityAttempt = {
      activityId: input.activityId,
      levelId: input.levelId,
      answer: input.answer,
      correct: input.correct,
      attemptedAt,
      evaluationVersion: input.evaluationVersion,
    };
    snapshot.levels[input.levelId] = {
      levelId: input.levelId,
      pathId: input.pathId,
      completed: existing?.completed ?? false,
      startedAt: existing?.startedAt ?? attemptedAt,
      completedAt: existing?.completedAt,
      currentStepId: existing?.currentStepId,
      completedStepIds: existing?.completedStepIds ?? [],
      questionAttempts: existing?.questionAttempts ?? [],
      activityAttempts: [...(existing?.activityAttempts ?? []), attempt],
    };
    const key = reviewStateKey(input.levelId, input.activityId, input.packageRevisionId);
    snapshot.reviews[key] = scheduleActivityReview(snapshot.reviews[key], {
      activityId: input.activityId,
      levelId: input.levelId,
      packageRevisionId: input.packageRevisionId,
      outcome: input.outcome,
      schedule: input.reviewSchedule,
    }, now);
    snapshot.app.lastActiveAt = attemptedAt;
    return attempt;
  });
}

export async function completeLevel(level: Level, path: LearningPath, options: CompleteLevelOptions = {}): Promise<CompletionReceipt> {
  if (level.pathId !== path.id || !path.levelIds.includes(level.id)) {
    throw new ProgressStorageError(`Level "${level.id}" does not belong to path "${path.id}"`);
  }

  return mutateSnapshot(snapshot => {
    const nowDate = options.now ?? new Date();
    const now = nowDate.toISOString();
    const existing = snapshot.levels[level.id] ?? null;
    if (!isLevelReadyForCompletion(level, existing)) {
      throw new ProgressStorageError(`Level "${level.id}" is not ready for completion`);
    }

    const alreadyCompleted = existing?.completed === true;
    snapshot.levels[level.id] = {
      ...existing!,
      completed: true,
      completedAt: existing?.completedAt ?? now,
    };

    if (!snapshot.app.completedLevelIds.includes(level.id)) {
      snapshot.app.completedLevelIds.push(level.id);
    }

    const learningPathAlreadyCompleted = snapshot.app.completedLearningPathIds.includes(path.id);
    const learningPathComplete = path.levelIds.every(levelId => snapshot.levels[levelId]?.completed === true);
    const learningPathJustCompleted = learningPathComplete && !learningPathAlreadyCompleted;
    if (learningPathJustCompleted) snapshot.app.completedLearningPathIds.push(path.id);

    const awardedLevelXp = alreadyCompleted ? 0 : XP_REWARDS.LEVEL_COMPLETE;
    const awardedLearningPathXp = learningPathJustCompleted ? XP_REWARDS.LEARNING_PATH_COMPLETE : 0;
    if (awardedLevelXp > 0) addXpToSnapshot(snapshot, awardedLevelXp, `Completed level: ${level.id}`, now);
    if (awardedLearningPathXp > 0) addXpToSnapshot(snapshot, awardedLearningPathXp, `Completed learning path: ${path.id}`, now);
    if (!alreadyCompleted) updateStreakInSnapshot(snapshot, nowDate);
    if (options.packageRevisionId) registerLevelReviews(snapshot, level, options.packageRevisionId, nowDate);

    const currentIndex = path.levelIds.indexOf(level.id);
    snapshot.app.currentLevelId = path.levelIds[currentIndex + 1] ?? level.id;
    snapshot.app.lastActiveAt = now;

    const receipt: CompletionReceipt = {
      id: `${level.id}:${now}`,
      levelId: level.id,
      learningPathId: path.id,
      alreadyCompleted,
      learningPathJustCompleted,
      awardedLevelXp,
      awardedLearningPathXp,
      completedAt: now,
    };
    snapshot.lastCompletionReceipt = receipt;
    return receipt;
  });
}

export async function addXP(amount: number, reason: string): Promise<AppProgress> {
  return mutateSnapshot(snapshot => {
    addXpToSnapshot(snapshot, amount, reason, new Date().toISOString());
    return snapshot.app;
  });
}

export async function updateStreak(): Promise<AppProgress> {
  return mutateSnapshot(snapshot => {
    updateStreakInSnapshot(snapshot, new Date());
    return snapshot.app;
  });
}

export function isLevelReadyForCompletion(level: Level, progress: LevelProgress | null): boolean {
  if (!progress) return false;
  if (progress.completed) return true;
  const allStepsCompleted = level.steps
    .filter(step => step.required !== false)
    .every(step => progress.completedStepIds.includes(step.id));
  const requiredQuestionIds = level.steps.filter(step => step.required !== false).flatMap(step =>
    step.blocks.filter(block => block.type === 'question').map(block => block.id)
  );
  const requiredActivityIds = level.steps.filter(step => step.required !== false).flatMap(step => step.blocks
    .filter((block): block is Extract<typeof block, { type: 'activity' }> => block.type === 'activity' && block.activity.required)
    .map(block => block.activity.id));
  const memoryActivityIds = level.steps
    .filter(step => getLevelStepKind(step) === 'memorize' || getLevelStepKind(step) === 'memory_practice')
    .flatMap(step => step.blocks.filter(block => block.type === 'activity').map(block => block.activity.id));
  const understandingBlocks = level.steps
    .filter(step => getLevelStepKind(step) === 'understanding_practice')
    .flatMap(step => step.blocks);
  const hasMemoryCompletion = !level.completionRules?.requireMemoryActivity || memoryActivityIds.some(activityId =>
    progress.activityAttempts.some(attempt => attempt.activityId === activityId && attempt.correct)
  );
  const hasUnderstandingCompletion = !level.completionRules?.requireUnderstandingActivity || understandingBlocks.some(block =>
    block.type === 'activity'
      ? progress.activityAttempts.some(attempt => attempt.activityId === block.activity.id && attempt.correct)
      : block.type === 'question' && progress.questionAttempts.some(attempt => attempt.questionId === block.id && attempt.correct)
  );
  return allStepsCompleted && hasMemoryCompletion && hasUnderstandingCompletion && requiredQuestionIds.every(questionId =>
    progress.questionAttempts.some(attempt => attempt.questionId === questionId && attempt.correct)
  ) && requiredActivityIds.every(activityId => progress.activityAttempts.some(attempt => attempt.activityId === activityId && attempt.correct));
}

export async function isLevelCompleted(levelId: string): Promise<boolean> {
  return (await getLevelProgress(levelId))?.completed === true;
}

export async function getCompletedLevelIds(): Promise<string[]> {
  return (await getAppProgress()).completedLevelIds;
}

export async function getLearningPathProgress(path: LearningPath): Promise<LearningPathProgress> {
  const snapshot = await readAfterMutations();
  const levels = path.levelIds.flatMap(levelId => snapshot.levels[levelId] ? [snapshot.levels[levelId]] : []);
  const completedLevels = levels.filter(level => level.completed).length;
  const timestamps = levels.map(level => level.startedAt).sort();
  return {
    learningPathId: path.id,
    totalLevels: path.levelIds.length,
    completedLevels,
    overallProgress: path.levelIds.length > 0 ? Math.round((completedLevels / path.levelIds.length) * 100) : 0,
    levels,
    startedAt: timestamps[0] ?? new Date().toISOString(),
    completedAt: completedLevels === path.levelIds.length
      ? levels.map(level => level.completedAt).filter((value): value is string => Boolean(value)).sort().at(-1)
      : undefined,
  };
}

export async function resetProgress(): Promise<void> {
  await enqueueMutation(async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const keysToRemove = keys.filter(isProgressKey);
      if (keysToRemove.length > 0) await AsyncStorage.multiRemove(keysToRemove);
      recoveryWarning = null;
    } catch (error) {
      throw new ProgressStorageError('Could not reset progress', error);
    }
  });
}

function addXpToSnapshot(snapshot: ProgressSnapshotV3, amount: number, reason: string, earnedAt: string): void {
  const record: XPRecord = { amount, reason, earnedAt };
  snapshot.app.xp += amount;
  snapshot.app.xpHistory.push(record);
}

function updateStreakInSnapshot(snapshot: ProgressSnapshotV3, date: Date): void {
  const today = localDateKey(date);
  if (snapshot.app.streak.lastActiveDate === today) return;
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  const currentStreak = snapshot.app.streak.lastActiveDate === localDateKey(yesterday)
    ? snapshot.app.streak.currentStreak + 1
    : 1;
  snapshot.app.streak = {
    currentStreak,
    longestStreak: Math.max(currentStreak, snapshot.app.streak.longestStreak),
    lastActiveDate: today,
  };
}

async function readAfterMutations(): Promise<ProgressSnapshotV3> {
  return enqueueMutation(loadSnapshot);
}

function mutateSnapshot<T>(mutation: (snapshot: ProgressSnapshotV3) => T): Promise<T> {
  return enqueueMutation(async () => {
    const snapshot = await loadSnapshot();
    const result = mutation(snapshot);
    await writeSnapshot(snapshot);
    return result;
  });
}

function enqueueMutation<T>(operation: () => Promise<T>): Promise<T> {
  const result = mutationQueue.then(operation, operation);
  mutationQueue = result.then(() => undefined, () => undefined);
  return result;
}

async function loadSnapshot(): Promise<ProgressSnapshotV3> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SNAPSHOT);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (isProgressSnapshotV3(parsed)) return parsed;
      } catch {
        // Quarantined below.
      }
      const quarantineKey = `${KEYS.CORRUPT_PREFIX}${Date.now()}`;
      await AsyncStorage.setItem(quarantineKey, raw);
      await AsyncStorage.removeItem(KEYS.SNAPSHOT);
      recoveryWarning = { code: 'corrupt_v3', message: 'Saved progress was corrupt and was reset. A recovery copy was kept.' };
      return createEmptySnapshot();
    }
    const migratedV2 = await migrateV2Snapshot();
    if (migratedV2) return migratedV2;
    return migrateLegacyProgress();
  } catch (error) {
    if (error instanceof ProgressStorageError) throw error;
    throw new ProgressStorageError('Could not load progress', error);
  }
}

async function migrateV2Snapshot(): Promise<ProgressSnapshotV3 | null> {
  const raw = await AsyncStorage.getItem(KEYS.SNAPSHOT_V2);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isProgressSnapshotV2(parsed)) throw new Error('Invalid V2 snapshot');
    const snapshot: ProgressSnapshotV3 = {
      schemaVersion: 3,
      app: parsed.app,
      levels: parsed.levels,
      reviews: {},
      lastCompletionReceipt: parsed.lastCompletionReceipt,
    };
    await writeSnapshot(snapshot);
    await AsyncStorage.removeItem(KEYS.SNAPSHOT_V2);
    return snapshot;
  } catch {
    const quarantineKey = `${KEYS.CORRUPT_PREFIX}${Date.now()}`;
    await AsyncStorage.setItem(quarantineKey, raw);
    await AsyncStorage.removeItem(KEYS.SNAPSHOT_V2);
    recoveryWarning = { code: 'corrupt_v2', message: 'Saved V2 progress was corrupt and was reset. A recovery copy was kept.' };
    return createEmptySnapshot();
  }
}

async function migrateLegacyProgress(): Promise<ProgressSnapshotV3> {
  const keys = await AsyncStorage.getAllKeys();
  const oldKeys = keys.filter(key => key === KEYS.APP_PROGRESS || key.startsWith(KEYS.LEVEL_PREFIX) || key.startsWith(KEYS.PATH_PREFIX) || key.startsWith(KEYS.LEGACY_LESSON_PREFIX) || key.startsWith(KEYS.LEGACY_PACKAGE_PREFIX));
  if (oldKeys.length === 0) return createEmptySnapshot();

  const snapshot = createEmptySnapshot();
  let skippedRecords = 0;
  const entries = await AsyncStorage.multiGet(oldKeys);
  entries.forEach(([key, raw]) => {
    if (!raw) return;
    try {
      if (key === KEYS.APP_PROGRESS) {
        snapshot.app = normalizeLegacyAppProgress(JSON.parse(raw) as LegacyAppProgress);
        return;
      }
      if (key.startsWith(KEYS.LEVEL_PREFIX)) {
        const level = normalizeLevelProgress(JSON.parse(raw) as LevelProgress);
        snapshot.levels[level.levelId] = level;
        return;
      }
      if (key.startsWith(KEYS.LEGACY_LESSON_PREFIX)) {
        const legacy = JSON.parse(raw) as LegacyStoredProgress;
        if (!legacy.completed) return;
        const levelId = legacy.lessonId ?? key.slice(KEYS.LEGACY_LESSON_PREFIX.length);
        if (!snapshot.levels[levelId]) {
          snapshot.levels[levelId] = {
            levelId,
            pathId: mapLegacyPathId(legacy.packageId ?? ''),
            completed: true,
            startedAt: toIsoString(legacy.startedAt),
            completedAt: toIsoString(legacy.completedAt),
            completedStepIds: [],
            questionAttempts: [],
            activityAttempts: [],
          };
        }
      }
    } catch {
      skippedRecords += 1;
    }
  });

  Object.values(snapshot.levels).forEach(level => {
    if (level.completed && !snapshot.app.completedLevelIds.includes(level.levelId)) snapshot.app.completedLevelIds.push(level.levelId);
  });
  snapshot.app.completedLearningPathIds = snapshot.app.completedLearningPathIds.map(mapLegacyPathId);
  await writeSnapshot(snapshot);
  await AsyncStorage.multiRemove(oldKeys);
  if (skippedRecords > 0) recoveryWarning = { code: 'partial_legacy_migration', message: `${skippedRecords} invalid legacy progress record(s) were skipped.` };
  return snapshot;
}

function normalizeLegacyAppProgress(progress: LegacyAppProgress): AppProgress {
  const defaults = createDefaultProgress();
  return {
    ...defaults,
    ...progress,
    streak: { ...defaults.streak, ...progress.streak },
    xpHistory: progress.xpHistory ?? [],
    completedLevelIds: progress.completedLevelIds ?? progress.completedLessonIds ?? [],
    completedLearningPathIds: (progress.completedLearningPathIds ?? progress.completedPackageIds ?? []).map(mapLegacyPathId),
    currentLevelId: progress.currentLevelId ?? progress.currentLessonId,
  };
}

function normalizeLevelProgress(progress: LevelProgress): LevelProgress {
  return {
    ...progress,
    pathId: mapLegacyPathId(progress.pathId),
    completedStepIds: progress.completedStepIds ?? [],
    questionAttempts: progress.questionAttempts ?? [],
    activityAttempts: progress.activityAttempts ?? [],
  };
}

async function writeSnapshot(snapshot: ProgressSnapshotV3): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.SNAPSHOT, JSON.stringify(snapshot));
  } catch (error) {
    throw new ProgressStorageError('Could not save progress', error);
  }
}

function createEmptySnapshot(): ProgressSnapshotV3 {
  return { schemaVersion: 3, app: createDefaultProgress(), levels: {}, reviews: {} };
}

function isProgressSnapshotV3(value: unknown): value is ProgressSnapshotV3 {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ProgressSnapshotV3>;
  if (candidate.schemaVersion !== 3 || !candidate.app || !candidate.levels || typeof candidate.levels !== 'object' || !candidate.reviews || typeof candidate.reviews !== 'object') return false;
  const app = candidate.app;
  if (typeof app.xp !== 'number' || !Array.isArray(app.xpHistory) || !Array.isArray(app.completedLevelIds) || !Array.isArray(app.completedLearningPathIds)) return false;
  if (!app.streak || typeof app.streak.currentStreak !== 'number' || typeof app.streak.longestStreak !== 'number' || typeof app.streak.lastActiveDate !== 'string') return false;
  const levelsValid = Object.values(candidate.levels).every(level =>
    Boolean(level) &&
    typeof level.levelId === 'string' &&
    typeof level.pathId === 'string' &&
    typeof level.completed === 'boolean' &&
    Array.isArray(level.completedStepIds) &&
    Array.isArray(level.questionAttempts) && Array.isArray(level.activityAttempts)
  );
  const outcomes = ['again', 'hard', 'remembered', 'correct', 'incorrect'];
  const reviewsValid = Object.values(candidate.reviews).every(review =>
    Boolean(review) &&
    typeof review.activityId === 'string' &&
    typeof review.levelId === 'string' &&
    typeof review.packageRevisionId === 'string' &&
    Number.isInteger(review.stage) && review.stage >= 0 &&
    (review.dueAt === undefined || typeof review.dueAt === 'string') &&
    typeof review.lastReviewedAt === 'string' &&
    typeof review.mastered === 'boolean' &&
    outcomes.includes(review.lastOutcome)
  );
  return levelsValid && reviewsValid;
}

function isProgressSnapshotV2(value: unknown): value is ProgressSnapshotV2 {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ProgressSnapshotV2>;
  return candidate.schemaVersion === 2 && Boolean(candidate.app) && Boolean(candidate.levels) && typeof candidate.levels === 'object';
}

function isProgressKey(key: string): boolean {
  return key === KEYS.SNAPSHOT || key === KEYS.SNAPSHOT_V2 || key === KEYS.APP_PROGRESS || key.startsWith(KEYS.LEVEL_PREFIX) || key.startsWith(KEYS.PATH_PREFIX) || key.startsWith(KEYS.LEGACY_LESSON_PREFIX) || key.startsWith(KEYS.LEGACY_PACKAGE_PREFIX) || key.startsWith(KEYS.CORRUPT_PREFIX);
}

function registerLevelReviews(snapshot: ProgressSnapshotV3, level: Level, packageRevisionId: string, now: Date): void {
  const activities = level.steps.flatMap(step => step.blocks)
    .filter((block): block is Extract<Level['steps'][number]['blocks'][number], { type: 'activity' }> => block.type === 'activity')
    .map(block => block.activity)
    .filter(activity => activity.reviewSchedule);
  activities.forEach(activity => {
    const key = reviewStateKey(level.id, activity.id, packageRevisionId);
    if (snapshot.reviews[key]) return;
    const attempt = [...(snapshot.levels[level.id]?.activityAttempts ?? [])].reverse()
      .find(candidate => candidate.activityId === activity.id && candidate.correct);
    if (!attempt || !activity.reviewSchedule) return;
    snapshot.reviews[key] = scheduleActivityReview(undefined, {
      activityId: activity.id,
      levelId: level.id,
      packageRevisionId,
      outcome: toReviewOutcome(attempt.answer, attempt.correct),
      schedule: activity.reviewSchedule,
    }, now);
  });
}

function toReviewOutcome(answer: unknown, correct: boolean): ReviewOutcome {
  return answer === 'again' || answer === 'hard' || answer === 'remembered'
    ? answer as RecallRating
    : correct ? 'correct' : 'incorrect';
}

function mapLegacyPathId(id: string): string {
  return LEGACY_PATH_IDS[id] ?? id;
}

function toIsoString(value: string | Date | undefined): string {
  if (!value) return new Date().toISOString();
  return typeof value === 'string' ? value : value.toISOString();
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function validDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
