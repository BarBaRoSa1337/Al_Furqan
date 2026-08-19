# Source Terms Registry

This document records every external source consumed by the Quran Habit App,
its license terms, current compliance status, and required actions before
production release.

## Tanzil Project — Quran Arabic Text

- **Usage**: Hafs ʿan ʿAsim Uthmani text (6,236 ayat)
- **License**: Creative Commons Attribution 3.0 (CC BY 3.0)
- **Key terms**:
  - Verbatim distribution allowed
  - Modification of Quran text is NOT allowed
  - Attribution required: "Tanzil Quran Text" with link to tanzil.net
  - Copyright notice must be preserved
- **Compliance status**: ✅ Compliant
  - Text stored verbatim (`modificationAllowed: false`)
  - SHA-256 integrity hashes verified
  - Attribution text recorded in metadata
  - `TANZIL_TERMS_ACCEPTED` env-var gate before download
- **Remaining action**: User-facing attribution screen with link to tanzil.net
- **Source files**: `packages/content-preview/source-inputs/tanzil/`
- **License file**: `packages/content-preview/source-inputs/tanzil/LICENSE.txt`
- **Constants**: `packages/content-preview/src/constants.ts`

## Quran Foundation — Content API v4

- **Usage**: Canonical text, word tokens, structure/divisions, word meanings,
  tafsir (Tafsir Al-Muyassar, resource 16)
- **License**: Proprietary developer Terms of Service
- **Key terms**:
  - Requires application Privacy Policy and Terms of Use
  - No raw data redistribution outside integrated end-user experience
  - Content integrity must be preserved
  - Credentials are confidential
- **Compliance status**: ⚠️ Partially compliant
  - ✅ Official developer access received for PRELIVE and production
  - ✅ Official `@quranjs/api` server SDK used behind a provider abstraction
  - ✅ OAuth credentials server-side only (`QF_CLIENT_ID`, `QF_CLIENT_SECRET`)
  - ✅ Upstream-aware server cache capped at seven days; mobile never persists payloads
  - ✅ Allowlisted typed operations; no arbitrary proxy endpoint
  - ✅ Structure snapshot remains `draft` review state
  - ❌ App Privacy Policy not yet published
  - ❌ App Terms of Use not yet published
  - ❌ No `LicenseGrant` attestation in governance envelope
- **Remaining actions**:
  1. Publish app Privacy Policy and Terms of Use
  2. Rotate any credential exposed outside the deployment secret manager
  3. Add a verified `LicenseGrant` evidence record before production release
- **API endpoints**: `apps/server/src/quranFoundation.ts`
- **CLI importer**: `scripts/import-quran-foundation-structure.ts`

## QuranEnc — Translations

- **Usage**: English (Rowwad `1.0.19`) and French (Rashid `1.0.3`) translations
- **License**: Published republication conditions (7 conditions)
- **Key terms**:
  1. No modifications, additions, or deletions
  2. Attribute publisher and source (QuranEnc.com)
  3. Mention version number
  4. Preserve transcript information
  5. Notify source of any notes or feedback
  6. Update to latest version issued by source
  7. No inappropriate advertisements with translations
- **Compliance status**: ⚠️ Partially compliant
  - ✅ Payloads stored verbatim, not rewritten
  - ✅ Version pinned; updates fail closed
  - ✅ Publisher attribution recorded
  - ✅ SHA-256 retrieval evidence
  - ❌ Attribution text does not include "QuranEnc.com" link
  - ❌ No automated version-update check procedure documented
  - ❌ Version number not displayed in user-facing attribution
  - ❌ No `LicenseGrant` in governance envelope
- **Remaining actions**:
  1. Add QuranEnc.com to attribution text and URL
  2. Document the version-update check procedure
  3. Add version display in attribution screen
  4. Add `LicenseGrant` after confirming compliance
- **API endpoints**: `apps/server/src/quranEnc.ts`
- **Constants**: `packages/content-preview/src/constants.ts`

## MP3Quran — Audio Streaming

- **Usage**: Al-Husary Hafs recitation (stream-only, reciter 118, mushaf 118,
  riwayah 1)
- **License**: Open policy — all materials available, commercial use stated as
  permitted
- **Key terms**:
  - Resources stated as available to everyone including commercial use
  - Attribution to MP3Quran.net expected
  - No formal written permission obtained yet
- **Compliance status**: ❌ Insufficient for production
  - ✅ Stream-only, no download/rehost/persistence
  - ✅ Approved host allowlist
  - ✅ Evidence URL recorded
  - ❌ Permission evidence URL points to privacy page, not permission page
  - ❌ `permissionStatus` is `pending` (no verified written permission)
  - ❌ No `LicenseGrant` in governance envelope
  - ❌ Named legal approval still required
- **Remaining actions**:
  1. Contact MP3Quran for formal written permission
  2. Update `MP3QURAN_PERMISSION_URL` with verified evidence
  3. Set `MP3QURAN_PERMISSION_STATUS` to `verified`
  4. Add `LicenseGrant` with exact resource scope
- **Streaming implementation**: `apps/server/src/mp3Quran.ts`
- **Constants**: `packages/content-preview/src/constants.ts`

## Mafateeh — Topic Taxonomy

- **Usage**: Disabled (`MafateehProvider.enabled = false`)
- **License**: Written permission required
- **Compliance status**: ✅ Correctly gated
  - Provider throws error until written permission covers every required use
- **No action required** until permission is obtained

## QuranicAudio

- **Status**: Explicitly excluded from the project
- **No action required**

---

## NPM Dependencies

All npm dependencies use MIT or Apache-2.0 licenses. The only non-MIT
dependency is TypeScript (Apache-2.0), which is a dev dependency only.
`react-native-svg` is the sole added runtime dependency.

No npm dependency terms-of-use issues exist.

---

## Production Release Checklist

- [ ] Publish app Privacy Policy
- [ ] Publish app Terms of Use
- [x] Enroll in Quran Foundation developer program
- [ ] Obtain written permission from MP3Quran
- [ ] Add user-facing attribution screen with all source credits
- [ ] Add `LicenseGrant` attestations for all sources
- [ ] Record editorial, shaykh, technical, and legal reviewer attestations
- [ ] Add exact edition/page/entry citations for authored tafsir summaries
