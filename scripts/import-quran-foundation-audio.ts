import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_API_BASE = 'https://api.quran.com/api/v4';
const RECITER_RESOURCE_ID = 6;
const RECITER_ID = 'mahmoud-khalil-al-husary';

interface ProviderReciter {
  id: number;
  reciter_name: string;
  style: string | null;
}

interface ProviderAudio {
  verse_key: string;
  url: string;
  duration?: number;
}

async function main() {
  const apiBase = process.env.QURAN_API_BASE ?? DEFAULT_API_BASE;
  const chapter = Number(process.argv[2] ?? 105);
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > 114) {
    throw new Error(`Invalid Surah number "${process.argv[2]}"`);
  }
  const reciters = await getJson<{ recitations: ProviderReciter[] }>(`${apiBase}/resources/recitations?language=en`);
  const reciter = reciters.recitations.find(candidate => candidate.id === RECITER_RESOURCE_ID);
  if (!reciter || !/husary/i.test(reciter.reciter_name) || reciter.style) {
    throw new Error('Quran Foundation resource 6 is no longer the expected Al-Husary murattal recitation');
  }
  const response = await getJson<{ audio_files: ProviderAudio[] }>(
    `${apiBase}/recitations/${RECITER_RESOURCE_ID}/by_chapter/${chapter}`,
  );
  if (response.audio_files.length === 0) throw new Error(`No recitation files returned for Surah ${chapter}`);

  const tracks = [];
  for (const audio of response.audio_files) {
    const uri = audio.url.startsWith('//') ? `https:${audio.url}` : audio.url;
    const download = await fetchWithRetry(uri);
    const bytes = new Uint8Array(await download.arrayBuffer());
    tracks.push({
      verseKey: audio.verse_key,
      providerResourceId: `${RECITER_RESOURCE_ID}:${audio.verse_key}`,
      uri,
      ...(typeof audio.duration === 'number' ? { durationMs: Math.round(audio.duration * 1000) } : {}),
      byteSize: bytes.byteLength,
      checksum: createHash('sha256').update(bytes).digest('hex'),
      format: 'mp3',
    });
  }
  tracks.sort((a, b) => Number(a.verseKey.split(':')[1]) - Number(b.verseKey.split(':')[1]));
  const retrievedAt = new Date().toISOString();
  const manifest = {
    source: {
      id: 'quran-foundation-husary-audio-v4',
      version: `content-api-v4-resource-${RECITER_RESOURCE_ID}-${retrievedAt.slice(0, 10)}`,
      endpoint: apiBase,
      retrievedAt,
    },
    editionId: 'hafs-an-asim',
    reciter: {
      id: RECITER_ID,
      displayName: reciter.reciter_name,
      providerResourceId: String(reciter.id),
    },
    tracks,
  };
  const outputPath = resolve(
    process.cwd(),
    process.argv[3] ?? `src/content/audio/hafs/husary-surah-${chapter}.json`,
  );
  writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${tracks.length} checksum-verified tracks to ${outputPath}`);
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetchWithRetry(url, providerHeaders());
  return await response.json() as T;
}

async function fetchWithRetry(url: string, headers: Record<string, string> = {}): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise(resolveDelay => setTimeout(resolveDelay, attempt * 500));
    }
  }
  throw new Error(`Quran Foundation request failed for ${url}: ${String(lastError)}`);
}

function providerHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (process.env.QF_ACCESS_TOKEN) headers['x-auth-token'] = process.env.QF_ACCESS_TOKEN;
  if (process.env.QF_CLIENT_ID) headers['x-client-id'] = process.env.QF_CLIENT_ID;
  return headers;
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
