import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  surahAlFilLearningPath,
  surahAlFilLevels,
} from '../../content/packages/surah-al-fil/v1';
import { Level } from '../../types/content';
import { createDefaultProgress, LevelProgress, ProgressSnapshotV2 } from '../../types/progress';
import {
  completeLevel,
  getAppProgress,
  getLevelProgress,
  getProgressRecoveryWarning,
  getReviewStates,
  getDueReviewStates,
  recordQuestionAttempt,
  recordActivityAttempt,
  recordReviewAttempt,
  isLevelReadyForCompletion,
  resetProgress,
  startLevel,
  syncCompletedLevelReviews,
} from './storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

beforeEach(async () => {
  await resetProgress();
  await AsyncStorage.clear();
});

test('migrates legacy package IDs to learning path IDs', async () => {
  const level = surahAlFilLevels[0];
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
  expect(await AsyncStorage.getItem('qlp_progress_v3')).not.toBeNull();
});

test('serializes concurrent question attempts without data loss', async () => {
  const level = surahAlFilLevels[0];
  await startLevel(level.id, level.pathId, level.steps[0].id);

  await Promise.all([
    recordQuestionAttempt({ levelId: level.id, pathId: level.pathId, questionId: 'q1', selectedAnswer: 0, correct: false }),
    recordQuestionAttempt({ levelId: level.id, pathId: level.pathId, questionId: 'q2', selectedAnswer: 1, correct: true }),
  ]);

  expect((await getLevelProgress(level.id))?.questionAttempts).toHaveLength(2);
});

test('persists recall attempts and requires a passing rating for completion', async () => {
  const level = surahAlFilLevels[0];
  const seeded = readyProgress(level);
  seeded.activityAttempts = seeded.activityAttempts.filter(attempt => attempt.activityId !== 'l1-recall-ayah-1');
  await seedSnapshot({ [level.id]: seeded });

  expect(isLevelReadyForCompletion(level, await getLevelProgress(level.id))).toBe(false);
  await recordActivityAttempt({ levelId: level.id, pathId: level.pathId, activityId: 'l1-recall-ayah-1', answer: 'again', correct: false, evaluationVersion: '1' });
  expect(isLevelReadyForCompletion(level, await getLevelProgress(level.id))).toBe(false);
  await recordActivityAttempt({ levelId: level.id, pathId: level.pathId, activityId: 'l1-recall-ayah-1', answer: 'remembered', correct: true, evaluationVersion: '1' });

  const progress = await getLevelProgress(level.id);
  expect(progress?.activityAttempts.filter(attempt => attempt.activityId === 'l1-recall-ayah-1')).toHaveLength(2);
  expect(isLevelReadyForCompletion(level, progress)).toBe(true);
});

test('requires memory and understanding activity completion but not optional context', () => {
  const level = surahAlFilLevels[0];
  const ready = readyProgress(level);
  ready.completedStepIds = ready.completedStepIds.filter(id => id !== 'l1-context');
  expect(isLevelReadyForCompletion(level, ready)).toBe(true);

  const withoutMemory = { ...ready, activityAttempts: ready.activityAttempts.filter(attempt => attempt.activityId !== 'l1-recall-ayah-1' && attempt.activityId !== 'l1-fill-gap-1') };
  expect(isLevelReadyForCompletion(level, withoutMemory)).toBe(false);

  const withoutUnderstanding = { ...ready, activityAttempts: ready.activityAttempts.filter(attempt => attempt.activityId !== 'l1-match-meaning') };
  expect(isLevelReadyForCompletion(level, withoutUnderstanding)).toBe(false);
});

test('keeps completed progress valid when a package revision adds required activities', () => {
  const level = surahAlFilLevels[3];
  const oldProgress: LevelProgress = {
    levelId: level.id, pathId: level.pathId, completed: true, startedAt: '2026-01-01T00:00:00.000Z',
    completedAt: '2026-01-01T00:08:00.000Z', currentStepId: 'l4-review',
    completedStepIds: ['l4-read', 'l4-translation', 'l4-word-meaning', 'l4-tafsir', 'l4-memory', 'l4-understanding', 'l4-review'],
    questionAttempts: [], activityAttempts: [],
  };

  expect(isLevelReadyForCompletion(level, oldProgress)).toBe(true);
});

test('registers the Level 4 memory and meaning ladder for deterministic review', async () => {
  const level = surahAlFilLevels[3];
  await seedSnapshot({ [level.id]: readyProgress(level) });

  await completeLevel(level, surahAlFilLearningPath, { packageRevisionId: 'surah-al-fil-v1-r4', now: new Date('2026-01-01T00:00:00.000Z') });

  expect((await getReviewStates()).map(review => review.activityId)).toEqual(expect.arrayContaining([
    'l4-continuation-5', 'l4-match-meaning', 'l4-recall-5', 'l4-order-ayat-1-5',
  ]));
});

test('ignores stale levels when determining path completion', async () => {
  const target = surahAlFilLevels[2];
  await seedSnapshot({
    [surahAlFilLevels[0].id]: completedProgress(surahAlFilLevels[0]),
    [surahAlFilLevels[1].id]: completedProgress(surahAlFilLevels[1]),
    stale: { ...completedProgress(surahAlFilLevels[0]), levelId: 'stale' },
    [target.id]: readyProgress(target),
  });

  const receipt = await completeLevel(target, surahAlFilLearningPath);

  expect(receipt.learningPathJustCompleted).toBe(false);
  expect(receipt.awardedLearningPathXp).toBe(0);
});

