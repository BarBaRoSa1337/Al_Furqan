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
  recordQuestionAttempt,
  resetProgress,
  startLevel,
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
  expect(await AsyncStorage.getItem('qlp_progress_v2')).not.toBeNull();
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
