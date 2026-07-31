import type { ContentPackage } from '../types/content';
import type { ApprovalAttestation, LicenseGrant } from '../types/governance';
import {
  getPackagePayloadHash,
  getSourceHash,
  getStructureSnapshotHash,
} from '../lib/content/governance';

export function createFullyApprovedPackage(
  source: ContentPackage,
  overrides: { id?: string; version?: string } = {},
): ContentPackage {
  const pkg = structuredClone(source) as ContentPackage;
  if (overrides.id) pkg.id = overrides.id;
  if (overrides.version) pkg.version = overrides.version;
  approveLegacyStatuses(pkg);
  pkg.ayat.forEach(ayah => ayah.tafsirEntries.forEach(entry => {
    entry.citation = {
      sourceId: entry.sourceId,
      locator: `Test fixture citation for Quran ${ayah.ref.surahNumber}:${ayah.ref.ayahNumber}`,
      edition: 'test-fixture',
    };
  }));
  pkg.governance = {
    evidence: [
      {
        id: 'fixture-review-evidence',
        kind: 'review_record',
        reference: 'secure:test/review',
        sha256: 'a'.repeat(64),
        capturedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'fixture-license-evidence',
        kind: 'written_permission',
        reference: 'secure:test/license',
        sha256: 'b'.repeat(64),
        capturedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    approvals: [],
    licenseGrants: [],
  };

  const packageHash = getPackagePayloadHash(pkg);
  const packageApprovals: ApprovalAttestation[] = (['editorial', 'shaykh', 'technical'] as const).map(role => ({
    id: `fixture-package-${role}`,
    target: { kind: 'package_payload', id: pkg.id, hash: packageHash },
    role,
    reviewer: { id: `fixture-${role}`, displayName: `Fixture ${role}` },
    decision: 'approved',
    reviewedAt: '2026-01-02T00:00:00.000Z',
    evidenceRefId: 'fixture-review-evidence',
  }));
  const structureApproval: ApprovalAttestation = {
    id: 'fixture-structure-technical',
    target: {
      kind: 'structure_snapshot',
      id: `${pkg.editions[0].id}:structure`,
      hash: getStructureSnapshotHash(pkg),
    },
    role: 'technical',
    reviewer: { id: 'fixture-structure-reviewer', displayName: 'Fixture structure reviewer' },
    decision: 'approved',
    reviewedAt: '2026-01-02T00:00:00.000Z',
    evidenceRefId: 'fixture-review-evidence',
  };
  const sourceApprovals: ApprovalAttestation[] = pkg.sources.map(sourceRecord => ({
    id: `fixture-source-${sourceRecord.id}`,
    target: { kind: 'source', id: sourceRecord.id, hash: getSourceHash(sourceRecord) },
    role: 'legal',
    reviewer: { id: 'fixture-legal', displayName: 'Fixture legal reviewer' },
    decision: 'approved',
    reviewedAt: '2026-01-02T00:00:00.000Z',
    evidenceRefId: 'fixture-review-evidence',
  }));
  const licenseGrants: LicenseGrant[] = pkg.sources.map(sourceRecord => {
    const tracks = pkg.recitationTracks.filter(track => track.sourceId === sourceRecord.id);
    return {
      id: `fixture-grant-${sourceRecord.id}`,
      sourceId: sourceRecord.id,
      evidenceRefId: 'fixture-license-evidence',
      releaseProfiles: ['public-free'],
      platforms: ['android', 'ios', 'web'],
      permittedUses: tracks.length
        ? ['public_distribution', 'streaming', 'segmentation', 'native_cache', 'web_cache', 'offline_storage']
        : ['public_distribution'],
      ...(tracks.length ? {
        resourceIds: tracks.map(track => track.id),
        contentHashes: tracks.flatMap(track => track.checksum ? [track.checksum] : []),
      } : {}),
      validFrom: '2026-01-01T00:00:00.000Z',
      retention: /quran-foundation/i.test(sourceRecord.id)
        ? { kind: 'bounded', maxAgeSeconds: 7 * 24 * 60 * 60 }
        : { kind: 'none' },
    };
  });
  pkg.governance.approvals = [...packageApprovals, structureApproval, ...sourceApprovals];
  pkg.governance.licenseGrants = licenseGrants;
  return pkg;
}

function approveLegacyStatuses(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  if ('reviewerStatus' in value) (value as { reviewerStatus: string }).reviewerStatus = 'approved';
  Object.values(value).forEach(approveLegacyStatuses);
}
