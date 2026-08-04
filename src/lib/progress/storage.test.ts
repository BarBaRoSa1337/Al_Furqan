import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  surahAlFilLearningPath,
  surahAlFilLevels,
} from '../../content/packages/surah-al-fil/v1';
import { Level } from '../../types/content';
import { createDefaultProgress, LevelProgress, ProgressSnapshotV2, ProgressSnapshotV4 } from '../../types/progress';
import {
  completeLevel,
  getAppProgress,
  getLevelProgress,
  getLastCompletionReceipt,
  getProgressRecoveryWarning,
  getReviewStates,
  getDueReviewStates,
  recordQuestionAttempt,
  recordActivityAttempt,
  recordReviewAttempt,
  isLevelReadyForCompletion,
  resetProgress,
  restartLevel,
  startLevel,
  syncCompletedLevelReviews,
  abandonLevel,
  reconcileCurriculumProgress,
} from './storage';

const ayah1Level = surahAlFilLevels.find(level => level.id === 'al-fil-level-1-context-ayah-1')!;
const finalReviewLevel = surahAlFilLevels.find(level => level.id === 'al-fil-level-final-review')!;

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

beforeEach(async () => {
  await resetProgress();
  await AsyncStorage.clear();
});

test('migrates legacy package IDs to learning path IDs', async () => {
  const level = ayah1Level;
  await AsyncStorage.setItem('qlp_app_progress', JSON.stringify({
    xp: 10,
    completedLessonIds: [level.id],
    completedPackageIds: ['surah-al-fil-v1'],
  }));
  await AsyncStorage.setItem(`qlp_lesson_${level.id}`, JSON.stringify({
    lessonId: level.id,
    packageId: 'surah-al-fil-v1',
    completed: true,
  }));

  const app = await getAppProgress();
  const migratedLevel = await getLevelProgress(level.id);

  expect(app.completedLearningPathIds).toEqual([surahAlFilLearningPath.id]);
  expect(migratedLevel?.pathId).toBe(surahAlFilLearningPath.id);
  expect(await AsyncStorage.getItem('qlp_app_progress')).toBeNull();
  expect(await AsyncStorage.getItem('qlp_progress_v5')).not.toBeNull();
});

test('serializes concurrent question attempts without data loss', async () => {
  const level = ayah1Level;
  await startLevel(level.id, level.pathId, level.steps[0].id);

  await Promise.all([
    recordQuestionAttempt({ levelId: level.id, pathId: level.pathId, questionId: 'q1', selectedAnswer: 0, correct: false }),
    recordQuestionAttempt({ levelId: level.id, pathId: level.pathId, questionId: 'q2', selectedAnswer: 1, correct: true }),
  ]);

  expect((await getLevelProgress(level.id))?.questionAttempts).toHaveLength(2);
});

test('restarts a level pointer without erasing learning history', async () => {
  const level = ayah1Level;
  const existing = completedProgress(level);
  await seedSnapshot({ [level.id]: existing });

  const restarted = await restartLevel(level.id, level.pathId, level.steps[0].id);

  expect(restarted.currentStepId).toBe(level.steps[0].id);
  expect(restarted.completed).toBe(true);
  expect(restarted.completedStepIds).toEqual(existing.completedStepIds);
  expect(restarted.activityAttempts.map(attempt => attempt.activityId)).toEqual(existing.activityAttempts.map(attempt => attempt.activityId));
  expect(restarted.questionAttempts.map(attempt => attempt.questionId)).toEqual(existing.questionAttempts.map(attempt => attempt.questionId));
});

test('requires a correct word-bank answer for memorization completion', async () => {
  const level = ayah1Level;
  const seeded = readyProgress(level);
  seeded.activityAttempts = seeded.activityAttempts.filter(attempt => attempt.activityId !== 'l1-recall-ayah-1');
  await seedSnapshot({ [level.id]: seeded });

  expect(isLevelReadyForCompletion(level, await getLevelProgress(level.id))).toBe(false);
  await recordActivityAttempt({ levelId: level.id, pathId: level.pathId, activityId: 'l1-recall-ayah-1', answer: ['105:1:word:2'], correct: false, evaluationVersion: '1' });
  expect(isLevelReadyForCompletion(level, await getLevelProgress(level.id))).toBe(false);
  await recordActivityAttempt({ levelId: level.id, pathId: level.pathId, activityId: 'l1-recall-ayah-1', answer: ['105:1:word:1', '105:1:word:2', '105:1:word:3', '105:1:word:4', '105:1:word:5', '105:1:word:6', '105:1:word:7'], correct: true, evaluationVersion: '1' });

  const progress = await getLevelProgress(level.id);
  expect(progress?.activityAttempts.filter(attempt => attempt.activityId === 'l1-recall-ayah-1')).toHaveLength(2);
  expect(isLevelReadyForCompletion(level, progress)).toBe(true);
});

