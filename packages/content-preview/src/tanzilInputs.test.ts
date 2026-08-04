import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EXPECTED_AYAH_COUNTS, PREVIEW_SURAH_NUMBERS } from './constants';
import { parseTanzilMetadata, parseTanzilText } from './importer';

const ROOT = join(process.cwd(), 'packages/content-preview/source-inputs/tanzil');

test('retains official Tanzil text, license, provenance, and hashes', () => {
  const textBytes = readFileSync(join(ROOT, 'quran-uthmani.txt'));
  const licenseBytes = readFileSync(join(ROOT, 'LICENSE.txt'));
  const metadata = parseTanzilMetadata(JSON.parse(readFileSync(join(ROOT, 'metadata.json'), 'utf8')));
  const text = textBytes.toString('utf8');
  const license = licenseBytes.toString('utf8');
  const records = parseTanzilText(text);

  expect(metadata).toMatchObject({
    provider: 'Tanzil Project',
    textVersion: '1.1',
    textType: 'Uthmani',
    modificationAllowed: false,
  });
  expect(metadata.files['quran-uthmani.txt'].sha256).toBe(sha256(textBytes));
  expect(metadata.files['LICENSE.txt'].sha256).toBe(sha256(licenseBytes));
  expect(license).toContain('Creative Commons Attribution 3.0');
  expect(license).toContain('CHANGING IT IS NOT ALLOWED');
  expect(records.size).toBe(6_236);
  PREVIEW_SURAH_NUMBERS.forEach(surah => {
    expect(Array.from({ length: EXPECTED_AYAH_COUNTS[surah] }, (_, index) => records.has(`${surah}:${index + 1}`)).every(Boolean)).toBe(true);
  });
});

function sha256(value: Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}
