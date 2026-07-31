import { Directory, File, Paths } from 'expo-file-system';
import type { RecitationTrack } from '../../types/media';
import type { AudioAccessPolicy } from './audioPolicy';
import type { AudioCacheMetadata, AudioCacheResult } from './audioCache.types';
import { sha256Hex } from './sha256';

export type { AudioCacheResult } from './audioCache.types';

export async function resolveAndCacheRecitation(
  track: RecitationTrack,
  policy: AudioAccessPolicy,
): Promise<AudioCacheResult> {
  if (track.asset.kind === 'local') return { status: 'verified_offline', uri: track.asset.uri };
  if (policy.mode === 'blocked') return { status: 'unavailable', reason: policy.reason };
  if (policy.mode === 'stream') return { status: 'streaming', uri: track.asset.uri, reason: policy.reason };
  if (!track.checksum) return { status: 'unavailable', reason: 'Cacheable audio requires an integrity checksum.' };

  removeLegacyUnversionedCache(track);
  const directory = new Directory(Paths.cache, 'furqan-audio-v2', track.editionId, track.reciterId);
  directory.create({ idempotent: true, intermediates: true });
  const filename = `${track.ayahRef.surahNumber}-${track.ayahRef.ayahNumber}.${track.format ?? 'mp3'}`;
  const target = new File(directory, filename);
  const metadataFile = new File(directory, `${filename}.metadata.json`);
  const cached = await readValidCache(target, metadataFile, track, policy);
  if (cached) return cached;

  deleteIfPresent(target);
  deleteIfPresent(metadataFile);
  const temporary = new File(directory, `${filename}.download`);
  try {
    deleteIfPresent(temporary);
    await File.downloadFileAsync(track.asset.uri, temporary);
    if (!await fileMatches(temporary, track)) {
      deleteIfPresent(temporary);
      return { status: 'unavailable', reason: 'Downloaded audio failed integrity verification.' };
    }
    temporary.move(target);
    const fetchedAt = new Date();
    const expiresAt = policy.retentionSeconds
      ? new Date(fetchedAt.getTime() + policy.retentionSeconds * 1000).toISOString()
      : undefined;
    const metadata: AudioCacheMetadata = {
      trackId: track.id,
      sourceId: track.sourceId,
      checksum: track.checksum.toLowerCase(),
      grantId: policy.grantId,
      fetchedAt: fetchedAt.toISOString(),
      ...(expiresAt ? { expiresAt } : {}),
    };
    metadataFile.write(JSON.stringify(metadata));
    return { status: 'verified_offline', uri: target.uri, expiresAt };
  } catch (error) {
    deleteIfPresent(temporary);
    return {
      status: 'unavailable',
      reason: error instanceof Error ? error.message : 'Audio could not be verified.',
    };
  }
}

async function readValidCache(
  target: File,
  metadataFile: File,
  track: RecitationTrack,
  policy: Extract<AudioAccessPolicy, { mode: 'persist' }>,
): Promise<AudioCacheResult | undefined> {
  if (!track.checksum) return undefined;
  if (!target.exists || !metadataFile.exists) return undefined;
  try {
    const metadata = JSON.parse(await metadataFile.text()) as AudioCacheMetadata;
    const expired = metadata.expiresAt && new Date(metadata.expiresAt).getTime() <= Date.now();
    const matchesPolicy = metadata.trackId === track.id
      && metadata.sourceId === track.sourceId
      && metadata.checksum === track.checksum.toLowerCase()
      && metadata.grantId === policy.grantId;
    if (expired || !matchesPolicy || !await fileMatches(target, track)) {
      deleteIfPresent(target);
      deleteIfPresent(metadataFile);
      return undefined;
    }
    return { status: 'verified_offline', uri: target.uri, expiresAt: metadata.expiresAt };
  } catch {
    deleteIfPresent(target);
    deleteIfPresent(metadataFile);
    return undefined;
  }
}

async function fileMatches(file: File, track: RecitationTrack): Promise<boolean> {
  if (!track.checksum) return false;
  if (track.byteSize !== undefined && file.size !== track.byteSize) return false;
  return sha256Hex(await file.bytes()) === track.checksum.toLowerCase();
}

function deleteIfPresent(file: File): void {
  if (file.exists) file.delete();
}

function removeLegacyUnversionedCache(track: RecitationTrack): void {
  const legacyDirectory = new Directory(Paths.cache, 'furqan-audio', track.editionId, track.reciterId);
  if (legacyDirectory.exists) legacyDirectory.delete();
}
