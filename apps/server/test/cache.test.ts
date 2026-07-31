import assert from 'node:assert/strict';
import test from 'node:test';
import { boundedCacheSeconds, MemoryServerCache, QF_MAX_CACHE_SECONDS } from '../src/cache';

test('QF cache duration never exceeds seven days and honors no-store', () => {
  assert.equal(boundedCacheSeconds('public, max-age=9999999'), QF_MAX_CACHE_SECONDS);
  assert.equal(boundedCacheSeconds('public, max-age=60'), 60);
  assert.equal(boundedCacheSeconds('no-store'), undefined);
});

test('memory cache deletes expired records', async () => {
  const cache = new MemoryServerCache();
  await cache.set('expired', { value: 1, fetchedAt: '2026-01-01T00:00:00.000Z', expiresAt: '2026-01-02T00:00:00.000Z', provider: 'qf', sourceVersion: 'v4' });
  await cache.set('fresh', { value: 2, fetchedAt: '2026-01-01T00:00:00.000Z', expiresAt: '2026-01-04T00:00:00.000Z', provider: 'qf', sourceVersion: 'v4' });
  assert.equal(await cache.deleteExpired(new Date('2026-01-03T00:00:00.000Z')), 1);
  assert.equal((await cache.get<number>('fresh'))?.value, 2);
});
