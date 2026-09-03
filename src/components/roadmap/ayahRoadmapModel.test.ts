import type { AuthoredSurahSummary, Level, SurahCurriculum, SurahRecord } from '../../types/content';
import { buildAyahRoadmapModel } from './ayahRoadmapModel';

const levels = ['intro', 'ayah-1', 'ayah-2-3', 'context', 'checkpoint', 'ayah-4', 'review'].map(id => ({ id }) as Level);
const curriculum: SurahCurriculum = {
  id: 'curriculum',
  surahId: 'surah-1',
  reviewSegments: [],
  lessons: [
    { levelId: 'intro', kind: 'introduction' },
    { levelId: 'ayah-1', kind: 'ayah', ayahRange: range(1, 1) },
    { levelId: 'ayah-2-3', kind: 'ayah_range', ayahRange: range(2, 3) },
    { levelId: 'context', kind: 'context_section', ayahRange: range(4, 4) },
    { levelId: 'checkpoint', kind: 'segment_review', ayahRange: range(1, 3) },
    { levelId: 'ayah-4', kind: 'ayah', ayahRange: range(4, 4) },
    { levelId: 'review', kind: 'final_review', ayahRange: range(1, 4) },
  ],
};
const authored = { packageId: 'pkg', path: {} as never, curriculum, levels, surah: { id: 'surah-1', surahNumber: 1, ayahCount: 4 } as SurahRecord } satisfies AuthoredSurahSummary;

test('preserves authored milestones and expands ranges into one node per ayah', () => {
  const model = buildAyahRoadmapModel(authored, ['intro', 'ayah-1', 'ayah-2-3']);
  expect(model.items.map(item => item.kind === 'ayah' ? item.ayahNumber : item.milestoneKind)).toEqual(['intro', 1, 2, 3, 'context', 'checkpoint', 4, 'final_review']);
  expect(model.items.map(item => item.state)).toEqual(['completed', 'completed', 'completed', 'completed', 'current', 'upcoming', 'upcoming', 'upcoming']);
  expect(model.items[5].targetLevelId).toBe('checkpoint');
});

test('renders introduction and final review as distinct milestones', () => {
  expect(buildAyahRoadmapModel(authored, []).items[0]).toMatchObject({ kind: 'milestone', milestoneKind: 'intro', state: 'current', targetLevelId: 'intro' });
  const model = buildAyahRoadmapModel(authored, ['intro', 'ayah-1', 'ayah-2-3', 'context', 'checkpoint', 'ayah-4']);
  expect(model.items.at(-1)).toMatchObject({ kind: 'milestone', milestoneKind: 'final_review', state: 'current', targetLevelId: 'review' });
});

function range(start: number, end: number) {
  return { start: { surahNumber: 1, ayahNumber: start }, end: { surahNumber: 1, ayahNumber: end } };
}
