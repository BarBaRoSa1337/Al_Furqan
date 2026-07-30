import type { AudioAccessPolicy } from './audioPolicy';
import type { RecitationTrack } from '../../types/media';

export type AudioCacheResult =
  | {
      status: 'verified_offline';
      uri: string;
      expiresAt?: string;
      release?: () => void;
    }
  | {
      status: 'streaming';
      uri: string;
      reason?: string;
    }
  | {
      status: 'unavailable';
      reason: string;
    };

export interface AudioCacheMetadata {
  trackId: string;
  sourceId: string;
  checksum: string;
  grantId: string;
  fetchedAt: string;
  expiresAt?: string;
}

export type ResolveAndCacheRecitation = (
  track: RecitationTrack,
  policy: AudioAccessPolicy,
) => Promise<AudioCacheResult>;
