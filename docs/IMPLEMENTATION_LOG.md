# Implementation Log

This log records completed implementation milestones that change runtime
behavior, data contracts, or release gates. Update it with each major change.

## 2026-07-31 - Mobile multilingual runtime and direct recitation

### Delivered

- Added persisted, independent interface locale, lesson locale, translation,
  Quran script, transliteration and reciter preferences. App chrome supports
  Arabic RTL plus English and French LTR.
- Added whole-lesson locale gating. The development Al-Fil English draft is
  usable in development; Arabic and French show an explicit unavailable state
  and may switch only to a complete available lesson locale.
- Production no longer activates the built-in draft package. It requires a
  validated runtime package from the Furqan backend and does not persist the
  response. Downloaded package hydration and offline filtering are disabled.
- Migrated Al-Fil translation records to exact pinned QuranEnc Rowwad payloads,
  including provider IDs, version, attribution and footnotes.
- Removed QuranicAudio files and import tooling. Al-Husary now streams directly
  from MP3Quran with exact reciter/mushaf/riwayah IDs and ayah segment timing.

### Release status

English remains a draft candidate, not a published religious lesson. Arabic
and French lesson publications remain unavailable. Existing Arabic text,
structure, tafsir, word meanings, Wisdom Cards and source records still require
the configured named reviews and legal approvals.

### Compatibility

- Level completion and XP remain shared across locales.
- V4 attempts and review schedules are locale-specific unless an activity is
  explicitly language-independent.
- Schema v1 and v2 remain development-readable; schema v3 adds publication
  metadata without changing renderer sequencing.

## 2026-07-31 - Provider backend and multilingual contracts

### Delivered

- Added independent interface locale, lesson locale, Quran translation,
  script, transliteration and reciter preference contracts for Arabic, English
  and French.
- Added locale publication metadata and Progress V4. Level completion remains
  shared; language-dependent attempts and reviews carry a locale.
- Added the Furqan provider backend boundary. Quran Foundation OAuth secrets
  remain server-only, caching honors upstream controls with a seven-day hard
  maximum, and stale data is never served.
- Pinned exact QuranEnc Rowwad English and Rashid French resources. Provider
  version changes fail closed pending review.
- Added exact MP3Quran Al-Husary Hafs identity checks, ayah timing resolution,
  stream metadata probing, host validation, and stream-only delivery.
- Added origin, method, URL-size and rate-limit guards. Mafateeh remains disabled.

### Release status

No religious package is published by this backend yet. Runtime package serving
is an explicit injection boundary and returns an unavailable response unless an
approved immutable package is configured. Production must replace the in-memory
cache with an expiry-reliable cache implementation.

### Compatibility

- Existing V3 progress migrates to V4; completed levels remain complete.
- Existing attempts and reviews are assigned the English locale unless marked
  language-independent.
- Content schema v1 and v2 remain development-readable; schema v3 adds locale
  publication records.

## 2026-07-30 - Evidence-bound governance and licensed audio cache

### Delivered

- Added hash-bound approval attestations, hybrid evidence references, explicit
  release profiles, platform/use rights, and provider retention contracts.
- Added structured production diagnostics and the `content:audit` command.
- Corrected unsupported public-domain/educational-use source claims to
  unverified development-only declarations.
- Added a learner-visible source and rights sheet to Profile.
- Replaced eager audio caching with active-track policy resolution. Unlicensed
  development audio now streams without persistence.
- Added verified bounded caches for native and web. Web uses Cache Storage plus
  IndexedDB; native uses versioned cache files and metadata.
- Migrated Quran Foundation import scripts to the authenticated content API
  endpoint and mandatory CLI credentials.

### Release status

Production remains blocked. Real reviewer attestations, exact tafsir
citations, source licenses, and provider permissions have not been supplied.
The audit reports these as explicit evidence, approval, citation, and rights
blockers rather than relying only on draft flags.

### Compatibility

- Package schema v1 and v2 remain readable in development.
- `ContentPackage.governance` and tafsir citations are additive fields.
- Production package activation now requires the governance envelope.
- The built-in Al-Fil package is `2.10`, revision `r12`.
- Learner progress has no migration.

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