test('requires memory and understanding activity completion but not optional context', () => {
  const level = ayah1Level;
  const ready = readyProgress(level);
  ready.completedStepIds = ready.completedStepIds.filter(id => id !== 'l1-context');
  expect(isLevelReadyForCompletion(level, ready)).toBe(true);

  const withoutMemory = { ...ready, activityAttempts: ready.activityAttempts.filter(attempt => attempt.activityId !== 'l1-recall-ayah-1' && attempt.activityId !== 'l1-fill-gap-1') };
  expect(isLevelReadyForCompletion(level, withoutMemory)).toBe(false);

  const withoutUnderstanding = { ...ready, activityAttempts: ready.activityAttempts.filter(attempt => attempt.activityId !== 'l1-match-meaning') };
  expect(isLevelReadyForCompletion(level, withoutUnderstanding)).toBe(false);
});

test('keeps completed progress valid when a package revision adds required activities', () => {
  const level = finalReviewLevel;
  const oldProgress: LevelProgress = {
    levelId: level.id, pathId: level.pathId, completed: true, startedAt: '2026-01-01T00:00:00.000Z',
    completedAt: '2026-01-01T00:08:00.000Z', currentStepId: 'l4-review',
    completedStepIds: ['l4-read', 'l4-translation', 'l4-word-meaning', 'l4-tafsir', 'l4-memory', 'l4-understanding', 'l4-review'],
    questionAttempts: [], activityAttempts: [],
  };

  expect(isLevelReadyForCompletion(level, oldProgress)).toBe(true);
});

test('registers the Level 4 memory and meaning ladder for deterministic review', async () => {
  const level = finalReviewLevel;
  await seedSnapshot({ [level.id]: readyProgress(level) });

  await completeLevel(level, surahAlFilLearningPath, { packageRevisionId: 'surah-al-fil-v1-r5', now: new Date('2026-01-01T00:00:00.000Z') });

  expect((await getReviewStates()).map(review => review.activityId)).toEqual(expect.arrayContaining([
    'al-fil-review-continue-5', 'al-fil-review-order-ayat',
  ]));
});

test('ignores stale levels when determining path completion', async () => {
  const target = surahAlFilLevels.find(level => level.id === 'al-fil-level-3-ayah-3')!;
  const preceding = surahAlFilLevels.slice(0, surahAlFilLevels.indexOf(target));
  await seedSnapshot({
    ...Object.fromEntries(preceding.map(level => [level.id, completedProgress(level)])),
    stale: { ...completedProgress(ayah1Level), levelId: 'stale' },
    [target.id]: readyProgress(target),
  });

  const receipt = await completeLevel(target, surahAlFilLearningPath);

  expect(receipt.learningPathJustCompleted).toBe(false);
  expect(receipt.awardedLearningPathXp).toBe(0);
});

test('awards concurrent completion XP once', async () => {
  const target = finalReviewLevel;
  await seedSnapshot({
    ...Object.fromEntries(surahAlFilLevels.slice(0, -1).map(level => [level.id, completedProgress(level)])),
    [target.id]: readyProgress(target),
  });

  const receipts = await Promise.all([
    completeLevel(target, surahAlFilLearningPath),
    completeLevel(target, surahAlFilLearningPath),
  ]);

  expect(receipts.reduce((sum, receipt) => sum + receipt.awardedLevelXp + receipt.awardedLearningPathXp, 0)).toBe(120);
  expect((await getAppProgress()).xp).toBe(120);
});

test('reconciles the new introduction from legacy Ayah 1 completion without XP', async () => {
  const legacy = completedProgress(ayah1Level);
  await seedSnapshot({ [ayah1Level.id]: legacy });
  const raw = JSON.parse((await AsyncStorage.getItem('qlp_progress_v2'))!);
  raw.app.xp = 42;
  await AsyncStorage.setItem('qlp_progress_v2', JSON.stringify(raw));

  await reconcileCurriculumProgress([surahAlFilLearningPath]);
  await reconcileCurriculumProgress([surahAlFilLearningPath]);

  expect((await getLevelProgress('al-fil-level-introduction'))?.completed).toBe(true);
  expect((await getAppProgress()).xp).toBe(42);
  expect(await getLastCompletionReceipt()).toBeNull();
});

