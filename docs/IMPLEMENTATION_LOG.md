# Implementation Log

This log records completed implementation milestones that change runtime
behavior, data contracts, or release gates. Update it with each major change.

## 2026-07-30 - Full Hafs structure and Al-Husary audio foundation

### Delivered

- Added a generated, versioned Hafs structure snapshot with 114 Surah metadata
  records, 6,236 ayah coordinates, 30 Juz, 60 Hizb, and 240 Rub records.
- Added `structure:import` and `structure:validate` commands. The importer uses
  Quran Foundation Content API v4, optionally accepting `QF_ACCESS_TOKEN` and
  `QF_CLIENT_ID` outside the Expo bundle.
- Added navigation-only Surah records. They enable complete Quran browsing but
  intentionally do not add canonical Arabic ayah text outside the existing
  Al-Fil package data.
- Added Surah, Juz, and Hizb browse modes. Discovery still resolves learning
  paths independently, so an indexed Quran location can correctly report that
  no published lesson is available.
- Added one Hafs-compatible Mahmoud Khalil Al-Husary reciter manifest for
  Surah Al-Fil. Each remote MP3 has a checked byte size and SHA-256 checksum.
- Added ayah audio playback with repeat controls, app-background pause,
  native stream-then-cache behavior, and cache integrity verification.

### Release status

The structure metadata, audio source, reciter, and existing religious content
remain draft. Production validation must reject this package until source
licensing and required editorial/shaykh reviews are recorded as approved.
Web streams audio without persistent cache; Android and iOS cache verified
tracks under the app cache directory.

### Compatibility

- The existing Hafs edition remains the only active edition.
- Schema-v1 word-meaning adaptation and existing learner progress remain
  unchanged.
- `SurahRecord.navigationOnly` and optional reciter/track provider metadata are
  additive fields. Existing content packages remain readable.
