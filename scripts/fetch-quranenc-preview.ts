import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  EXPECTED_AYAH_COUNTS,
  MP3QURAN_PERMISSION_URL,
  PREVIEW_SURAH_NUMBERS,
  QURANENC_REGISTRY_URLS,
  QURANENC_RESOURCES,
  QURANENC_SURAH_URLS,
  TANZIL_ATTRIBUTION,
  TANZIL_DOWNLOAD_OPTIONS,
  TANZIL_DOWNLOAD_URL,
  TANZIL_LICENSE_RAW_URL,
  TANZIL_LICENSE_URL,
  TANZIL_SOURCE_URL,
  TANZIL_TEXT_TYPE,
  TANZIL_TEXT_VERSION,
} from '../packages/content-preview/src/constants';
import { Mp3QuranClient } from '../apps/server/src/mp3Quran';
import {
  parseQuranEncPayload,
  parseTanzilText,
  resolveQuranEncMetadata,
} from '../packages/content-preview/src/importer';
import { assertTanzilTermsAccepted } from '../packages/content-preview/src/sourcePolicy';
import type {
  SourceRetrievalEvidence,
  TanzilSourceMetadata,
} from '../packages/content-preview/src/types';

const INPUT_ROOT = join(process.cwd(), 'packages/content-preview/source-inputs');
const QURANENC_ROOT = join(INPUT_ROOT, 'quranenc');
const TANZIL_ROOT = join(INPUT_ROOT, 'tanzil');
const MP3QURAN_ROOT = join(INPUT_ROOT, 'mp3quran/husary-118');
const TIMEOUT_MS = 20_000;
const EXPECTED_QURAN_AYAH_COUNT = 6_236;

async function main(): Promise<void> {
  const quranEncOnly = process.argv.includes('--quranenc-only');
  if (!quranEncOnly) {
    assertTanzilTermsAccepted(process.env.TANZIL_TERMS_ACCEPTED);
    await fetchTanzilInputs();
  }
  await fetchQuranEncInputs();
  if (!quranEncOnly) await fetchMp3QuranInputs();
}

async function fetchMp3QuranInputs(): Promise<void> {
  const client = new Mp3QuranClient();
  const streams = [];
  for (const surah of PREVIEW_SURAH_NUMBERS) {
    const stream = await client.resolveHusaryHafs(surah);
    if (stream.segments.length !== EXPECTED_AYAH_COUNTS[surah]) {
      throw new Error(`MP3Quran Surah ${surah} timing count mismatch.`);
    }
    streams.push(stream);
  }
  const payload = {
    retrievedAt: new Date().toISOString(),
    permissionEvidenceUrl: MP3QURAN_PERMISSION_URL,
    streams,
  };
  await writeRaw(join(MP3QURAN_ROOT, 'streams.json'), `${JSON.stringify(payload, null, 2)}\n`);
  console.log('Fetched MP3Quran Al-Husary Hafs stream metadata: Surahs 105-114, 48 ayah segments, no audio persisted.');
}

