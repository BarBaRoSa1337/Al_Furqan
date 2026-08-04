import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  EXPECTED_AYAH_COUNTS,
  PREVIEW_SURAH_NUMBERS,
  QURANENC_REGISTRY_URLS,
  QURANENC_RESOURCES,
  QURANENC_SURAH_URLS,
} from '../packages/content-preview/src/constants';
import { parseQuranEncPayload, resolveQuranEncMetadata } from '../packages/content-preview/src/importer';
import type { SourceRetrievalEvidence } from '../packages/content-preview/src/types';

const ROOT = join(process.cwd(), 'packages/content-preview/source-inputs/quranenc');
const TIMEOUT_MS = 15_000;

async function main(): Promise<void> {
  for (const locale of ['en', 'fr'] as const) {
    const resource = QURANENC_RESOURCES[locale];
    const registryText = await fetchText(QURANENC_REGISTRY_URLS[locale]);
    const registry = parseJson(registryText, `QuranEnc ${locale} registry`);
    const metadata = resolveQuranEncMetadata(registry, resource.key, locale);
    const pending = new Map<string, { url: string; text: string }>();
    pending.set('metadata.json', { url: QURANENC_REGISTRY_URLS[locale], text: registryText });

    for (const surah of PREVIEW_SURAH_NUMBERS) {
      const url = QURANENC_SURAH_URLS[locale](surah);
      const text = await fetchText(url);
      const rows = parseQuranEncPayload(parseJson(text, `${resource.key} Surah ${surah}`), resource.key, surah);
      if (rows.length !== EXPECTED_AYAH_COUNTS[surah]) throw new Error(`${resource.key} Surah ${surah} ayah count mismatch.`);
      pending.set(`surahs/${surah}.json`, { url, text });
    }

    const retrievedAt = new Date().toISOString();
    const evidence: SourceRetrievalEvidence = {
      resourceKey: resource.key,
      registryUrl: QURANENC_REGISTRY_URLS[locale],
      version: metadata.version,
      lastUpdate: metadata.updateDate,
      retrievedAt,
      files: Object.fromEntries([...pending].map(([path, item]) => [path, { url: item.url, sha256: sha256(item.text) }])),
    };
    const resourceRoot = join(ROOT, resource.key);
    for (const [path, item] of pending) await writeRaw(join(resourceRoot, path), item.text);
    await writeRaw(join(resourceRoot, 'retrieval.json'), `${JSON.stringify(evidence, null, 2)}\n`);
    console.log(`Fetched ${resource.key} ${metadata.version}: Surahs 105-114, raw responses unchanged.`);
  }
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } });
    const text = await response.text();
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 240)}`);
    return text;
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError' ? `timed out after ${TIMEOUT_MS}ms` : error instanceof Error ? error.message : String(error);
    throw new Error(`Could not fetch ${url}: ${message}`);
  } finally {
    clearTimeout(timeout);
  }
}

function parseJson(text: string, label: string): unknown {
  try { return JSON.parse(text) as unknown; } catch (error) { throw new Error(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`); }
}

async function writeRaw(path: string, text: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text, 'utf8');
}

function sha256(value: string): string { return createHash('sha256').update(value).digest('hex'); }

void main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
