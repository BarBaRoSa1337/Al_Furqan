export type ReleaseUsageProfile = 'public-free' | 'commercial';
export type DistributionPlatform = 'android' | 'ios' | 'web';
export type ApprovalRole = 'editorial' | 'shaykh' | 'technical' | 'legal';
export type EvidenceKind = 'published_terms' | 'written_permission' | 'review_record';
export type GovernedTargetKind = 'package_payload' | 'structure_snapshot' | 'source' | 'resource' | 'locale_publication';

export type UsageRight =
  | 'public_distribution'
  | 'commercial_use'
  | 'streaming'
  | 'offline_storage'
  | 'download'
  | 'web_cache'
  | 'native_cache'
  | 'redistribution'
  | 'segmentation';

export interface EvidenceReference {
  id: string;
  kind: EvidenceKind;
  /** Public URL or opaque secure-record identifier. Never embed confidential evidence. */
  reference: string;
  sha256: string;
  capturedAt: string;
}

export interface ApprovalAttestation {
  id: string;
  target: {
    kind: GovernedTargetKind;
    id: string;
    hash: string;
  };
  role: ApprovalRole;
  reviewer: {
    id: string;
    displayName: string;
  };
  decision: 'approved' | 'rejected';
  reviewedAt: string;
  evidenceRefId: string;
}

export interface LicenseGrant {
  id: string;
  sourceId: string;
  evidenceRefId: string;
  releaseProfiles: ReleaseUsageProfile[];
  platforms: DistributionPlatform[];
  permittedUses: UsageRight[];
  resourceIds?: string[];
  contentHashes?: string[];
  validFrom: string;
  validUntil?: string;
  /** True only when written permission explicitly supersedes published provider retention terms. */
  providerTermsOverride?: boolean;
  retention:
    | { kind: 'none' }
    | { kind: 'bounded'; maxAgeSeconds: number }
    | { kind: 'indefinite' };
  attributionText?: string;
}

export interface ContentGovernance {
  evidence: EvidenceReference[];
  approvals: ApprovalAttestation[];
  licenseGrants: LicenseGrant[];
}

export type ValidationDiagnosticSeverity = 'error' | 'warning';

export interface ValidationDiagnostic {
  code: string;
  severity: ValidationDiagnosticSeverity;
  message: string;
  path?: string;
  targetId?: string;
}
