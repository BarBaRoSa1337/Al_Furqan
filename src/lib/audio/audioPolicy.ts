import type { ContentPackage } from '../../types/content';
import type { DistributionPlatform, ReleaseUsageProfile } from '../../types/governance';
import type { RecitationTrack } from '../../types/media';
import { audioGrantForTrack } from '../content/governance';

export type AudioAccessPolicy =
  | { mode: 'blocked'; reason: string }
  | { mode: 'stream'; reason?: string }
  | {
      mode: 'persist';
      grantId: string;
      retentionSeconds?: number;
      reason?: string;
    };

export function resolveAudioAccessPolicy(
  pkg: ContentPackage,
  track: RecitationTrack,
  platform: DistributionPlatform,
  options: { profile?: ReleaseUsageProfile; development?: boolean } = {},
): AudioAccessPolicy {
  const profile = options.profile ?? 'public-free';
  const persistentGrant = audioGrantForTrack(pkg, track, platform, profile, true);
  if (persistentGrant) {
    return {
      mode: 'persist',
      grantId: persistentGrant.id,
      ...(persistentGrant.retention.kind === 'bounded'
        ? { retentionSeconds: persistentGrant.retention.maxAgeSeconds }
        : {}),
    };
  }

  const streamingGrant = audioGrantForTrack(pkg, track, platform, profile, false);
  if (streamingGrant) {
    return {
      mode: 'stream',
      reason: 'This source permits streaming but not offline storage on this platform.',
    };
  }
  if (options.development) {
    return {
      mode: 'stream',
      reason: 'Development-only stream. Public distribution and persistence rights are not approved.',
    };
  }
  return {
    mode: 'blocked',
    reason: 'Audio is unavailable because no evidence-backed grant covers this use.',
  };
}

export function platformForAudio(os: string): DistributionPlatform {
  if (os === 'android' || os === 'ios') return os;
  return 'web';
}
