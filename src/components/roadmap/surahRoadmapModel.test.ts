import type { AuthoredSurahSummary, Level, SurahRecord } from '../../types/content';
import { buildSurahRoadmapItems } from './surahRoadmapModel';

const authored = [105, 106, 107, 108].map((surahNumber, index) => makeAuthored(surahNumber, index));

test('derives completed, current, available, and future states without restricting access', () => {
  const items = buildSurahRoadmapItems(authored, ['105-a', '105-b'], '106-a');

  expect(items.map(item => item.state)).toEqual(['completed', 'current', 'available', 'future']);
  expect(items[0]).toMatchObject({ completedLessons: 2, progress: 1, illustrationKey: 'elephant' });
  expect(items[3].illustrationKey).toBe('water');
});

test('keeps jumped-ahead partial Surahs visually available', () => {
  const items = buildSurahRoadmapItems(authored, ['108-a'], '106-a');

  expect(items.map(item => item.state)).toEqual(['available', 'current', 'available', 'available']);
  expect(items[3]).toMatchObject({ completedLessons: 1, progress: 0.5 });
});

test('uses a generic illustration for authored Surahs outside the preview catalog', () => {
  const items = buildSurahRoadmapItems([makeAuthored(1, 0)], [], '1-a');

  expect(items[0]).toMatchObject({ illustrationKey: 'quran', state: 'current' });
});

function makeAuthored(surahNumber: number, index: number): AuthoredSurahSummary {
  const surah = {
    id: `surah-${surahNumber}`,
    surahNumber,
    arabicName: `سورة ${surahNumber}`,
    transliteratedName: `Surah ${surahNumber}`,
    englishName: `Chapter ${surahNumber}`,
    ayahCount: index + 3,
    revelationPlace: index % 2 === 0 ? 'makkah' : 'madinah',
    sourceMetadata: { quranTextSourceId: 'source', translationSourceIds: [], tafsirSourceIds: [], reviewerStatus: 'draft' },
  } satisfies SurahRecord;
  const levels = [`${surahNumber}-a`, `${surahNumber}-b`].map(id => ({ id }) as Level);
  return { packageId: 'package', path: {} as never, curriculum: {} as never, surah, levels };
}