test('migrates V4 and fans out historical combined Al-Fil completions once', async () => {
  const historical = { ...completedProgress(ayah1Level), levelId: 'al-fil-level-3-ayat-3-4' };
  const snapshot: ProgressSnapshotV4 = {
    schemaVersion: 4,
    app: { ...createDefaultProgress(), xp: 42, completedLevelIds: [historical.levelId] },
    levels: { [historical.levelId]: historical },
    reviews: {},
  };
  await AsyncStorage.setItem('qlp_progress_v4', JSON.stringify(snapshot));

  await reconcileCurriculumProgress([surahAlFilLearningPath]);
  await reconcileCurriculumProgress([surahAlFilLearningPath]);

  expect((await getLevelProgress('al-fil-level-3-ayah-3'))?.completed).toBe(true);
  expect((await getLevelProgress('al-fil-level-4-ayah-4'))?.completed).toBe(true);
  expect((await getAppProgress()).xp).toBe(42);
  expect(await AsyncStorage.getItem('qlp_progress_v4')).toBeNull();
  const migrated = JSON.parse((await AsyncStorage.getItem('qlp_progress_v5'))!);
  expect(migrated.appliedCurriculumMigrationIds).toContain('al-fil-split-ayat-3-4-v1');
});

test('quarantines corrupt V2 progress and reports recovery', async () => {
  await AsyncStorage.setItem('qlp_progress_v2', '{bad json');

  expect((await getAppProgress()).xp).toBe(0);
  expect(getProgressRecoveryWarning()?.code).toBe('corrupt_v2');
  expect((await AsyncStorage.getAllKeys()).some(key => key.startsWith('qlp_progress_corrupt_'))).toBe(true);
});

test('quarantines structurally invalid V3 attempts and review dates', async () => {
  const level = ayah1Level;
  const progress = readyProgress(level);
  progress.activityAttempts[0].attemptedAt = 'not-a-date';
  await AsyncStorage.setItem('qlp_progress_v3', JSON.stringify({
    schemaVersion: 3,
    app: createDefaultProgress(),
    levels: { [level.id]: progress },
    reviews: {
      invalid: {
        activityId: 'activity', levelId: level.id, packageRevisionId: 'revision', stage: 1,
        dueAt: 'not-a-date', lastReviewedAt: 'not-a-date', lastOutcome: 'correct', mastered: false,
      },
    },
  }));

  expect(await getLevelProgress(level.id)).toBeNull();
  expect(getProgressRecoveryWarning()?.code).toBe('corrupt_v3');
  expect((await AsyncStorage.getAllKeys()).some(key => key.startsWith('qlp_progress_corrupt_'))).toBe(true);
});

test('migrates a valid V2 snapshot without losing progress', async () => {
  const level = ayah1Level;
  const snapshot: ProgressSnapshotV2 = { schemaVersion: 2, app: createDefaultProgress(), levels: { [level.id]: readyProgress(level) } };
  snapshot.app.xp = 35;
  await AsyncStorage.setItem('qlp_progress_v2', JSON.stringify(snapshot));

  expect((await getAppProgress()).xp).toBe(35);
  expect((await getLevelProgress(level.id))?.activityAttempts.length).toBeGreaterThan(0);
  expect(await getReviewStates()).toEqual([]);
  expect(await AsyncStorage.getItem('qlp_progress_v2')).toBeNull();
  expect(await AsyncStorage.getItem('qlp_progress_v5')).not.toBeNull();
});

test('migrates V3 attempts and reviews to locale-scoped V5 records', async () => {
  const level = ayah1Level;
  const progress = readyProgress(level);
  await AsyncStorage.setItem('qlp_progress_v3', JSON.stringify({
    schemaVersion: 3,
    app: createDefaultProgress(),
    levels: { [level.id]: progress },
    reviews: {
      legacy: {
        activityId: 'l1-fill-gap-1', levelId: level.id, packageRevisionId: 'revision-r3',
        stage: 1, dueAt: '2026-01-02T00:00:00.000Z', lastReviewedAt: '2026-01-01T00:00:00.000Z',
        lastOutcome: 'correct', mastered: false,
      },
    },
  }));

  expect((await getLevelProgress(level.id))?.activityAttempts.every(attempt => attempt.locale === 'en')).toBe(true);
  expect(await getReviewStates()).toEqual([expect.objectContaining({ locale: 'en' })]);
  expect(await AsyncStorage.getItem('qlp_progress_v3')).toBeNull();
  expect(await AsyncStorage.getItem('qlp_progress_v5')).not.toBeNull();
});

