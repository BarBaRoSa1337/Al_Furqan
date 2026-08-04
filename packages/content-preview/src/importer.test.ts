import { validatePackage } from '../../../src/lib/content/packageValidator';
import { EXPECTED_AYAH_COUNTS, PREVIEW_SURAH_NUMBERS } from './constants';
import { buildPreviewPackages, getPackagePayloadJson, parseQuranEncPayload, parseTanzilText, resolveQuranEncMetadata } from './importer';

function inputs() {
  const tanzilText = PREVIEW_SURAH_NUMBERS.flatMap(surah => Array.from({ length: EXPECTED_AYAH_COUNTS[surah] }, (_, index) => `${surah}|${index + 1}|سُورَةُ ${surah}-${index + 1}`)).join('\n');
  const makeRows = (locale: string) => Object.fromEntries(PREVIEW_SURAH_NUMBERS.map(surah => [surah, { result: Array.from({ length: EXPECTED_AYAH_COUNTS[surah] }, (_, index) => ({ sura: String(surah), aya: String(index + 1), translation: `${locale}-${surah}-${index + 1}`, footnotes: `footnote-${locale}-${surah}-${index + 1}` })) }]));
  const metadata = (key: string) => [{ key, version: 'test-version', last_update: '2026-08-01', title: `${key} title`, description: `${key} transcript` }];
  const retrieval = (key: string) => ({ resourceKey: key, registryUrl: `https://quranenc.test/${key}`, version: 'test-version', lastUpdate: '2026-08-01', retrievedAt: '2026-08-04T00:00:00.000Z', files: {} });
  return { tanzilText, tanzilLicense: 'Creative Commons Attribution 3.0 (CC BY 3.0)', tanzilVersion: 'test-tanzil-v1', tanzilRetrievedAt: '2026-08-03T00:00:00.000Z', englishMetadata: metadata('english_rwwad'), englishSurahs: makeRows('en'), frenchMetadata: metadata('french_rashid'), frenchSurahs: makeRows('fr'), englishRetrieval: retrieval('english_rwwad'), frenchRetrieval: retrieval('french_rashid') };
}

test('preserves Tanzil ayah bytes and rejects duplicates', () => {
  const text = '105|1|  أَلَمْ  تَرَ  ';
  expect(Buffer.from(parseTanzilText(text).get('105:1')!)).toEqual(Buffer.from('  أَلَمْ  تَرَ  '));
  expect(() => parseTanzilText(`${text}\n${text}`)).toThrow('duplicate ayah 105:1');
});

test('preserves QuranEnc translation and footnotes unchanged', () => {
  const rows = parseQuranEncPayload({ result: Array.from({ length: 5 }, (_, index) => ({ sura: '105', aya: String(index + 1), translation: index === 0 ? '  exact translation  ' : `translation-${index + 1}`, footnotes: index === 0 ? ' exact footnote ' : '' })) }, 'english_rwwad', 105);
  expect(rows[0]).toEqual({ sura: '105', aya: '1', translation: '  exact translation  ', footnotes: ' exact footnote ' });
});

test('resolves real QuranEnc registry fields and rejects wrong keys', () => {
  const metadata = resolveQuranEncMetadata([{ key: 'english_rwwad', version: '1.0.19', last_update: '2026-03-12', title: 'Rowwad', description: 'Transcript' }], 'english_rwwad', 'en');
  expect(metadata).toMatchObject({ key: 'english_rwwad', version: '1.0.19', updateDate: '2026-03-12', title: 'Rowwad', description: 'Transcript' });
  expect(() => resolveQuranEncMetadata([], 'english_rwwad', 'en')).toThrow('does not contain resource');
});

test('generates locale-specific ten-Surah packages with permitted content only', () => {
  const result = buildPreviewPackages(inputs());
  for (const locale of ['en', 'fr'] as const) {
    const pkg = result.packages[locale];
    expect(pkg.surahs.map(surah => surah.surahNumber)).toEqual(PREVIEW_SURAH_NUMBERS);
    expect(pkg.ayat).toHaveLength(48);
    expect(pkg.levels).toHaveLength(68);
    expect(pkg.learningPaths[0].id).toBe('surah-al-fil-path-v1');
    expect(pkg.levels.map(level => level.id)).toContain('al-fil-level-final-review');
    expect(pkg.learningPaths[0].surahCurricula).toHaveLength(10);
    expect(pkg.recitationTracks).toHaveLength(0);
    expect(pkg.ayat.every(ayah => ayah.tafsirEntries.length === 0 && !ayah.wordMeanings)).toBe(true);
    expect(pkg.levels.flatMap(level => level.steps.flatMap(step => step.blocks)).some(block => block.type === 'activity' && block.activity.kind === 'match_ayah_translation')).toBe(true);
    expect(pkg.levels.flatMap(level => level.steps.flatMap(step => step.blocks)).some(block => block.type === 'summary' || block.type === 'context' || block.type === 'audio')).toBe(false);
    expect(validatePackage(pkg, { mode: 'development' }).valid).toBe(true);
    expect(validatePackage(pkg, { mode: 'production' }).valid).toBe(false);
  }
  expect(result.packages.en.revisionId).not.toBe(result.packages.fr.revisionId);
  expect(result.packages.en.ayat[0].translations[0].transcriptInfo).toBe('english_rwwad transcript');
  expect(result.packages.fr.levels.find(level => level.id === 'al-fil-level-1-context-ayah-1')?.steps[2].blocks[0]).toMatchObject({ type: 'activity', activity: { config: { correctOptionId: 'quranenc-french-rashid:105:1' } } });
});

test('serializes identical source packages deterministically', () => {
  const first = buildPreviewPackages(inputs());
  const second = buildPreviewPackages(inputs());
  expect(getPackagePayloadJson(first.packages.en)).toBe(getPackagePayloadJson(second.packages.en));
  expect(getPackagePayloadJson(first.packages.fr)).toBe(getPackagePayloadJson(second.packages.fr));
});
