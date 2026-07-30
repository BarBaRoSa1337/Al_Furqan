import { surahAlFilRecord } from '../../content/packages/surah-al-fil/v1';
import { parseDiscoveryQueryValue } from './discovery';

describe('parseDiscoveryQueryValue', () => {
  test.each([
    ['Al-Fil', { type: 'surah', surahNumber: 105 }],
    ['Surah 105', { type: 'surah', surahNumber: 105 }],
    ['105:1', { type: 'ayah', ayahRef: { surahNumber: 105, ayahNumber: 1 } }],
    ['105:1-5', { type: 'ayah_range', range: { start: { surahNumber: 105, ayahNumber: 1 }, end: { surahNumber: 105, ayahNumber: 5 } } }],
    ['Juz 30', { type: 'juz', number: 30 }],
    ['Hizb 60', { type: 'hizb', number: 60 }],
    ['Rub 240', { type: 'rub_el_hizb', number: 240 }],
  ])('parses %s as a Quran lookup', (query, lookup) => {
    expect(parseDiscoveryQueryValue(query, [surahAlFilRecord])).toEqual({
      query: { kind: 'quran_lookup', lookup },
      diagnostics: [],
    });
  });

  test('keeps unstructured terms as normalized taxonomy text', () => {
    expect(parseDiscoveryQueryValue('  Quran   STORIES ', [surahAlFilRecord]).query).toEqual({
      kind: 'text',
      normalizedText: 'quran stories',
    });
  });

  test.each(['Surah 115', '105:5-1', 'Juz 31', 'Rub 241'])('returns diagnostics for invalid structured query %s', query => {
    const result = parseDiscoveryQueryValue(query, [surahAlFilRecord]);
    expect(result.query.kind).toBe('empty');
    expect(result.diagnostics).not.toEqual([]);
  });
});
