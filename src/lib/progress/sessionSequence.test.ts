import { advanceSessionCursor, createSessionCursor } from './sessionSequence';

test('postpones an incorrect main-pass step until the remaining steps finish', () => {
  let cursor = createSessionCursor(0);
  cursor = advanceSessionCursor(3, cursor, false).cursor;
  expect(cursor).toEqual({ phase: 'main', currentStepIndex: 1, retryStepIndexes: [0] });
  cursor = advanceSessionCursor(3, cursor, true).cursor;
  expect(cursor.currentStepIndex).toBe(2);
  cursor = advanceSessionCursor(3, cursor, true).cursor;
  expect(cursor).toEqual({ phase: 'retry', currentStepIndex: 0, retryStepIndexes: [0] });
});

test('requeues a failed retry without replaying unrelated steps', () => {
  const cursor = createSessionCursor(0, [0, 2], true);
  const firstRetry = advanceSessionCursor(3, cursor, false);
  expect(firstRetry.cursor).toEqual({ phase: 'retry', currentStepIndex: 2, retryStepIndexes: [2, 0] });
  const secondRetry = advanceSessionCursor(3, firstRetry.cursor, true);
  expect(secondRetry.cursor).toEqual({ phase: 'retry', currentStepIndex: 0, retryStepIndexes: [0] });
  expect(advanceSessionCursor(3, secondRetry.cursor, true).complete).toBe(true);
});
