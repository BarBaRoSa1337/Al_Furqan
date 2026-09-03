import { roadmapNodeRatio, roadmapNodeX } from './roadmapGeometry';

test('surah geometry uses broad, bounded, non-zigzag horizontal movement', () => {
  const ratios = Array.from({ length: 12 }, (_, index) => roadmapNodeRatio(index, 'surah'));
  expect(Math.max(...ratios) - Math.min(...ratios)).toBeGreaterThan(0.58);
  expect(ratios.every(value => value >= 0.06 && value <= 0.94)).toBe(true);
  expect(ratios.some((value, index) => index > 1 && (value - ratios[index - 1]) * (ratios[index - 1] - ratios[index - 2]) > 0)).toBe(true);
});

test('node x positions remain inside compact screen edges', () => {
  const values = Array.from({ length: 20 }, (_, index) => roadmapNodeX(index, 296, 'surah'));
  expect(Math.min(...values)).toBeGreaterThanOrEqual(54);
  expect(Math.max(...values)).toBeLessThanOrEqual(242);
});
