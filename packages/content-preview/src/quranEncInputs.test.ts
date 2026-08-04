import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EXPECTED_AYAH_COUNTS, PREVIEW_SURAH_NUMBERS, QURANENC_RESOURCES } from './constants';
import { parseQuranEncPayload, resolveQuranEncMetadata } from './importer';
import type { SourceRetrievalEvidence } from './types';

const ROOT = join(process.cwd(), 'packages/content-preview/source-inputs/quranenc');

describe.each(['en', 'fr'] as const)('downloaded QuranEnc %s source', locale => {
  const resource = QURANENC_RESOURCES[locale];
  const resourceRoot = join(ROOT, resource.key);
  const read = (path: string) => readFileSync(join(resourceRoot, path), 'utf8');

  test('retains registry metadata, raw hashes, footnotes, and exact ayah coverage', () => {
    const metadataText = read('metadata.json');
    const metadata = resolveQuranEncMetadata(JSON.parse(metadataText), resource.key, locale);
    const evidence = JSON.parse(read('retrieval.json')) as SourceRetrievalEvidence;
    expect(evidence).toMatchObject({ resourceKey: resource.key, version: metadata.version, lastUpdate: metadata.updateDate });
    expect(evidence.files['metadata.json'].sha256).toBe(sha256(metadataText));
    PREVIEW_SURAH_NUMBERS.forEach(surah => {
      const path = `surahs/${surah}.json`;
      const raw = read(path);
      const rows = parseQuranEncPayload(JSON.parse(raw), resource.key, surah);
      expect(rows).toHaveLength(EXPECTED_AYAH_COUNTS[surah]);
      expect(rows.every(row => typeof row.footnotes === 'string')).toBe(true);
      expect(evidence.files[path].sha256).toBe(sha256(raw));
    });
  });
});

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
