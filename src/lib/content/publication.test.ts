import surahAlFilPackage from '../../content/packages/surah-al-fil/v1';
import { availableLessonLocales, isLessonLocaleAvailable } from './publication';

test('keeps draft lesson locale complete and explicit in development', () => {
  expect(isLessonLocaleAvailable(surahAlFilPackage, 'en')).toBe(true);
  expect(isLessonLocaleAvailable(surahAlFilPackage, 'ar')).toBe(false);
  expect(isLessonLocaleAvailable(surahAlFilPackage, 'fr')).toBe(false);
  expect(availableLessonLocales(surahAlFilPackage)).toEqual(['en']);
});
