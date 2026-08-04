import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { PREVIEW_GENERATOR_VERSION, PREVIEW_PACKAGE_ID, PREVIEW_SURAH_NUMBERS, QURANENC_RESOURCES, TANZIL_LICENSE_URL, TANZIL_SOURCE_URL } from '../packages/content-preview/src/constants';
import { buildPreviewPackages } from '../packages/content-preview/src/importer';
import type { PreviewSourceInputs, QuranEncResourceMetadata, SourceRetrievalEvidence } from '../packages/content-preview/src/types';
import { getPackagePayloadHash, stableStringify } from '../src/lib/content/governance';

const ROOT = process.cwd();
const INPUT_ROOT = join(ROOT, 'packages/content-preview/source-inputs');
const GENERATED_ROOT = join(ROOT, 'packages/content-preview/generated');
const RUNTIME_ROOT = join(ROOT, 'src/content/local-preview');

async function main(): Promise<void> {
  const files = await readSourceFiles();
  const englishRetrieval = parseRetrieval(files.get('quranenc/english_rwwad/retrieval.json')!, 'english_rwwad');
  const frenchRetrieval = parseRetrieval(files.get('quranenc/french_rashid/retrieval.json')!, 'french_rashid');
  verifyRetrievalHashes(files, 'quranenc/english_rwwad', englishRetrieval);
  verifyRetrievalHashes(files, 'quranenc/french_rashid', frenchRetrieval);
  const inputs: PreviewSourceInputs = {
    tanzilText: files.get('tanzil/quran-uthmani.txt')!,
    tanzilLicense: files.get('tanzil/LICENSE.txt')!,
    tanzilVersion: requireEnv('TANZIL_SOURCE_VERSION'),
    tanzilRetrievedAt: requireIsoEnv('TANZIL_RETRIEVED_AT'),
    englishMetadata: parseJson(files.get('quranenc/english_rwwad/metadata.json')!, 'english_rwwad metadata'),
    englishSurahs: readSurahInputs(files, 'english_rwwad'),
    frenchMetadata: parseJson(files.get('quranenc/french_rashid/metadata.json')!, 'french_rashid metadata'),
    frenchSurahs: readSurahInputs(files, 'french_rashid'),
    englishRetrieval,
    frenchRetrieval,
    sourceFileHashes: Object.fromEntries([...files].map(([path, content]) => [path, sha256(content)])),
  };
  const result = buildPreviewPackages(inputs);
  const bundle = { schemaVersion: 1, contentMode: 'preview', packages: result.packages } as const;
  const bundleJson = `${stableStringify(bundle)}\n`;
  const integrity = {
    schemaVersion: 1,
    packageId: PREVIEW_PACKAGE_ID,
    revisions: { en: result.packages.en.revisionId, fr: result.packages.fr.revisionId },
    payloadSha256: { en: getPackagePayloadHash(result.packages.en), fr: getPackagePayloadHash(result.packages.fr) },
  };
  const integrityJson = `${JSON.stringify(integrity, null, 2)}\n`;
  const generatedBundlePath = join(GENERATED_ROOT, 'packages.json');
  const runtimeBundlePath = join(RUNTIME_ROOT, 'surahs-105-114.preview.json');
  const runtimeIntegrityPath = join(RUNTIME_ROOT, 'surahs-105-114.preview.sha256.json');
  await mkdir(GENERATED_ROOT, { recursive: true });
  await mkdir(RUNTIME_ROOT, { recursive: true });
  await writeFile(generatedBundlePath, bundleJson, 'utf8');
  await writeFile(runtimeBundlePath, bundleJson, 'utf8');
  await writeFile(runtimeIntegrityPath, integrityJson, 'utf8');

  const generatedFiles = await fileHashes([generatedBundlePath, runtimeBundlePath, runtimeIntegrityPath]);
  const generatedAt = latestDate(inputs.tanzilRetrievedAt, englishRetrieval.retrievedAt, frenchRetrieval.retrievedAt);
  const manifest = {
    packageId: PREVIEW_PACKAGE_ID,
    packageSchemaVersion: result.packages.en.schemaVersion,
    bundleSchemaVersion: 1,
    generatedAt,
    contentMode: 'preview',
    locales: ['en', 'fr'],
    includedSurahs: PREVIEW_SURAH_NUMBERS.map(surah => ({ surah, ayahCount: result.packages.en.surahs.find(item => item.surahNumber === surah)!.ayahCount })),
    sources: [
      { provider: 'tanzil', sourceUrl: TANZIL_SOURCE_URL, licenseUrl: TANZIL_LICENSE_URL, resourceKey: 'quran-uthmani.txt', version: inputs.tanzilVersion, retrievalDate: inputs.tanzilRetrievedAt, attributionText: 'Tanzil Quran Text. Copyright Tanzil Project. Licensed under CC BY 3.0.', licenseIdentifier: 'CC BY 3.0', inputFileSha256: { text: inputs.sourceFileHashes!['tanzil/quran-uthmani.txt'], license: inputs.sourceFileHashes!['tanzil/LICENSE.txt'] } },
      quranEncManifestSource(result.sourceMetadata.english, englishRetrieval, inputs.sourceFileHashes!),
      quranEncManifestSource(result.sourceMetadata.french, frenchRetrieval, inputs.sourceFileHashes!),
    ],
    sourceInputFileSha256: inputs.sourceFileHashes,
    generatedFiles,
    generatorVersion: PREVIEW_GENERATOR_VERSION,
    checksumMeaning: 'Artifact integrity only; not editorial or Islamic approval.',
  };
  const manifestPath = join(GENERATED_ROOT, 'manifest.json');
  const manifestJson = `${stableStringify(manifest)}\n`;
  await writeFile(manifestPath, manifestJson, 'utf8');
  await writeFile(join(GENERATED_ROOT, 'manifest.sha256.json'), `${JSON.stringify({ path: relative(ROOT, manifestPath), sha256: sha256(manifestJson) }, null, 2)}\n`, 'utf8');
  console.log(`Generated English/French ${PREVIEW_PACKAGE_ID}: 10 Surahs, ${result.packages.en.ayat.length} ayat, 68 nodes.`);
}

