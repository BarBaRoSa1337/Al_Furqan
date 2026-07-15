import surahAlFilPackage from '../../content/packages/surah-al-fil/v1';
import { ContentPackage } from '../../types/content';
import { validatePackage } from './packageValidator';

test('accepts draft package in development with warnings', () => {
  const result = validatePackage(surahAlFilPackage, { mode: 'development' });
  expect(result.valid).toBe(true);
  expect(result.warnings.length).toBeGreaterThan(0);
});

test('blocks draft religious content in production', () => {
  const result = validatePackage(surahAlFilPackage, { mode: 'production' });
  expect(result.valid).toBe(false);
  expect(result.errors.some(error => error.includes('reviewerStatus is "draft"'))).toBe(true);
});

test('rejects duplicate block IDs and word explorer refs outside level', () => {
  const pkg = structuredClone(surahAlFilPackage) as ContentPackage;
  const level = pkg.levels[0];
  level.steps[1].blocks[0].id = level.steps[0].blocks[0].id;
  const wordBlock = level.steps[2].blocks.find(block => block.type === 'word_explorer');
  if (wordBlock?.type === 'word_explorer') wordBlock.ayahRefs = [{ surahNumber: 105, ayahNumber: 2 }];

  const result = validatePackage(pkg);
  expect(result.valid).toBe(false);
  expect(result.errors.some(error => error.includes('Duplicate block'))).toBe(true);
  expect(result.errors.some(error => error.includes('outside level.ayahRefs'))).toBe(true);
});
