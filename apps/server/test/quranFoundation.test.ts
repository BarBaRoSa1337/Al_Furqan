import assert from 'node:assert/strict';
import test from 'node:test';
import { MemoryServerCache } from '../src/cache';
import { QuranFoundationClient } from '../src/quranFoundation';

test('QF client caches eligible responses and never exposes credentials in result', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.includes('/oauth2/token')) return Response.json({ access_token: 'secret-token', expires_in: 3600 });
    return Response.json({ chapters: [{ id: 1 }] }, { headers: { 'cache-control': 'public, max-age=120' } });
  };
  const client = new QuranFoundationClient({ environment: 'prelive', clientId: 'client', clientSecret: 'secret' }, new MemoryServerCache(), fetcher, () => new Date('2026-01-01T00:00:00.000Z'));
  const first = await client.get<{ chapters: unknown[] }>('/chapters', new URLSearchParams({ language: 'en' }));
  const second = await client.get<{ chapters: unknown[] }>('/chapters', new URLSearchParams({ language: 'en' }));
  assert.equal(first.cacheStatus, 'miss');
  assert.equal(second.cacheStatus, 'hit');
  assert.equal(requests.length, 2);
  assert.equal(JSON.stringify(first).includes('secret'), false);
});

test('QF no-store response is requested again', async () => {
  let calls = 0;
  const fetcher = async (input: string | URL | Request) => {
    calls += 1;
    if (String(input).includes('/oauth2/token')) return Response.json({ access_token: 'token', expires_in: 3600 });
    return Response.json({ verse: {} }, { headers: { 'cache-control': 'no-store' } });
  };
  const client = new QuranFoundationClient({ environment: 'production', clientId: 'id', clientSecret: 'secret' }, new MemoryServerCache(), fetcher);
  const path = '/verses/by_key/105:1';
  await client.get(path, new URLSearchParams());
  await client.get(path, new URLSearchParams());
  assert.equal(calls, 3);
});

test('QF client rejects a generic proxy path', async () => {
  const client = new QuranFoundationClient({ environment: 'prelive', clientId: 'id', clientSecret: 'secret' }, new MemoryServerCache(), fetch);
  await assert.rejects(client.get('/https://example.com', new URLSearchParams()), /allowlisted/);
});
