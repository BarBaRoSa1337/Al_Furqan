import { createServer } from 'node:http';
import { createApp } from './app';
import { MemoryServerCache } from './cache';
import { readServerConfig } from './config';
import { Mp3QuranClient } from './mp3Quran';
import { QuranEncClient } from './quranEnc';
import { QuranFoundationProvider } from './quranFoundation';
import { buildShortSurahRuntimeCourse } from './runtimeCourse';

const config = readServerConfig();
const quranFoundation = new QuranFoundationProvider(config.quranFoundation, new MemoryServerCache());
const quranEnc = new QuranEncClient();
const mp3Quran = new Mp3QuranClient(fetch, config.quranFoundation.environment === 'production' ? 'production' : 'development');
const app = createApp({
  quranFoundation,
  quranEnc,
  mp3Quran,
  allowedOrigins: config.allowedOrigins,
  approvedQuranFoundationTafsirIds: config.quranFoundationResources.tafsirId ? [String(config.quranFoundationResources.tafsirId)] : [],
  previewPackage: config.enableDraftRuntime
    ? (packageId, locale) => packageId === 'surah-al-fil-v1'
      ? buildShortSurahRuntimeCourse(locale, { quranFoundation, quranEnc, resources: config.quranFoundationResources })
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

server.listen(config.port);
