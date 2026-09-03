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

test.each(['surah', 'ayah'] as const)('%s nodes leave room for the right scrubber at 320px', kind => {
  const nodeRadius = kind === 'surah' ? 44 : 34;
  const values = Array.from({ length: 114 }, (_, index) => roadmapNodeX(index, 320, kind));
  expect(Math.min(...values) - nodeRadius).toBeGreaterThanOrEqual(0);
  expect(Math.max(...values) + nodeRadius).toBeLessThanOrEqual(276);
});
