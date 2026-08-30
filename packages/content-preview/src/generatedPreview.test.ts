import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EXPECTED_AYAH_COUNTS, PREVIEW_SURAH_NUMBERS } from './constants';
import { parseTanzilText } from './importer';

const ROOT = process.cwd();

test('generated bundle preserves source ayat and covers every manifest output', () => {
  const sourceText = readFileSync(join(ROOT, 'packages/content-preview/source-inputs/tanzil/quran-uthmani.txt'), 'utf8');
  const sourceAyat = parseTanzilText(sourceText);
  const bundle = JSON.parse(readFileSync(join(ROOT, 'packages/content-preview/generated/packages.json'), 'utf8'));
  const manifestPath = join(ROOT, 'packages/content-preview/generated/manifest.json');
  const manifestBytes = readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const manifestSidecar = JSON.parse(readFileSync(join(ROOT, 'packages/content-preview/generated/manifest.sha256.json'), 'utf8'));

  expect(manifest.includedSurahs).toEqual(PREVIEW_SURAH_NUMBERS.map(surah => ({ surah, ayahCount: EXPECTED_AYAH_COUNTS[surah] })));
  expect(manifest.sources[0]).toMatchObject({ provider: 'Tanzil Project', version: '1.1', textType: 'Uthmani', modificationAllowed: false });
  for (const locale of ['en', 'fr'] as const) {
    expect(bundle.packages[locale].surahs).toHaveLength(22);
    expect(bundle.packages[locale].ayat).toHaveLength(157);
    expect(bundle.packages[locale].recitationTracks).toHaveLength(157);
    expect(bundle.packages[locale].recitationTracks.every((track: { deliveryMode: string }) => track.deliveryMode === 'stream_only')).toBe(true);
    bundle.packages[locale].ayat.forEach((ayah: { ref: { surahNumber: number; ayahNumber: number }; arabicText: { text: string } }) => {
      let expectedText = sourceAyat.get(`${ayah.ref.surahNumber}:${ayah.ref.ayahNumber}`)!;
      const BASMALA_PREFIX = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ ';
      if (ayah.ref.ayahNumber === 1 && ayah.ref.surahNumber !== 1 && ayah.ref.surahNumber !== 9 && expectedText.startsWith(BASMALA_PREFIX)) {
        expectedText = expectedText.substring(BASMALA_PREFIX.length);
      }
      expect(ayah.arabicText.text).toBe(expectedText);
    });
  }
  expect(manifest.sources).toEqual(expect.arrayContaining([expect.objectContaining({ provider: 'MP3Quran.net', resourceKey: 'reciter-118:mushaf-118:riwayah-1' })]));
  manifest.generatedFiles.forEach((file: { path: string; sha256: string }) => {
    expect(sha256(readFileSync(join(ROOT, file.path)))).toBe(file.sha256);
  });
  expect(manifest.generatedFiles.map((file: { path: string }) => file.path).sort()).toEqual([
    'packages/content-preview/generated/packages.json',
    'src/content/local-preview/surahs-93-114.preview.json',
    'src/content/local-preview/surahs-93-114.preview.sha256.json',
  ]);
  expect(manifestSidecar).toEqual({ path: 'packages/content-preview/generated/manifest.json', sha256: sha256(manifestBytes) });
});

function sha256(value: Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}
