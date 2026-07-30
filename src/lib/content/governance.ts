import type { ContentPackage, ContentSource } from '../../types/content';
import type {
  DistributionPlatform,
  LicenseGrant,
  ReleaseUsageProfile,
  UsageRight,
} from '../../types/governance';
import type { RecitationTrack } from '../../types/media';
import { sha256Hex } from '../audio/sha256';

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .filter(key => record[key] !== undefined)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(',')}}`;
  }
  if (value === undefined) return 'null';
  return JSON.stringify(value);
}

export function hashGovernedValue(value: unknown): string {
  return sha256Hex(new TextEncoder().encode(stableStringify(value)));
}

export function getPackagePayloadHash(pkg: ContentPackage): string {
  const { governance: _governance, ...payload } = pkg;
  return hashGovernedValue(payload);
}

export function getSourceHash(source: ContentSource): string {
  return hashGovernedValue(source);
}

export function getStructureSnapshotHash(pkg: ContentPackage): string {
  return hashGovernedValue({
    divisions: pkg.divisions,
    structureIndex: pkg.structureIndex ?? [],
    surahs: pkg.surahs,
  });
}

export function grantCovers(
  grant: LicenseGrant,
  input: {
    sourceId: string;
    profile: ReleaseUsageProfile;
    platforms: DistributionPlatform[];
    rights: UsageRight[];
    resourceIds?: string[];
    contentHashes?: string[];
    now?: Date;
  },
): boolean {
  const now = input.now ?? new Date();
  if (grant.sourceId !== input.sourceId || !grant.releaseProfiles.includes(input.profile)) return false;
  if (!input.platforms.every(platform => grant.platforms.includes(platform))) return false;
  if (!input.rights.every(right => grant.permittedUses.includes(right))) return false;
  if (new Date(grant.validFrom).getTime() > now.getTime()) return false;
  if (grant.validUntil && new Date(grant.validUntil).getTime() < now.getTime()) return false;
  if (input.resourceIds?.length && !input.resourceIds.every(id => grant.resourceIds?.includes(id))) return false;
  if (input.contentHashes?.length && !input.contentHashes.every(hash => grant.contentHashes?.includes(hash))) return false;
  return true;
}

export function requiredRightsForSource(pkg: ContentPackage, sourceId: string, profile: ReleaseUsageProfile): UsageRight[] {
  const rights = new Set<UsageRight>(['public_distribution']);
  if (profile === 'commercial') rights.add('commercial_use');
  const tracks = pkg.recitationTracks.filter(track => track.sourceId === sourceId);
  if (tracks.length > 0) {
    ['streaming', 'segmentation'].forEach(
      right => rights.add(right as UsageRight),
    );
  }
  return [...rights];
}

export function audioGrantForTrack(
  pkg: ContentPackage,
  track: RecitationTrack,
  platform: DistributionPlatform,
  profile: ReleaseUsageProfile,
  persistent: boolean,
): LicenseGrant | undefined {
  const rights: UsageRight[] = ['public_distribution', 'streaming', 'segmentation'];
  if (profile === 'commercial') rights.push('commercial_use');
  if (persistent) rights.push(platform === 'web' ? 'web_cache' : 'native_cache', 'offline_storage');
  return pkg.governance?.licenseGrants.find(grant => grantCovers(grant, {
    sourceId: track.sourceId,
    profile,
    platforms: [platform],
    rights,
    resourceIds: [track.id],
    contentHashes: [track.checksum],
  }));
}
