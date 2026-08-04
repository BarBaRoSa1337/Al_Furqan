import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { PREVIEW_SURAH_NUMBERS, QURANENC_RESOURCES } from '../packages/content-preview/src/constants';
import { buildPreviewPackages } from '../packages/content-preview/src/importer';
import type { PreviewSourceInputs, SourceRetrievalEvidence } from '../packages/content-preview/src/types';
import { validatePackage } from '../src/lib/content/packageValidator';

const ROOT = process.cwd();
const INPUT_ROOT = join(ROOT, 'packages/content-preview/source-inputs');

async function main(): Promise<void> {
  const read = async (path: string) => readRequired(join(INPUT_ROOT, path));
  const englishRetrieval = parseRetrieval(await read('quranenc/english_rwwad/retrieval.json'), 'english_rwwad');
  const frenchRetrieval = parseRetrieval(await read('quranenc/french_rashid/retrieval.json'), 'french_rashid');
  const inputs: PreviewSourceInputs = {
    tanzilText: await read('tanzil/quran-uthmani.txt'),
    tanzilLicense: await read('tanzil/LICENSE.txt'),
    tanzilVersion: requireEnv('TANZIL_SOURCE_VERSION'),
    tanzilRetrievedAt: requireEnv('TANZIL_RETRIEVED_AT'),
    englishMetadata: JSON.parse(await read('quranenc/english_rwwad/metadata.json')),
    englishSurahs: await readSurahs(read, QURANENC_RESOURCES.en.key),
    frenchMetadata: JSON.parse(await read('quranenc/french_rashid/metadata.json')),
    frenchSurahs: await readSurahs(read, QURANENC_RESOURCES.fr.key),
    englishRetrieval,
    frenchRetrieval,
  };
  await verifyEvidence(read, englishRetrieval, 'quranenc/english_rwwad');
  await verifyEvidence(read, frenchRetrieval, 'quranenc/french_rashid');
  const result = buildPreviewPackages(inputs);
  for (const locale of ['en', 'fr'] as const) {
    const pkg = result.packages[locale];
    const development = validatePackage(pkg, { mode: 'development' });
    if (!development.valid) throw new Error(`${locale} preview package invalid: ${development.errors.join('; ')}`);
    if (validatePackage(pkg, { mode: 'production' }).valid) throw new Error(`${locale} preview package unexpectedly passes production validation.`);
    if (pkg.ayat.length !== 48 || pkg.learningPaths[0]?.surahCurricula?.length !== 10 || pkg.levels.length !== 68) throw new Error(`${locale} preview coverage is incomplete.`);
  }
  console.log('Validated English/French local preview: 10 Surahs, 48 ayat, 68 nodes. Production still blocked.');
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

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function sha256(value: string): string { return createHash('sha256').update(value).digest('hex'); }

void main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