test('registers successfully practiced review activities once on level completion', async () => {
  const level = ayah1Level;
  await seedSnapshot({ [level.id]: readyProgress(level) });

  await completeLevel(level, surahAlFilLearningPath, { packageRevisionId: 'revision-r3', now: new Date('2026-01-01T00:00:00.000Z') });
  await completeLevel(level, surahAlFilLearningPath, { packageRevisionId: 'revision-r3', now: new Date('2026-01-02T00:00:00.000Z') });

  const reviews = await getReviewStates();
  expect(reviews.map(review => review.activityId)).toEqual(expect.arrayContaining(['l1-recall-ayah-1', 'l1-fill-gap-1', 'l1-match-meaning']));
  expect(reviews).toHaveLength(3);
  expect(reviews.every(review => review.packageRevisionId === 'revision-r3')).toBe(true);
});

test('stores a review attempt and advances its schedule atomically', async () => {
  const level = ayah1Level;
  await seedSnapshot({ [level.id]: readyProgress(level) });
  await completeLevel(level, surahAlFilLearningPath, { packageRevisionId: 'revision-r3', now: new Date('2026-01-01T00:00:00.000Z') });

  await recordReviewAttempt({
    levelId: level.id, pathId: level.pathId, activityId: 'l1-fill-gap-1', answer: ['fixture'], correct: true,
    evaluationVersion: '2', packageRevisionId: 'revision-r3', reviewSchedule: { intervalDays: [1, 3, 7] }, outcome: 'correct',
    now: new Date('2026-01-02T00:00:00.000Z'),
  });

  const review = (await getReviewStates()).find(item => item.activityId === 'l1-fill-gap-1');
  expect(review).toEqual(expect.objectContaining({ stage: 2, dueAt: '2026-01-05T00:00:00.000Z' }));
  expect((await getLevelProgress(level.id))?.activityAttempts.at(-1)?.evaluationVersion).toBe('2');
  expect(await getDueReviewStates(new Date('2026-01-04T23:59:59.000Z'))).not.toContainEqual(review);
  expect(await getDueReviewStates(new Date('2026-01-05T00:00:00.000Z'))).toContainEqual(review);
});

test('keeps old schedules while syncing the active r16 package revision', async () => {
  const level = ayah1Level;
  await seedSnapshot({ [level.id]: readyProgress(level) });
  await completeLevel(level, surahAlFilLearningPath, { packageRevisionId: 'surah-al-fil-v1-r13', now: new Date('2026-01-01T00:00:00.000Z') });

  await syncCompletedLevelReviews([{ level, packageRevisionId: 'surah-al-fil-v1-r16' }], new Date('2026-01-02T00:00:00.000Z'));

  const reviews = await getReviewStates();
  expect(reviews.filter(review => review.packageRevisionId === 'surah-al-fil-v1-r13')).toHaveLength(3);
  expect(reviews.filter(review => review.packageRevisionId === 'surah-al-fil-v1-r16')).toHaveLength(3);
});

test('preserves review stage and due date across declared package revisions', async () => {
  const level = ayah1Level;
  await seedSnapshot({ [level.id]: readyProgress(level) });
  await completeLevel(level, surahAlFilLearningPath, { packageRevisionId: 'preview-v1', now: new Date('2026-01-01T00:00:00.000Z') });
  await recordReviewAttempt({
    levelId: level.id, pathId: level.pathId, activityId: 'l1-fill-gap-1', answer: ['fixture'], correct: true,
    evaluationVersion: '2', packageRevisionId: 'preview-v1', reviewSchedule: { intervalDays: [1, 3, 7] }, outcome: 'correct',
    now: new Date('2026-01-02T00:00:00.000Z'),
  });

  await syncCompletedLevelReviews([{ level, packageRevisionId: 'preview-v2', previousRevisionIds: ['preview-v1'] }], new Date('2026-01-03T00:00:00.000Z'));

  expect((await getReviewStates()).find(review => review.activityId === 'l1-fill-gap-1' && review.packageRevisionId === 'preview-v2')).toEqual(expect.objectContaining({
    stage: 2,
    dueAt: '2026-01-05T00:00:00.000Z',
    lastReviewedAt: '2026-01-02T00:00:00.000Z',
  }));
});

