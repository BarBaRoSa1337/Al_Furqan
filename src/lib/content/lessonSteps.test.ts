import surahAlFilPackage from '../../content/packages/surah-al-fil/v1';
import { getCoreLevelSteps, getPracticeLevelSteps } from './lessonSteps';

test('separates optional activity steps from the focused daily loop without changing authored order', () => {
  const level = surahAlFilPackage.levels[0];

  expect(getCoreLevelSteps(level).some(step => step.id === 'l1-context')).toBe(true);
  expect(getPracticeLevelSteps(level).every(step => step.required === false)).toBe(true);
  expect(getCoreLevelSteps(level).flatMap(step => step.blocks).filter(block => block.type === 'activity')).toHaveLength(2);
});
