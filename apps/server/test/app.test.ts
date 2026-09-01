import assert from 'node:assert/strict';
import test from 'node:test';
import surahAlFilPackage from '../../../src/content/packages/surah-al-fil/v1';
import { createApp } from '../src/app';

const result = <T>(data: T) => ({
  data,
  fetchedAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2026-01-08T00:00:00.000Z',
  provider: 'quran-foundation' as const,
  sourceVersion: 'content-api-v4' as const,
  cacheStatus: 'miss' as const,
});

const dependencies = {
  quranFoundation: {
    searchQuran: async () => result({ result: { navigation: [{ resultType: 'surah', key: 105, name: '<b>Al-Fil</b>', arabic: 'الفيل', isTransliteration: true }], verses: [] } }),
    listChapters: async () => result([]),
    getVerse: async () => result({ id: 1, verseNumber: 1, verseKey: '105:1' }),
    getChapterVerses: async () => result([]),
    getChapterInfo: async () => result(undefined),
    getChapterRecitation: async () => result([]),
    getTafsir: async () => result(undefined),
    listResources: async () => result({ translations: [], tafsirs: [], chapterInfos: [], recitations: [] }),
  },
  quranEnc: { getSurah: async () => ({}) },
  mp3Quran: { resolveHusaryHafs: async () => ({}) },
  allowedOrigins: ['https://app.furqan.example'],
};

test('server rejects unapproved origins and malformed identifiers', async () => {
  const app = createApp(dependencies as never);
  assert.equal((await app(new Request('https://server.test/health', { headers: { origin: 'https://evil.example' } }))).status, 403);
  assert.equal((await app(new Request('https://server.test/v1/quran/verses/115/1'))).status, 400);
});

test('server exposes normalized Quran search without markup or translations', async () => {
  const app = createApp(dependencies as never);
  const response = await app(new Request('https://server.test/v1/quran/search?q=Al-Fil&language=en'));
  const body = await response.json() as { results: Array<Record<string, unknown>> };
  assert.equal(response.status, 200);
  assert.deepEqual(body.results, [{ id: 'surah:105', kind: 'surah', key: '105', displayName: 'Al-Fil', arabicText: 'الفيل', surahNumber: 105 }]);
  assert.equal(JSON.stringify(body).includes('translation'), false);
  assert.equal((await app(new Request('https://server.test/v1/quran/search?q=&language=en'))).status, 400);
});

test('runtime package endpoint returns explicit unavailable state', async () => {
  const response = await createApp(dependencies as never)(new Request('https://server.test/v1/content/packages/surah-al-fil-v1?locale=fr&contentMode=preview'));
  assert.equal(response.status, 404);
  assert.equal((await response.json() as { error: { code: string } }).error.code, 'not_available');
});

test('production requests cannot consume the preview package provider', async () => {
  const app = createApp({ ...dependencies, previewPackage: async () => ({ package: {}, attributions: [] }) } as never);
  const response = await app(new Request('https://server.test/v1/content/packages/surah-al-fil-v1?locale=en&contentMode=production'));
  assert.equal(response.status, 404);
});

test('preview responses are explicitly labeled and retain draft package state', async () => {
  const app = createApp({ ...dependencies, previewPackage: async () => ({ package: surahAlFilPackage, attributions: [] }) } as never);
  const response = await app(new Request('https://server.test/v1/content/packages/surah-al-fil-v1?locale=en&contentMode=preview'));
  const body = await response.json() as { contentMode: string; package: typeof surahAlFilPackage };
  assert.equal(response.status, 200);
  assert.equal(body.contentMode, 'preview');
  assert.equal(body.package.localePublications?.[0].status, 'draft');
});

test('production responses fail closed when a provider returns a draft package', async () => {
  const app = createApp({ ...dependencies, publishedPackage: async () => ({ package: surahAlFilPackage, attributions: [] }) } as never);
  const response = await app(new Request('https://server.test/v1/content/packages/surah-al-fil-v1?locale=en&contentMode=production'));
  assert.equal(response.status, 503);
});

test('server rate limits repeated requests from one client', async () => {
  const app = createApp({ ...dependencies, security: { maxRequestsPerMinute: 1, now: () => 1_000 } } as never);
  assert.equal((await app(new Request('https://server.test/health'))).status, 200);
  assert.equal((await app(new Request('https://server.test/health'))).status, 429);
});

test('server exposes only explicitly approved Quran Foundation tafsir resources', async () => {
  const blocked = createApp(dependencies as never);
  assert.equal((await blocked(new Request('https://server.test/v1/tafsir/quran-foundation/169/105/1'))).status, 400);
  const allowed = createApp({ ...dependencies, approvedQuranFoundationTafsirIds: ['169'] } as never);
  assert.equal((await allowed(new Request('https://server.test/v1/tafsir/quran-foundation/169/105/1'))).status, 200);
});
