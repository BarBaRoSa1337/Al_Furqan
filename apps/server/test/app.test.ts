import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app';

const dependencies = {
  quranFoundation: { get: async () => ({ data: {}, fetchedAt: '2026-01-01T00:00:00.000Z', provider: 'quran-foundation' as const, sourceVersion: 'content-api-v4' as const, cacheStatus: 'no-store' as const }) },
  quranEnc: { getSurah: async () => ({}) },
  mp3Quran: { resolveHusaryHafs: async () => ({}) },
  allowedOrigins: ['https://app.furqan.example'],
};

test('server rejects unapproved origins and malformed identifiers', async () => {
  const app = createApp(dependencies as never);
  assert.equal((await app(new Request('https://server.test/health', { headers: { origin: 'https://evil.example' } }))).status, 403);
  assert.equal((await app(new Request('https://server.test/v1/quran/verses/115/1'))).status, 400);
});

test('runtime package endpoint returns explicit unavailable state', async () => {
  const response = await createApp(dependencies as never)(new Request('https://server.test/v1/content/packages/surah-al-fil-v1?locale=fr'));
  assert.equal(response.status, 404);
  assert.equal((await response.json() as { error: { code: string } }).error.code, 'not_available');
});

test('server rate limits repeated requests from one client', async () => {
  const app = createApp({ ...dependencies, security: { maxRequestsPerMinute: 1, now: () => 1_000 } } as never);
  assert.equal((await app(new Request('https://server.test/health'))).status, 200);
  assert.equal((await app(new Request('https://server.test/health'))).status, 429);
});
