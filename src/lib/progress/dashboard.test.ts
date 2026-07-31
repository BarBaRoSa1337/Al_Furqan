import { getContentRepository } from '../content/repository';
import { surahAlFilLevels } from '../../content/packages/surah-al-fil/v1';
import { isDailyGoalComplete, resolveHomePrimaryAction, resolveQuranLocation } from './dashboard';

test('completes the daily goal from a same-day level receipt or review', () => {
  const now = new Date(2026, 6, 30, 12);
  expect(isDailyGoalComplete({
    id: 'receipt',
    levelId: 'level',
    learningPathId: 'path',
    alreadyCompleted: false,
    learningPathJustCompleted: false,
    awardedLevelXp: 20,
    awardedLearningPathXp: 0,
    completedAt: new Date(2026, 6, 30, 8).toISOString(),
  }, [], now)).toBe(true);
  expect(isDailyGoalComplete(null, [{
    activityId: 'activity',
    levelId: 'level',
    packageRevisionId: 'revision',
    stage: 1,
    lastOutcome: 'correct',
    lastReviewedAt: new Date(2026, 6, 29, 23).toISOString(),
    mastered: false,
    dueAt: new Date(2026, 6, 31, 23).toISOString(),
  }], now)).toBe(false);
});

test('prioritizes due review, then active learning, then practice', () => {
  const level = surahAlFilLevels[0];
  expect(resolveHomePrimaryAction(2, level, undefined, false)).toEqual({ kind: 'review', href: '/review' });
  expect(resolveHomePrimaryAction(0, level, undefined, false)).toEqual({ kind: 'lesson', href: `/level/${level.id}` });
  expect(resolveHomePrimaryAction(0, undefined, level, true)).toEqual({ kind: 'practice', href: `/level/${level.id}` });
});

test('derives source-backed Quran location without exposing thumun', () => {
  const location = resolveQuranLocation(getContentRepository(), surahAlFilLevels[0]);
  expect(location).toMatchObject({
    surahName: 'Al-Fil',
    surahNumber: 105,
    ayahLabel: '1',
    juzNumber: 30,
    hizbNumber: 60,
    rubNumber: 240,
    pageNumber: 601,
  });
  expect(location).not.toHaveProperty('thumunNumber');
});
