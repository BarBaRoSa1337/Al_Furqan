/**
 * License grant templates for each external source consumed by the app.
 *
 * These templates define the required grant shape for production activation.
 * Each template is intentionally missing `evidenceRefId` — that field must
 * be filled with an actual EvidenceReference ID after written permission or
 * license confirmation has been obtained and stored.
 *
 * See docs/SOURCE_TERMS_REGISTRY.md for the full compliance status of each
 * source and docs/CONTENT_RIGHTS_AND_AUDIO_CACHE.md for the evidence model.
 */

import type { LicenseGrant } from '../../types/governance';

// ---------------------------------------------------------------------------
// Tanzil Project — CC BY 3.0 (verbatim distribution, no modification)
// ---------------------------------------------------------------------------

export const TANZIL_GRANT_TEMPLATE: Omit<LicenseGrant, 'id' | 'evidenceRefId'> = {
  sourceId: 'tanzil-quran-text',
  releaseProfiles: ['public-free'],
  platforms: ['android', 'ios', 'web'],
  permittedUses: ['public_distribution'],
  validFrom: '2024-01-01T00:00:00Z',
  // CC BY 3.0 does not expire; no validUntil needed.
  retention: { kind: 'indefinite' },
  resourceIds: ['quran-uthmani-1.1'],
  attributionText:
    'Tanzil Quran Text. Copyright (C) 2007-2021 Tanzil Project. '
    + 'License: Creative Commons Attribution 3.0.',
};

// ---------------------------------------------------------------------------
// Quran Foundation — Proprietary developer ToS
// ---------------------------------------------------------------------------

export const QURAN_FOUNDATION_GRANT_TEMPLATE: Omit<LicenseGrant, 'id' | 'evidenceRefId'> = {
  sourceId: 'quran-foundation-content-api-v4',
  releaseProfiles: ['public-free'],
  platforms: ['android', 'ios', 'web'],
  permittedUses: ['public_distribution'],
  validFrom: '2024-01-01T00:00:00Z',
  retention: { kind: 'none' },
  // Server-side only, no-store; no persistence rights needed.
  attributionText:
    'Quran data provided by the Quran Foundation. '
    + 'Content is served through the Quran Foundation Content API v4.',
};

// ---------------------------------------------------------------------------
// QuranEnc — Published republication conditions (7 conditions)
// ---------------------------------------------------------------------------

export const QURANENC_GRANT_TEMPLATE: Omit<LicenseGrant, 'id' | 'evidenceRefId'> = {
  sourceId: 'quranenc-translations',
  releaseProfiles: ['public-free'],
  platforms: ['android', 'ios', 'web'],
  permittedUses: ['public_distribution'],
  validFrom: '2024-01-01T00:00:00Z',
  retention: { kind: 'indefinite' },
  resourceIds: ['english_rwwad-1.0.19', 'french_rashid-1.0.3'],
  attributionText:
    'Translations provided by QuranEnc (quranenc.com). Provider text is unmodified.',
};

// ---------------------------------------------------------------------------
// MP3Quran — Open policy; written permission pending
// ---------------------------------------------------------------------------

export const MP3QURAN_GRANT_TEMPLATE: Omit<LicenseGrant, 'id' | 'evidenceRefId'> = {
  sourceId: 'mp3quran-husary-hafs-118',
  releaseProfiles: ['public-free'],
  platforms: ['android', 'ios', 'web'],
  permittedUses: ['public_distribution', 'streaming'],
  validFrom: '2024-01-01T00:00:00Z',
  retention: { kind: 'none' },
  // Stream-only; no offline storage or caching rights requested.
  resourceIds: ['reciter-118:mushaf-118:riwayah-1'],
  // contentHashes: to be filled when permission is verified.
  attributionText:
    'Recitation streamed directly from MP3Quran.net. '
    + 'No audio is downloaded, cached, or redistributed.',
};
