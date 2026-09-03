import type { QuranSearchResult } from '../../../packages/api-contracts/src';
import type { AuthoredSurahSummary, SurahRecord } from '../../types/content';
import { resolveRoadmapSearchTarget } from './searchRoadmapTarget';

const authored = [93, 94].map(number => ({ packageId: 'pkg', path: {} as never, curriculum: {} as never, levels: [], surah: { id: `surah-${number}`, surahNumber: number, ayahCount: 8 } as SurahRecord } satisfies AuthoredSurahSummary));
const repo = { listAyahRefsInDivision: () => [{ surahNumber: 87, ayahNumber: 1 }, { surahNumber: 93, ayahNumber: 2 }] };

test.each([
  [{ kind: 'surah', surahNumber: 93, key: '93' }, '/roadmap?focusSurah=surah-93'],
  [{ kind: 'ayah', surahNumber: 94, ayahNumber: 5, key: '94:5' }, '/surah/surah-94?focusAyah=5'],
  [{ kind: 'hizb', key: '60' }, '/surah/surah-93?focusAyah=2'],
])('resolves search result to exact authored roadmap target', (input, expected) => {
  expect(resolveRoadmapSearchTarget({ id: 'result', ...input } as QuranSearchResult, authored, repo as never)).toBe(expected);
});
