import { isReviewDue, scheduleActivityReview } from './reviewScheduler';

const schedule = { intervalDays: [1, 3, 7] };
const base = { activityId: 'activity', levelId: 'level', packageRevisionId: 'revision', schedule };
const now = new Date('2026-01-01T12:00:00.000Z');

test('advances deterministic review intervals after successful recall', () => {
  const first = scheduleActivityReview(undefined, { ...base, outcome: 'remembered' }, now);
  const second = scheduleActivityReview(first, { ...base, outcome: 'correct' }, new Date(first.dueAt!));

  expect(first.stage).toBe(1);
  expect(first.dueAt).toBe('2026-01-02T12:00:00.000Z');
  expect(second.stage).toBe(2);
  expect(second.dueAt).toBe('2026-01-05T12:00:00.000Z');
});

test('hard retains the stage and again resets it', () => {
  const first = scheduleActivityReview(undefined, { ...base, outcome: 'remembered' }, now);
  const hard = scheduleActivityReview(first, { ...base, outcome: 'hard' }, now);
  const again = scheduleActivityReview(hard, { ...base, outcome: 'again' }, now);

  expect(hard.stage).toBe(1);
  expect(hard.dueAt).toBe('2026-01-02T12:00:00.000Z');
  expect(again.stage).toBe(0);
  expect(again.dueAt).toBe('2026-01-02T12:00:00.000Z');
});

test('marks the final deterministic interval as mastered', () => {
  const first = scheduleActivityReview(undefined, { ...base, outcome: 'correct' }, now);
  const second = scheduleActivityReview(first, { ...base, outcome: 'correct' }, now);
  const third = scheduleActivityReview(second, { ...base, outcome: 'correct' }, now);

  expect(third.mastered).toBe(true);
  expect(third.dueAt).toBeUndefined();
  expect(isReviewDue(third, new Date('2030-01-01T00:00:00.000Z'))).toBe(false);
});
