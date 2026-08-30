import { getLevelAccessState, isLevelAccessible } from './lessonAccess';
import type { Level } from '../../types/content';

const levels = ['intro', 'ayah-1', 'ayah-2'].map(id => ({ id })) as Level[];

test('marks exactly one incomplete lesson current while keeping later lessons available', () => {
  expect(levels.map(level => getLevelAccessState(levels, [], level.id))).toEqual([
    'active',
    'available',
    'available',
  ]);
  expect(levels.every(level => isLevelAccessible(levels, [], level.id))).toBe(true);
});

test('moves current emphasis after completion without locking jumped-ahead lessons', () => {
  expect(levels.map(level => getLevelAccessState(levels, ['intro'], level.id))).toEqual([
    'completed',
    'active',
    'available',
  ]);
});