async function fetchTanzilInputs(): Promise<void> {
  const [textBody, licenseBody] = await Promise.all([
    fetchBytes(TANZIL_DOWNLOAD_URL, 'text/plain'),
    fetchBytes(TANZIL_LICENSE_RAW_URL, 'text/plain'),
  ]);
  const text = decodeUtf8(textBody, 'Tanzil Uthmani Quran text');
  const license = decodeUtf8(licenseBody, 'Tanzil Text License');
  validateTanzilText(text);
  validateTanzilLicense(license);

  const metadata: TanzilSourceMetadata = {
    schemaVersion: 1,
    provider: 'Tanzil Project',
    textVersion: TANZIL_TEXT_VERSION,
    textType: TANZIL_TEXT_TYPE,
    sourceUrl: TANZIL_SOURCE_URL,
    downloadUrl: TANZIL_DOWNLOAD_URL,
    licenseUrl: TANZIL_LICENSE_URL,
    retrievedAt: new Date().toISOString(),
    attributionText: TANZIL_ATTRIBUTION,
    modificationAllowed: false,
    downloadOptions: { ...TANZIL_DOWNLOAD_OPTIONS },
    files: {
      'quran-uthmani.txt': { url: TANZIL_DOWNLOAD_URL, sha256: sha256(textBody) },
      'LICENSE.txt': { url: TANZIL_LICENSE_RAW_URL, sha256: sha256(licenseBody) },
    },
  };

  await Promise.all([
    writeRaw(join(TANZIL_ROOT, 'quran-uthmani.txt'), textBody),
    writeRaw(join(TANZIL_ROOT, 'LICENSE.txt'), licenseBody),
    writeRaw(join(TANZIL_ROOT, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`),
  ]);
  console.log(`Fetched Tanzil ${TANZIL_TEXT_VERSION} ${TANZIL_TEXT_TYPE}: ${EXPECTED_QURAN_AYAH_COUNT} ayat, raw text unchanged.`);
}

async function fetchQuranEncInputs(): Promise<void> {
  for (const locale of ['en', 'fr'] as const) {
    const resource = QURANENC_RESOURCES[locale];
    const registryBody = await fetchBytes(QURANENC_REGISTRY_URLS[locale], 'application/json');
    const registryText = decodeUtf8(registryBody, `QuranEnc ${locale} registry`);
    const registry = parseJson(registryText, `QuranEnc ${locale} registry`);
    const metadata = resolveQuranEncMetadata(registry, resource.key, locale);
    const pending = new Map<string, { url: string; body: Buffer }>();
    pending.set('metadata.json', { url: QURANENC_REGISTRY_URLS[locale], body: registryBody });

    for (const surah of PREVIEW_SURAH_NUMBERS) {
      const url = QURANENC_SURAH_URLS[locale](surah);
      const body = await fetchBytes(url, 'application/json');
      const text = decodeUtf8(body, `${resource.key} Surah ${surah}`);
      const rows = parseQuranEncPayload(parseJson(text, `${resource.key} Surah ${surah}`), resource.key, surah);
      if (rows.length !== EXPECTED_AYAH_COUNTS[surah]) throw new Error(`${resource.key} Surah ${surah} ayah count mismatch.`);
      pending.set(`surahs/${surah}.json`, { url, body });
    }

    const evidence: SourceRetrievalEvidence = {
      resourceKey: resource.key,
      registryUrl: QURANENC_REGISTRY_URLS[locale],
      version: metadata.version,
      lastUpdate: metadata.updateDate,
      retrievedAt: new Date().toISOString(),
      files: Object.fromEntries([...pending].map(([path, item]) => [path, { url: item.url, sha256: sha256(item.body) }])),
    };
    const resourceRoot = join(QURANENC_ROOT, resource.key);
    await Promise.all([
      ...[...pending].map(([path, item]) => writeRaw(join(resourceRoot, path), item.body)),
      writeRaw(join(resourceRoot, 'retrieval.json'), `${JSON.stringify(evidence, null, 2)}\n`),
    ]);
    console.log(`Fetched ${resource.key} ${metadata.version}: Surahs 105-114, raw responses unchanged.`);
  }
}

function validateTanzilText(text: string): void {
  if (/<!doctype|<html/i.test(text)) throw new Error('Tanzil download returned HTML instead of Quran text.');
  const records = parseTanzilText(text);
  if (records.size !== EXPECTED_QURAN_AYAH_COUNT) {
    throw new Error(`Tanzil Uthmani input must contain ${EXPECTED_QURAN_AYAH_COUNT} unique ayat; received ${records.size}.`);
  }
  for (const surah of PREVIEW_SURAH_NUMBERS) {
    for (let ayah = 1; ayah <= EXPECTED_AYAH_COUNTS[surah]; ayah += 1) {
      if (!records.has(`${surah}:${ayah}`)) throw new Error(`Tanzil Uthmani input is missing ayah ${surah}:${ayah}.`);
    }
  }
}

function validateTanzilLicense(license: string): void {
  const required = [
    'Tanzil Quran Text',
    'Copyright (C) 2007-2021 Tanzil Project',
    'Creative Commons Attribution 3.0',
    'CHANGING IT IS NOT ALLOWED',
  ];
  const missing = required.find(text => !license.includes(text));
  if (missing) throw new Error(`Tanzil license response is incomplete; missing "${missing}".`);
}

async function fetchBytes(url: string, accept: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept } });
    const body = Buffer.from(await response.arrayBuffer());
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${body.toString('utf8', 0, 240)}`);
    return body;
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? `timed out after ${TIMEOUT_MS}ms`
      : error instanceof Error ? error.message : String(error);
    throw new Error(`Could not fetch ${url}: ${message}`);
  } finally {
    clearTimeout(timeout);
  }
}

function decodeUtf8(body: Buffer, label: string): string {
  const text = body.toString('utf8');
  if (Buffer.from(text, 'utf8').compare(body) !== 0) throw new Error(`${label} is not valid canonical UTF-8.`);
  return text;
}

function parseJson(text: string, label: string): unknown {
  try { return JSON.parse(text) as unknown; } catch (error) { throw new Error(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`); }
}

async function writeRaw(path: string, value: string | Uint8Array): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value);
}

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

void main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
