import { isReviewDue, restorePendingFinalInterval, scheduleActivityReview } from './reviewScheduler';

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

test('schedules every deterministic interval before mastery', () => {
  const first = scheduleActivityReview(undefined, { ...base, outcome: 'correct' }, now);
  const second = scheduleActivityReview(first, { ...base, outcome: 'correct' }, new Date(first.dueAt!));
  const third = scheduleActivityReview(second, { ...base, outcome: 'correct' }, new Date(second.dueAt!));
  const mastered = scheduleActivityReview(third, { ...base, outcome: 'correct' }, new Date(third.dueAt!));

  expect(third).toEqual(expect.objectContaining({ stage: 3, dueAt: '2026-01-12T12:00:00.000Z', mastered: false }));
  expect(mastered).toEqual(expect.objectContaining({ stage: 4, dueAt: undefined, mastered: true }));
  expect(isReviewDue(mastered, new Date('2030-01-01T00:00:00.000Z'))).toBe(false);
});

test('restores the final interval for states mastered by the legacy boundary', () => {
  const legacy = {
    activityId: 'activity', levelId: 'level', packageRevisionId: 'revision', stage: 3,
    lastOutcome: 'correct' as const, lastReviewedAt: '2026-01-05T12:00:00.000Z', mastered: true,
  };

  expect(restorePendingFinalInterval(legacy, schedule)).toEqual({
    ...legacy,
    mastered: false,
    dueAt: '2026-01-12T12:00:00.000Z',
  });
});
