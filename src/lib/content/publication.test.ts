import surahAlFilPackage from '../../content/packages/surah-al-fil/v1';
import { availableLessonLocales, isLessonLocaleAvailable } from './publication';

test('keeps draft lesson locale complete and explicit in development', () => {
  expect(isLessonLocaleAvailable(surahAlFilPackage, 'en', 'preview')).toBe(true);
  expect(isLessonLocaleAvailable(surahAlFilPackage, 'ar', 'preview')).toBe(false);
  expect(isLessonLocaleAvailable(surahAlFilPackage, 'fr', 'preview')).toBe(false);
  expect(availableLessonLocales(surahAlFilPackage, 'preview')).toEqual(['en']);
});

test('does not expose draft lesson locales in production mode', () => {
  expect(isLessonLocaleAvailable(surahAlFilPackage, 'en', 'production')).toBe(false);
  expect(availableLessonLocales(surahAlFilPackage, 'production')).toEqual([]);
});
