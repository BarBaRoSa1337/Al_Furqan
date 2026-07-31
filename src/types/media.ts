import type { AyahRef, QuranEditionId } from './content';

export interface Reciter {
  id: string;
  displayName: string;
  providerResourceId?: string;
  editionId: QuranEditionId;
  sourceId: string;
  license: string;
  reviewerStatus: 'draft' | 'reviewed' | 'approved';
  providerReciterId?: string;
  providerMushafId?: string;
  providerRiwayahId?: string;
}

export type AudioAssetLocation =
  | { kind: 'local'; uri: string }
  | { kind: 'remote'; uri: string };

export interface RecitationTrack {
  id: string;
  reciterId: string;
  editionId: QuranEditionId;
  ayahRef: AyahRef;
  sourceId: string;
  license: string;
  deliveryMode?: 'stream_only' | 'cache_allowed';
  checksum?: string;
  providerResourceId?: string;
  providerReciterId?: string;
  providerMushafId?: string;
  providerRiwayahId?: string;
  providerSurahId?: number;
  approvedHostnames?: string[];
  etag?: string;
  lastModified?: string;
  durationMs?: number;
  byteSize?: number;
  format?: string;
  asset: AudioAssetLocation;
}

export interface AudioAssetResolution {
  available: boolean;
  uri?: string;
  isLocal: boolean;
}

export interface AudioAssetResolver {
  resolveLocal(uri: string): Promise<string | undefined>;
}

export interface RecitationPlayer {
  load(track: RecitationTrack): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  setRepeatCount(count: number): Promise<void>;
}

/** Resolves a declared asset only. It never downloads or validates remote media. */
export async function resolveRecitationAsset(track: RecitationTrack, resolver: AudioAssetResolver): Promise<AudioAssetResolution> {
  if (track.asset.kind === 'remote') return { available: true, uri: track.asset.uri, isLocal: false };
  const uri = await resolver.resolveLocal(track.asset.uri);
  return uri ? { available: true, uri, isLocal: true } : { available: false, isLocal: true };
}
