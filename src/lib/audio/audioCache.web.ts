import type { RecitationTrack } from '../../types/media';
import type { AudioAccessPolicy } from './audioPolicy';
import type { AudioCacheMetadata, AudioCacheResult } from './audioCache.types';
import { sha256Hex } from './sha256';

export type { AudioCacheResult } from './audioCache.types';

const CACHE_NAME = 'furqan-audio-v2';
const DATABASE_NAME = 'furqan-audio-metadata-v2';
const STORE_NAME = 'tracks';

export async function resolveAndCacheRecitation(
  track: RecitationTrack,
  policy: AudioAccessPolicy,
): Promise<AudioCacheResult> {
  if (track.asset.kind === 'local') return { status: 'verified_offline', uri: track.asset.uri };
  if (policy.mode === 'blocked') return { status: 'unavailable', reason: policy.reason };
  if (policy.mode === 'stream') return { status: 'streaming', uri: track.asset.uri, reason: policy.reason };
  if (!track.checksum) return { status: 'unavailable', reason: 'Cacheable audio requires an integrity checksum.' };
  if (!('caches' in globalThis) || !('indexedDB' in globalThis)) {
    return { status: 'unavailable', reason: 'Verified offline audio is not supported by this browser.' };
  }

  const cache = await caches.open(CACHE_NAME);
  const key = cacheKey(track);
  const metadata = await readMetadata(track.id);
  const cached = await cache.match(key);
  if (cached && metadata && metadataMatches(metadata, track, policy)) {
    const bytes = new Uint8Array(await cached.arrayBuffer());
    if (matchesBytes(bytes, track)) return blobResult(bytes, track, metadata.expiresAt);
  }
  await Promise.all([cache.delete(key), deleteMetadata(track.id)]);

  try {
    const response = await fetch(track.asset.uri);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!matchesBytes(bytes, track)) {
      return { status: 'unavailable', reason: 'Downloaded audio failed integrity verification.' };
    }
    const fetchedAt = new Date();
    const expiresAt = policy.retentionSeconds
      ? new Date(fetchedAt.getTime() + policy.retentionSeconds * 1000).toISOString()
      : undefined;
    const nextMetadata: AudioCacheMetadata = {
      trackId: track.id,
      sourceId: track.sourceId,
      checksum: track.checksum.toLowerCase(),
      grantId: policy.grantId,
      fetchedAt: fetchedAt.toISOString(),
      ...(expiresAt ? { expiresAt } : {}),
    };
    await cache.put(key, new Response(bytes, {
      headers: { 'content-type': `audio/${track.format ?? 'mpeg'}` },
    }));
    await writeMetadata(nextMetadata);
    return blobResult(bytes, track, expiresAt);
  } catch (error) {
    return {
      status: 'unavailable',
      reason: error instanceof Error ? error.message : 'Audio could not be verified.',
    };
  }
}

function metadataMatches(
  metadata: AudioCacheMetadata,
  track: RecitationTrack,
  policy: Extract<AudioAccessPolicy, { mode: 'persist' }>,
): boolean {
  if (!track.checksum) return false;
  return metadata.trackId === track.id
    && metadata.sourceId === track.sourceId
    && metadata.checksum === track.checksum.toLowerCase()
    && metadata.grantId === policy.grantId
    && (!metadata.expiresAt || new Date(metadata.expiresAt).getTime() > Date.now());
}

function matchesBytes(bytes: Uint8Array, track: RecitationTrack): boolean {
  if (!track.checksum) return false;
  return (track.byteSize === undefined || bytes.byteLength === track.byteSize)
    && sha256Hex(bytes) === track.checksum.toLowerCase();
}

function blobResult(bytes: Uint8Array, track: RecitationTrack, expiresAt?: string): AudioCacheResult {
  const blob = new Blob([bytes.slice().buffer as ArrayBuffer], { type: `audio/${track.format ?? 'mpeg'}` });
  const uri = URL.createObjectURL(blob);
  return {
    status: 'verified_offline',
    uri,
    expiresAt,
    release: () => URL.revokeObjectURL(uri),
  };
}

function cacheKey(track: RecitationTrack): string {
  return `https://cache.furqan.invalid/audio/${encodeURIComponent(track.id)}/${track.checksum}`;
}

async function openDatabase(): Promise<IDBDatabase> {
  return await new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readMetadata(trackId: string): Promise<AudioCacheMetadata | undefined> {
  return await withStore<AudioCacheMetadata | undefined>('readonly', store => store.get(trackId));
}

async function writeMetadata(metadata: AudioCacheMetadata): Promise<void> {
  await withStore('readwrite', store => store.put(metadata, metadata.trackId));
}

async function deleteMetadata(trackId: string): Promise<void> {
  await withStore('readwrite', store => store.delete(trackId));
}

async function withStore<T>(
  mode: IDBTransactionMode,
  requestFor: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();
  return await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = requestFor(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}
