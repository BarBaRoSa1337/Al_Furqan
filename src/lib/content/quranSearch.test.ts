import { isQuranSearchResponse } from '../../../packages/api-contracts/src';
import { getContentRepository } from './repository';
import { buildQuranSearchUrl, searchLocalQuran } from './quranSearch';

test('builds encoded Furqan backend search URL', () => {
  expect(buildQuranSearchUrl('https://api.example', '105:1 نور', 'ar')).toBe('https://api.example/v1/quran/search?q=105%3A1+%D9%86%D9%88%D8%B1&language=ar');
});

test('searches active package references and canonical Arabic without hardcoded results', () => {
  const repo = getContentRepository();
  expect(searchLocalQuran(repo, '105:1')[0]).toMatchObject({ kind: 'ayah', key: '105:1', arabicText: expect.any(String) });
  expect(searchLocalQuran(repo, 'أَلَمْ')[0]).toMatchObject({ kind: 'ayah', surahNumber: 105, ayahNumber: 1 });
  expect(searchLocalQuran(repo, 'Al-Fil')[0]).toMatchObject({ kind: 'surah', displayName: 'Al-Fil' });
});

test('rejects malformed search response shapes', () => {
  expect(isQuranSearchResponse({ query: 'x', source: 'quran-foundation', results: [{ kind: 'ayah' }] })).toBe(false);
});