test('backfills review state from the latest attempt instead of completion time', async () => {
  const level = ayah1Level;
  const progress = readyProgress(level);
  const activityId = 'l1-recall-ayah-1';
  progress.completed = true;
  progress.completedAt = '2026-01-02T00:00:00.000Z';
  progress.activityAttempts.forEach(attempt => {
    if (attempt.activityId === activityId) attempt.attemptedAt = '2026-01-01T00:00:00.000Z';
  });
  progress.activityAttempts.push({
    activityId,
    levelId: level.id,
    answer: 'again',
    correct: false,
    attemptedAt: '2026-01-10T00:00:00.000Z',
    evaluationVersion: '1',
  });
  await seedSnapshot({ [level.id]: progress });

  await syncCompletedLevelReviews([{ level, packageRevisionId: 'revision-r5' }], new Date('2026-02-01T00:00:00.000Z'));

  expect((await getReviewStates()).find(review => review.activityId === activityId)).toEqual(expect.objectContaining({
    stage: 0,
    dueAt: '2026-01-11T00:00:00.000Z',
    lastReviewedAt: '2026-01-10T00:00:00.000Z',
    lastOutcome: 'again',
  }));
});

function readyProgress(level: Level): LevelProgress {
  const now = new Date().toISOString();
  return {
    levelId: level.id,
    pathId: level.pathId,
    completed: false,
    startedAt: now,
    completedStepIds: level.steps.map(step => step.id),
    questionAttempts: level.steps.flatMap(step => step.blocks
      .filter(block => block.type === 'question')
      .map(block => ({ questionId: block.id, levelId: level.id, selectedAnswer: 0, correct: true, attemptedAt: now }))),
    activityAttempts: level.steps.flatMap(step => step.blocks
      .filter((block): block is Extract<typeof block, { type: 'activity' }> => block.type === 'activity' && block.activity.required)
      .map(block => ({ activityId: block.activity.id, levelId: level.id, answer: 'fixture', correct: true, attemptedAt: now, evaluationVersion: '1', languageIndependent: block.activity.languageIndependent }))),
  };
}

function completedProgress(level: Level): LevelProgress {
  return { ...readyProgress(level), completed: true, completedAt: new Date().toISOString() };
}

async function seedSnapshot(levels: Record<string, LevelProgress>): Promise<void> {
  const snapshot: ProgressSnapshotV2 = {
    schemaVersion: 2,
    app: createDefaultProgress(),
    levels,
  };
  snapshot.app.completedLevelIds = Object.values(levels).filter(level => level.completed).map(level => level.levelId);
  await AsyncStorage.setItem('qlp_progress_v2', JSON.stringify(snapshot));
}

test('abandonLevel deletes level progress if there was no pre-session progress', async () => {
  const level = ayah1Level;
  
  // Start level creates the in-session progress
  await startLevel(level.id, level.pathId, level.steps[0].id);
  await recordQuestionAttempt({ levelId: level.id, pathId: level.pathId, questionId: 'q1', selectedAnswer: 1, correct: true });
  
  expect(await getLevelProgress(level.id)).not.toBeNull();
  
  // Abandon with undefined preSessionSnapshot (new level)
  await abandonLevel(level.id, undefined);
  
  expect(await getLevelProgress(level.id)).toBeNull();
});

test('abandonLevel restores pre-session progress if level was already started/completed', async () => {
  const level = ayah1Level;
  const oldProgress = completedProgress(level);
  await seedSnapshot({ [level.id]: oldProgress });
  
  // Re-enter / modify progress in new session
  await restartLevel(level.id, level.pathId, level.steps[0].id);
  await recordQuestionAttempt({ levelId: level.id, pathId: level.pathId, questionId: 'new-q', selectedAnswer: 2, correct: false });
  
  const currentProgress = await getLevelProgress(level.id);
  expect(currentProgress?.questionAttempts).toHaveLength(oldProgress.questionAttempts.length + 1);
  
  // Abandon and restore to oldProgress
  await abandonLevel(level.id, oldProgress);
  
  const restoredProgress = await getLevelProgress(level.id);
  expect(restoredProgress).not.toBeNull();
  expect(restoredProgress?.questionAttempts).toHaveLength(oldProgress.questionAttempts.length);
  expect(restoredProgress?.completed).toBe(true);
});
