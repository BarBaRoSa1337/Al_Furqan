import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import type { RecitationTrack } from '../../types/media';
import { sha256Hex } from './sha256';

export type AudioCacheResult =
  | { status: 'cached'; uri: string }
  | { status: 'remote'; uri: string; reason?: string }
  | { status: 'unavailable'; reason: string };

export async function resolveAndCacheRecitation(track: RecitationTrack): Promise<AudioCacheResult> {
  if (track.asset.kind === 'local') return { status: 'cached', uri: track.asset.uri };
  if (Platform.OS === 'web') return { status: 'remote', uri: track.asset.uri };

  const directory = new Directory(Paths.cache, 'furqan-audio', track.editionId, track.reciterId);
  directory.create({ idempotent: true, intermediates: true });
  const filename = `${track.ayahRef.surahNumber}-${track.ayahRef.ayahNumber}.${track.format ?? 'mp3'}`;
  const target = new File(directory, filename);
  if (target.exists && await fileMatches(target, track)) return { status: 'cached', uri: target.uri };
  if (target.exists) target.delete();

  const temporary = new File(directory, `${filename}.download`);
  try {
    if (temporary.exists) temporary.delete();
    await File.downloadFileAsync(track.asset.uri, temporary);
    if (!await fileMatches(temporary, track)) {
      temporary.delete();
      return { status: 'remote', uri: track.asset.uri, reason: 'Downloaded audio failed integrity verification.' };
    }
    temporary.move(target);
    return { status: 'cached', uri: target.uri };
  } catch (error) {
    if (temporary.exists) temporary.delete();
    return {
      status: 'remote',
      uri: track.asset.uri,
      reason: error instanceof Error ? error.message : 'Audio could not be cached.',
    };
  }
}

async function fileMatches(file: File, track: RecitationTrack): Promise<boolean> {
  if (track.byteSize !== undefined && file.size !== track.byteSize) return false;
  return sha256Hex(await file.bytes()) === track.checksum.toLowerCase();
}
