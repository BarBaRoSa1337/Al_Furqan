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

## 2026-08-03 - Al-Fil curriculum revision r14

### Delivered

- Expanded draft wisdom summaries for Levels 1-3 and removed the duplicate
  optional Ayah 1 word-order activity.
- Advanced the immutable package revision from `r13` to `r14`.
- Deferred generated historical lesson images. They require stable package
  asset URIs, real checksums, provenance evidence, and named religious and
  editorial review before inclusion.

### Release status

Religious summaries remain draft and production-blocked. No generated image is
included in the active package.

### Compatibility

- Existing level completion, attempts, XP, and review history remain stored.
- Due-review resolution ignores `r13` schedules under active `r14` content.
- Removed activity `l1-order-ayah-1` is no longer offered; its history is not
  deleted.

## 2026-08-04 - Explicit preview and production content modes

### Delivered

- Added a fail-closed content mode shared by Expo and the Furqan backend.
  Missing or invalid client configuration resolves to production.
- Preview mode loads only the explicitly enabled draft runtime provider and
  labels the response as preview without changing any review or publication
  status. Production uses a separate provider and full production validation.
- Replaced repeated lesson draft badges with one accessible app-wide preview
  indicator. The learning roadmap now lists authored Surah curricula only, so
  metadata-only Surahs no longer open an unavailable lesson placeholder.

### Compatibility

- Quran records, curriculum/package schemas, content IDs, learner progress,
  attempts, reviews, and completion migrations are unchanged.
- The Al-Fil-to-An-Nas preview remains English-only, runtime-only, and
  non-persistent. Arabic and French remain explicitly unavailable.
- Production source, license, hash, editorial, Islamic, technical, and locale
  publication gates are unchanged and remain blocking.

## 2026-08-03 - Open Surah and lesson navigation

### Delivered

- Surah roadmap cards remain selectable even when their verified lesson package
  is not loaded; unavailable content uses a neutral pending state instead of a
  lock icon or disabled interaction.
- Published lesson nodes are directly accessible in any order. Completion is
  still recorded and displayed, while content `unlockRules` remain available
  for a future guided mode without restricting the current learner mode.

### Compatibility

- No content IDs, package schemas, progress records, or canonical Quran data
  changed.
- Navigation-only Surahs continue to open an explicit availability screen and
  do not invent lesson, translation, tafsir, or audio content.
- The configured development runtime package uses the same generic curriculum
  assembler for every included Surah: introduction, one ayah level per ayah,
  and a final Surah review with ordered curriculum nodes.

## 2026-08-03 - Runtime backend configuration

### Delivered

- Expo now uses its validated built-in Al-Fil package in development when no
  backend URL is configured, rather than failing the whole application at
  startup.
- When `EXPO_PUBLIC_FURQAN_API_BASE_URL` is configured, Expo loads the
  source-backed Al-Fil-to-An-Nas runtime course from the Furqan backend.
- Local backend commands load `apps/server/.env` automatically. Root and
  server `.env.example` files document the non-secret client endpoint and the
  required server-only Quran Foundation credentials.

## 2026-08-03 - Surah curriculum schema v4 and Al-Fil revision r15

### Delivered

- Added the generic Surah curriculum layer above existing Levels without
  changing canonical Quran ownership or the Step/Block renderer architecture.
- Replaced the Home level list with aggregate authored-Surah cards and a
  segmented `react-native-svg` ring; added the generic `/surah/[id]` path.
- Reshaped Al-Fil into five nodes and consolidated historical context in the
  introduction.
- Replaced draft Reflection cards with source-backed draft Verified Recaps.
- Removed Check/Continue double actions from exercises. Complete answers now
  validate, persist, show accessible result feedback, and advance or enter the
  retry FIFO automatically.
- Added production runtime eligibility checks for governed blocks.

### Compatibility

- Package schema v1-v3 remains readable through inferred curricula.
- The existing combined Level 1 ID remains the Ayah 1 level.
- Existing completion of that ID backfills `al-fil-level-introduction`
  idempotently with no XP, streak, receipt, attempt, or review award.
- Progress remains schema V4; no storage-key migration was introduced.

### Release status

Production validation remains intentionally blocked by 171 approval,
provenance, citation, and rights errors. No religious or provider record was
promoted. The neutral numbered seal remains the artwork fallback until a
representative Surah SVG has a real checksum, license evidence, and named
review.

### Verification

- TypeScript strict check, lint (warnings only), diff check, Hafs structure
  validation, and Expo web production export pass.
- Jest: 27 suites and 141 tests pass.
- Mobile-width browser smoke checks pass for Home and the Al-Fil Surah path.
- Production content validation fails with the expected 171 governance
  blockers.

## 2026-08-03 - Al-Fil split, Progress V5, and short-Surah runtime course

### Delivered

- Split Al-Fil Ayahs 3, 4, and 5 into individual nodes and moved full-Surah
  exercises into a standalone final checkpoint.
- Added generic one-time curriculum completion migrations and Progress V5 so
  completed historical combined nodes fan out without duplicate XP.
- Added an opt-in backend assembler for a ten-Surah canonical practice path
  from Al-Fil through An-Nas: 48 ayat and 68 introduction/ayah/review nodes.
- Reused Quran Foundation Uthmani text and words, pinned QuranEnc Rowwad
  English, and MP3Quran Al-Husary stream timings. Provider payloads are not
  written into the mobile package or local storage.

### Compatibility

- Package and path IDs remain stable; Al-Fil introduction and Ayahs 1-2 keep
  their existing Level IDs.
- V2, V3, and V4 progress migrates atomically to V5. Historical Ayahs 3-4 and
  Ayah 5/review completions backfill their replacement nodes once.
- The built-in package remains Al-Fil-only. The expanded course replaces it in
  memory only when the draft runtime endpoint is explicitly configured.

### Release status

The runtime course is English-only and development-only. Arabic and French
remain explicit unavailable states until complete reviewed locale catalogs are
published. Existing provider licensing and named review blockers remain in
force; no source or religious content was promoted.
