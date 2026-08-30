import surahAlFilPackage from '../../content/packages/surah-al-fil/v1';
import { getContentRepository } from './repository';
import { getCoreLevelSteps, getLocalizedCoreLevelSteps, getPracticeLevelSteps } from './lessonSteps';

test('separates optional activity steps from the focused daily loop without changing authored order', () => {
  const level = surahAlFilPackage.levels.find(candidate => candidate.id === 'al-fil-level-1-context-ayah-1')!;

  expect(getCoreLevelSteps(level).some(step => step.kind === 'context')).toBe(false);
  expect(getPracticeLevelSteps(level).every(step => step.required === false)).toBe(true);
  expect(getCoreLevelSteps(level).flatMap(step => step.blocks).filter(block => block.type === 'activity')).toHaveLength(2);
});

test('omits source locks and unavailable localized religious resources from core flow', () => {
  const repo = getContentRepository();
  const level = surahAlFilPackage.levels.find(candidate => candidate.id === 'al-fil-level-1-context-ayah-1')!;
  const steps = getLocalizedCoreLevelSteps(level, repo, 'fr');
  const blocks = steps.flatMap(step => step.blocks);

  expect(blocks.some(block => block.type === 'ayah_ref' || block.type === 'quran_passage')).toBe(true);
  expect(blocks.some(block => block.type === 'source_locked')).toBe(false);
  expect(blocks.some(block => block.type === 'tafsir_ref' || block.type === 'word_explorer')).toBe(false);
});
