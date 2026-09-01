import type { AuthoredSurahSummary, Level, SurahRecord } from '../../types/content';
import { buildSurahRoadmapItems } from './surahRoadmapModel';

const authored = [105, 106, 107, 108].map((surahNumber, index) => makeAuthored(surahNumber, index));

test('derives three visual states and keeps progress internal', () => {
  const items = buildSurahRoadmapItems(authored, ['105-a', '105-b'], '106-a');

  expect(items.map(item => item.state)).toEqual(['completed', 'current', 'upcoming', 'upcoming']);
  expect(items[0]).toMatchObject({ progress: 1, englishName: 'Surah 105' });
  expect(items[0]).not.toHaveProperty('ayahCount');
  expect(items[0]).not.toHaveProperty('illustrationKey');
});

test('never maps canonical English meaning into visible roadmap name', () => {
  const [item] = buildSurahRoadmapItems([makeAuthored(1, 0)], [], '1-a');
  expect(item.englishName).toBe('Surah 1');
  expect(item.englishName).not.toBe('Chapter 1');
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
