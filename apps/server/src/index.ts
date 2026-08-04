import { createServer } from 'node:http';
import { createApp } from './app';
import { MemoryServerCache } from './cache';
import { Mp3QuranClient } from './mp3Quran';
import { QuranEncClient } from './quranEnc';
import { QuranFoundationClient } from './quranFoundation';
import { buildShortSurahRuntimeCourse } from './runtimeCourse';

const clientId = process.env.QF_CLIENT_ID;
const clientSecret = process.env.QF_CLIENT_SECRET;
if (!clientId || !clientSecret) throw new Error('QF_CLIENT_ID and QF_CLIENT_SECRET are required');
const quranFoundation = new QuranFoundationClient({ environment: process.env.QF_ENV === 'production' ? 'production' : 'prelive', clientId, clientSecret }, new MemoryServerCache());
const quranEnc = new QuranEncClient();
const mp3Quran = new Mp3QuranClient(fetch, process.env.QF_ENV === 'production' ? 'production' : 'development');
const app = createApp({
  quranFoundation,
  quranEnc,
  mp3Quran,
  allowedOrigins: (process.env.FURQAN_ALLOWED_ORIGINS ?? '').split(',').map((value: string) => value.trim()).filter(Boolean),
  approvedQuranFoundationTafsirIds: (process.env.FURQAN_QF_TAFSIR_IDS ?? '').split(',').map((value: string) => value.trim()).filter(Boolean),
  previewPackage: process.env.FURQAN_ENABLE_DRAFT_RUNTIME === 'true'
    ? (packageId, locale) => packageId === 'surah-al-fil-v1'
      ? buildShortSurahRuntimeCourse(locale, { quranFoundation, quranEnc, mp3Quran })
      : Promise.resolve(undefined)
    : undefined,
});

const server = createServer(async (request, response) => {
  const body: Uint8Array[] = [];
  for await (const chunk of request) body.push(chunk as Uint8Array);
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const webResponse = await app(new Request(url, { method: request.method, headers: request.headers as Record<string, string>, body: body.length ? Buffer.concat(body) : undefined }));
  response.writeHead(webResponse.status, Object.fromEntries(webResponse.headers.entries()));
  response.end(Buffer.from(await webResponse.arrayBuffer()));
});

server.listen(Number(process.env.FURQAN_PORT ?? 8787));