test('awards concurrent completion XP once', async () => {
  const target = surahAlFilLevels[3];
  await seedSnapshot({
    [surahAlFilLevels[0].id]: completedProgress(surahAlFilLevels[0]),
    [surahAlFilLevels[1].id]: completedProgress(surahAlFilLevels[1]),
    [surahAlFilLevels[2].id]: completedProgress(surahAlFilLevels[2]),
    [target.id]: readyProgress(target),
  });

  const receipts = await Promise.all([
    completeLevel(target, surahAlFilLearningPath),
    completeLevel(target, surahAlFilLearningPath),
  ]);

  expect(receipts.reduce((sum, receipt) => sum + receipt.awardedLevelXp + receipt.awardedLearningPathXp, 0)).toBe(120);
  expect((await getAppProgress()).xp).toBe(120);
});

test('quarantines corrupt V2 progress and reports recovery', async () => {
  await AsyncStorage.setItem('qlp_progress_v2', '{bad json');

  expect((await getAppProgress()).xp).toBe(0);
  expect(getProgressRecoveryWarning()?.code).toBe('corrupt_v2');
  expect((await AsyncStorage.getAllKeys()).some(key => key.startsWith('qlp_progress_corrupt_'))).toBe(true);
});

test('migrates a valid V2 snapshot without losing progress', async () => {
  const level = surahAlFilLevels[0];
  const snapshot: ProgressSnapshotV2 = { schemaVersion: 2, app: createDefaultProgress(), levels: { [level.id]: readyProgress(level) } };
  snapshot.app.xp = 35;
  await AsyncStorage.setItem('qlp_progress_v2', JSON.stringify(snapshot));

  expect((await getAppProgress()).xp).toBe(35);
  expect((await getLevelProgress(level.id))?.activityAttempts.length).toBeGreaterThan(0);
  expect(await getReviewStates()).toEqual([]);
  expect(await AsyncStorage.getItem('qlp_progress_v2')).toBeNull();
  expect(await AsyncStorage.getItem('qlp_progress_v3')).not.toBeNull();
});

test('registers successfully practiced review activities once on level completion', async () => {
  const level = surahAlFilLevels[0];
  await seedSnapshot({ [level.id]: readyProgress(level) });

  await completeLevel(level, surahAlFilLearningPath, { packageRevisionId: 'revision-r3', now: new Date('2026-01-01T00:00:00.000Z') });
  await completeLevel(level, surahAlFilLearningPath, { packageRevisionId: 'revision-r3', now: new Date('2026-01-02T00:00:00.000Z') });

  const reviews = await getReviewStates();
  expect(reviews.map(review => review.activityId)).toEqual(expect.arrayContaining(['l1-recall-ayah-1', 'l1-fill-gap-1', 'l1-order-ayah-1', 'l1-match-meaning']));
  expect(reviews).toHaveLength(4);
  expect(reviews.every(review => review.packageRevisionId === 'revision-r3')).toBe(true);
});

test('stores a review attempt and advances its schedule atomically', async () => {
  const level = surahAlFilLevels[0];
  await seedSnapshot({ [level.id]: readyProgress(level) });
  await completeLevel(level, surahAlFilLearningPath, { packageRevisionId: 'revision-r3', now: new Date('2026-01-01T00:00:00.000Z') });

  await recordReviewAttempt({
    levelId: level.id, pathId: level.pathId, activityId: 'l1-order-ayah-1', answer: ['fixture'], correct: true,
    evaluationVersion: '2', packageRevisionId: 'revision-r3', reviewSchedule: { intervalDays: [1, 3, 7] }, outcome: 'correct',
    now: new Date('2026-01-02T00:00:00.000Z'),
  });

  const review = (await getReviewStates()).find(item => item.activityId === 'l1-order-ayah-1');
  expect(review).toEqual(expect.objectContaining({ stage: 2, dueAt: '2026-01-05T00:00:00.000Z' }));
  expect((await getLevelProgress(level.id))?.activityAttempts.at(-1)?.evaluationVersion).toBe('2');
  expect(await getDueReviewStates(new Date('2026-01-04T23:59:59.000Z'))).not.toContainEqual(review);
  expect(await getDueReviewStates(new Date('2026-01-05T00:00:00.000Z'))).toContainEqual(review);
});

test('keeps stale revision schedules while syncing the active package revision', async () => {
  const level = surahAlFilLevels[0];
  await seedSnapshot({ [level.id]: readyProgress(level) });
  await completeLevel(level, surahAlFilLearningPath, { packageRevisionId: 'revision-r2', now: new Date('2026-01-01T00:00:00.000Z') });

  await syncCompletedLevelReviews([{ level, packageRevisionId: 'revision-r3' }], new Date('2026-01-02T00:00:00.000Z'));

  const reviews = await getReviewStates();
  expect(reviews.filter(review => review.packageRevisionId === 'revision-r2')).toHaveLength(4);
  expect(reviews.filter(review => review.packageRevisionId === 'revision-r3')).toHaveLength(4);
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
      .map(block => ({ activityId: block.activity.id, levelId: level.id, answer: 'fixture', correct: true, attemptedAt: now, evaluationVersion: '1' }))),
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
