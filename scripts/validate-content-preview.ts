import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { EXPECTED_AYAH_COUNTS, PREVIEW_SURAH_NUMBERS, QURANENC_RESOURCES } from '../packages/content-preview/src/constants';
import { buildPreviewPackages, parseTanzilMetadata } from '../packages/content-preview/src/importer';
import type { PreviewAudioInputs, PreviewSourceInputs, SourceRetrievalEvidence, TanzilSourceMetadata } from '../packages/content-preview/src/types';
import { validatePackage } from '../src/lib/content/packageValidator';

const ROOT = process.cwd();
const INPUT_ROOT = join(ROOT, 'packages/content-preview/source-inputs');

async function main(): Promise<void> {
  const read = async (path: string) => readRequired(join(INPUT_ROOT, path));
  const englishRetrieval = parseRetrieval(await read('quranenc/english_rwwad/retrieval.json'), 'english_rwwad');
  const frenchRetrieval = parseRetrieval(await read('quranenc/french_rashid/retrieval.json'), 'french_rashid');
  const englishMokhtasarRetrieval = parseRetrieval(await read('quranenc/english_mokhtasar/retrieval.json'), 'english_mokhtasar');
  const tanzilMetadata = parseTanzilMetadata(JSON.parse(await read('tanzil/metadata.json')));
  const quranFoundationRetrieval = parseRetrieval(await read('quranfoundation/retrieval.json'), 'quranfoundation');
  const wordMeanings: Record<string, unknown> = {};
  for (const surah of PREVIEW_SURAH_NUMBERS) {
    for (let ayah = 1; ayah <= EXPECTED_AYAH_COUNTS[surah]; ayah += 1) {
      const key = `${surah}:${ayah}`;
      wordMeanings[key] = JSON.parse(await read(`quranfoundation/word-meanings/${key}.json`));
    }
  }

  const inputs: PreviewSourceInputs = {
    tanzilText: await read('tanzil/quran-uthmani.txt'),
    tanzilLicense: await read('tanzil/LICENSE.txt'),
    tanzilMetadata,
    englishMetadata: JSON.parse(await read('quranenc/english_rwwad/metadata.json')),
    englishSurahs: await readSurahs(read, QURANENC_RESOURCES.en.key),
    frenchMetadata: JSON.parse(await read('quranenc/french_rashid/metadata.json')),
    frenchSurahs: await readSurahs(read, QURANENC_RESOURCES.fr.key),
    englishMokhtasarMetadata: JSON.parse(await read('quranenc/english_mokhtasar/metadata.json')),
    englishMokhtasarSurahs: await readSurahs(read, 'english_mokhtasar'),
    audio: JSON.parse(await read('mp3quran/husary-118/streams.json')) as PreviewAudioInputs,
    englishRetrieval,
    frenchRetrieval,
    englishMokhtasarRetrieval,
    quranFoundationRetrieval,
    wordMeanings,
  };
  await verifyTanzilEvidence(read, tanzilMetadata);
  await verifyEvidence(read, englishRetrieval, 'quranenc/english_rwwad');
  await verifyEvidence(read, frenchRetrieval, 'quranenc/french_rashid');
  await verifyEvidence(read, englishMokhtasarRetrieval, 'quranenc/english_mokhtasar');
  const result = buildPreviewPackages(inputs);
  for (const locale of ['en', 'fr'] as const) {
    const pkg = result.packages[locale];
    const development = validatePackage(pkg, { mode: 'development' });
    if (!development.valid) throw new Error(`${locale} preview package invalid: ${development.errors.join('; ')}`);
    if (validatePackage(pkg, { mode: 'production' }).valid) throw new Error(`${locale} preview package unexpectedly passes production validation.`);
    const expectedAyat = PREVIEW_SURAH_NUMBERS.reduce((total, surah) => total + EXPECTED_AYAH_COUNTS[surah], 0);
    const expectedLevels = expectedAyat + (PREVIEW_SURAH_NUMBERS.length * 2);
    if (pkg.ayat.length !== expectedAyat || pkg.recitationTracks.length !== expectedAyat || pkg.learningPaths[0]?.surahCurricula?.length !== PREVIEW_SURAH_NUMBERS.length || pkg.levels.length !== expectedLevels) throw new Error(`${locale} preview coverage is incomplete.`);
  }
  console.log(`Validated English/French local preview: ${PREVIEW_SURAH_NUMBERS.length} Surahs, ${PREVIEW_SURAH_NUMBERS.reduce((total, surah) => total + EXPECTED_AYAH_COUNTS[surah], 0)} ayat. Production still blocked.`);
}

async function verifyTanzilEvidence(read: (path: string) => Promise<string>, metadata: TanzilSourceMetadata): Promise<void> {
  for (const path of ['quran-uthmani.txt', 'LICENSE.txt'] as const) {
    const content = await read(`tanzil/${path}`);
    if (sha256(content) !== metadata.files[path].sha256) throw new Error(`Raw source hash mismatch: tanzil/${path}.`);
  }
}

async function readSurahs(read: (path: string) => Promise<string>, key: string): Promise<Record<number, unknown>> {
  return Object.fromEntries(await Promise.all(PREVIEW_SURAH_NUMBERS.map(async surah => [surah, JSON.parse(await read(`quranenc/${key}/surahs/${surah}.json`))])));
}

async function verifyEvidence(read: (path: string) => Promise<string>, evidence: SourceRetrievalEvidence, root: string): Promise<void> {
  for (const [path, record] of Object.entries(evidence.files)) {
    const content = await read(`${root}/${path}`);
    if (sha256(content) !== record.sha256) throw new Error(`Raw source hash mismatch: ${root}/${path}.`);
  }
}

function parseRetrieval(text: string, key: string): SourceRetrievalEvidence {
  const value = JSON.parse(text) as Partial<SourceRetrievalEvidence>;
  if (value.resourceKey !== key || !value.version || !value.lastUpdate || !value.retrievedAt || !value.files) throw new Error(`Malformed retrieval evidence for ${key}.`);
  return value as SourceRetrievalEvidence;
}

async function readRequired(path: string): Promise<string> {
  try { return await readFile(path, 'utf8'); } catch { throw new Error(`Missing required local preview input: ${relative(ROOT, path)}.`); }
}

function sha256(value: string): string { return createHash('sha256').update(value).digest('hex'); }

void main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
