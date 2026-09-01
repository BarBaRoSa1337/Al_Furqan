import type { AuthoredSurahSummary, Level, SurahCurriculum, SurahRecord } from '../../types/content';
import { buildAyahRoadmapModel } from './ayahRoadmapModel';

const levels = ['intro', 'ayah-1', 'ayah-2-3', 'checkpoint', 'ayah-4', 'review'].map(id => ({ id }) as Level);
const curriculum: SurahCurriculum = {
  id: 'curriculum',
  surahId: 'surah-1',
  reviewSegments: [],
  lessons: [
    { levelId: 'intro', kind: 'introduction' },
    { levelId: 'ayah-1', kind: 'ayah', ayahRange: range(1, 1) },
    { levelId: 'ayah-2-3', kind: 'ayah_range', ayahRange: range(2, 3) },
    { levelId: 'checkpoint', kind: 'segment_review', ayahRange: range(1, 3) },
    { levelId: 'ayah-4', kind: 'ayah', ayahRange: range(4, 4) },
    { levelId: 'review', kind: 'final_review', ayahRange: range(1, 4) },
  ],
};
const authored = { packageId: 'pkg', path: {} as never, curriculum, levels, surah: { id: 'surah-1', surahNumber: 1, ayahCount: 4 } as SurahRecord } satisfies AuthoredSurahSummary;

test('expands ranges into one node per ayah and anchors active checkpoint', () => {
  const model = buildAyahRoadmapModel(authored, ['intro', 'ayah-1', 'ayah-2-3']);
  expect(model.items.map(item => item.ayahNumber)).toEqual([1, 2, 3, 4]);
  expect(model.items.map(item => item.state)).toEqual(['completed', 'completed', 'current', 'upcoming']);
  expect(model.items[2].targetLevelId).toBe('checkpoint');
});

test('uses header for introduction and last ayah for final review', () => {
  expect(buildAyahRoadmapModel(authored, []).header).toMatchObject({ state: 'current', targetLevelId: 'intro' });
  const model = buildAyahRoadmapModel(authored, ['intro', 'ayah-1', 'ayah-2-3', 'checkpoint', 'ayah-4']);
  expect(model.items[3]).toMatchObject({ state: 'current', targetLevelId: 'review' });
});

function range(start: number, end: number) {
  return { start: { surahNumber: 1, ayahNumber: start }, end: { surahNumber: 1, ayahNumber: end } };
}