async function readSourceFiles(): Promise<Map<string, string>> {
  const paths = ['tanzil/quran-uthmani.txt', 'tanzil/LICENSE.txt', ...(['en', 'fr'] as const).flatMap(locale => {
    const key = QURANENC_RESOURCES[locale].key;
    return [`quranenc/${key}/metadata.json`, `quranenc/${key}/retrieval.json`, ...PREVIEW_SURAH_NUMBERS.map(surah => `quranenc/${key}/surahs/${surah}.json`)];
  })];
  const files = new Map<string, string>();
  for (const path of paths) files.set(path, await readRequired(join(INPUT_ROOT, path)));
  return files;
}

function readSurahInputs(files: Map<string, string>, key: string): Record<number, unknown> {
  return Object.fromEntries(PREVIEW_SURAH_NUMBERS.map(surah => [surah, parseJson(files.get(`quranenc/${key}/surahs/${surah}.json`)!, `${key} Surah ${surah}`)]));
}

function parseRetrieval(text: string, expectedKey: string): SourceRetrievalEvidence {
  const value = parseJson(text, `${expectedKey} retrieval evidence`);
  if (!isRecord(value) || value.resourceKey !== expectedKey || typeof value.version !== 'string' || (typeof value.lastUpdate !== 'string' && typeof value.lastUpdate !== 'number') || typeof value.retrievedAt !== 'string' || typeof value.registryUrl !== 'string' || !isRecord(value.files)) {
    throw new Error(`QuranEnc retrieval evidence is malformed for ${expectedKey}.`);
  }
  return value as unknown as SourceRetrievalEvidence;
}

function verifyRetrievalHashes(files: Map<string, string>, root: string, evidence: SourceRetrievalEvidence): void {
  Object.entries(evidence.files).forEach(([path, record]) => {
    const content = files.get(`${root}/${path}`);
    if (content === undefined) throw new Error(`QuranEnc retrieval evidence references missing file ${root}/${path}.`);
    if (record.sha256 !== sha256(content)) throw new Error(`QuranEnc raw response hash mismatch: ${root}/${path}.`);
  });
}

function quranEncManifestSource(metadata: QuranEncResourceMetadata, retrieval: SourceRetrievalEvidence, hashes: Record<string, string>) {
  const root = `quranenc/${metadata.key}`;
  return { provider: 'quranenc', sourceUrl: 'https://quranenc.com/nqo/home/api', resourceKey: metadata.key, version: metadata.version, retrievalDate: retrieval.retrievedAt, lastUpdate: metadata.updateDate, title: metadata.title, transcriptInfo: metadata.description, publisher: metadata.publisher, attributionText: metadata.attributionText, licenseIdentifier: 'QuranEnc published republication conditions', inputFileSha256: Object.fromEntries(Object.keys(retrieval.files).map(path => [path, hashes[`${root}/${path}`]])) };
}

async function fileHashes(paths: string[]): Promise<{ path: string; sha256: string }[]> {
  return Promise.all(paths.map(async path => ({ path: relative(ROOT, path), sha256: sha256(await readFile(path)) })));
}

async function readRequired(path: string): Promise<string> {
  try { return await readFile(path, 'utf8'); } catch { throw new Error(`Missing required local preview input: ${relative(ROOT, path)}.`); }
}

function parseJson(text: string, label: string): unknown {
  try { return JSON.parse(text) as unknown; } catch (error) { throw new Error(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`); }
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required to record Tanzil provenance.`);
  return value;
}

function requireIsoEnv(name: string): string {
  const value = requireEnv(name);
  if (!Number.isFinite(new Date(value).getTime())) throw new Error(`${name} must be an ISO date.`);
  return value;
}

function latestDate(...values: string[]): string {
  return new Date(Math.max(...values.map(value => new Date(value).getTime()))).toISOString();
}

function sha256(value: string | Uint8Array): string { return createHash('sha256').update(value).digest('hex'); }
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }

void main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
