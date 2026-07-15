# Foundation Migration Tickets

## Completed foundation

T1–T15 are complete and must remain working:

- progress naming/storage migration;
- native level questions;
- legacy renderer removal;
- direct level flow;
- source validation;
- resumable level progress;
- question attempts;
- canonical block rendering;
- completion/validator hardening;
- test foundation;
- atomic Progress V2;
- production content gate;
- level session controller;
- legacy model removal;
- SDK/mobile quality.

Refer to repository history for the full completed-ticket detail.

## T16 — Hafs edition identity and canonical positions

Status: implemented.

Scope:

- add explicit `hafs-an-asim` edition;
- edition-aware ayat and word tokens;
- Quran position/range types;
- source version/checksum metadata;
- migrate Al-Fil package references.

Delivered: explicit `hafs-an-asim`, canonical ayah source/version/checksums, stable Al-Fil word-token IDs, edition-aware repository queries, and validation/tests. Word-gloss Arabic remains a temporary renderer compatibility field; canonical token IDs are now authoritative.

Compatibility:

- preserve existing stable ayah and level IDs where possible;
- add repository adapters rather than changing routes.

## T17 — Juz/Hizb/Rub indexes

Status: implemented (model/index only).

Scope:

- division records and indexes;
- queries by division;
- source-backed minimal fixture or verified dataset integration;
- validation of ranges and references.

Limitation: repository has no verified division-boundary dataset. APIs return no division records until a source-backed fixture or dataset is installed; no Juz/Hizb/Rub values were guessed for Al-Fil.

Compatibility:

- Surah roadmap remains primary;
- no UI redesign required.

## T18 — Memorization activity domain

Status: implemented.

Scope:

- shared activity schema;
- stable token/segment answer references;
- knowledge references;
- review/source metadata;
- pure evaluators.

Delivered: discriminated activity contract, stable ID answers, explicit typed comparison policy, pure evaluation, and taught-knowledge validation. UI/persistence integration remains T19.

Compatibility:

- existing native questions remain readable or are adapted through one activity boundary;
- no duplicate competing engines.

## T19 — Memorization activity UI and persistence

Status: implemented (recall vertical slice).

Scope:

- recall/reveal;
- missing token;
- token/segment ordering;
- word-meaning matching;
- optional typed missing text;
- attempt persistence through Progress V2.

Delivered: activity block dispatch, accessible recall/reveal rating, ActivityAttempt persistence and resume, required-activity session/completion gates, activity metadata validation, tests, and a Level 1 recall fixture. Missing-token/order/match UI remains T23 expansion.

Compatibility:

- retain idempotent XP and existing completion receipts.

## T20 — Audio resource foundation

Status: implemented (contract only).

Scope:

- reciter/track records;
- Hafs compatibility;
- source/license/checksum;
- local/remote resolution;
- repeat-ready player contract.

Compatibility:

- no unapproved audio fetch;
- lesson remains usable without optional audio unless explicitly marked required.

Delivered: reciter and ayah-track contracts, Hafs compatibility/source/license/checksum validation, repository lookups, and a resolver/player boundary. No audio fixture or playback is enabled because no approved Hafs audio source is configured.

## T21 — Offline package manifest and installer

Status: implemented (installer foundation).

Scope:

- manifest schema;
- staging;
- checksums;
- validation;
- atomic activation;
- rollback;
- installed registry;
- fixture downloader tests.

Compatibility:

- built-in and downloaded packages share repository APIs;
- progress remains separate.

Delivered: runtime manifest checks, checksum verifier/downloader seams, staging, production package validation, registry activation, rollback, and local fixture tests. Native file staging/download transport and repository registration are deferred integration work.

## T22 — Studio publishing contract

Status: implemented (compiler contract).

Scope:

- roles;
- publication states;
- publishable schemas;
- structured diagnostics;
- deterministic compiler/export.

Compatibility:

- no Studio UI/backend;
- compiler output matches mobile package schema.

Delivered: roles/publication states, canonical-selection-only draft model, deterministic compiler export, structured diagnostics, and fixture tests. The compiler selects canonical Quran records from the trusted package; a Studio draft cannot provide Arabic text or word tokens.

## T23 — Al-Fil production-shaped vertical slice

Status: blocked by content governance.

Scope:

- explicit Hafs edition;
- division discoverability;
- guided memorization;
- memory activity;
- understanding activity;
- reviewed summary;
- package/export fixture.

Compatibility:

- preserve current roadmap and level access behavior.

Current state: Level 1 has the recall fixture from T19. The required reviewed tafsir/context/summary approvals and an approved Hafs audio source are absent, so the full production-shaped slice is intentionally not fabricated or published.

## T24 — Release hardening

Status: started (gate audit).

Scope:

- migration tests;
- activity security/correctness tests;
- package failure/rollback tests;
- production content/edition gates;
- accessibility and build validation.

Current historical gate result: typecheck, 25 tests, and Expo web production export passed. Production content validation rejected draft religious records as intended. Lint/format scripts are not configured.

Delivered: versioned package localization/media contracts, required-key and asset validation, repository package registration and active-package lookup, AsyncStorage hydration at app startup, authoritative question/activity evaluation, package-driven existing labels, and reusable token/matching activity rendering. The native storage adapter is isolated from the platform-neutral installer for Jest compatibility.

## T25 — Package-driven learner surface

Status: implemented (foundation boundary).

Scope: remove learner-facing lesson strings and answers from screens/components; render supported activity kinds from package references and canonical repository records.

Compatibility: existing routes, progress, question engine, and recall UI remain unchanged at their public boundaries. Unsupported future activity kinds remain schema-driven extension points rather than route-specific branches.

Gate: production content remains blocked until draft records receive required editorial/shaykh approval.

## T26 — Memorization-first lesson flow

Status: implemented (schema v2 development slice).

Delivered: semantic step kinds; separate passage, translation, selected word-meaning, tafsir, audio, media, summary, and practice contracts; `fill_gap` and ayah-translation matching; stable-ID tap activities with independent shuffling; level-wide memory/understanding completion gates; schema-v1 step-kind inference; and resume rewind for newly inserted required steps.

Migration: Al-Fil package `2.0`/revision `r2` separates mixed meaning/tafsir steps across all four levels. Level 1 includes the complete target sequence and two memory exercises. Existing level/path IDs and key legacy step IDs remain stable.

Gate: new derived activities and summaries remain source-linked drafts. Production validation must continue to reject them until approval; approved Hafs audio is still unavailable.

## T27 — Memorization practice ladder

Status: implemented (Level 1 development slice).

Delivered: tap-only missing-token and word-order reconstruction, independently shuffled word matching, RTL from-memory typing, canonical answer resolution, retry feedback, and one shared activity renderer for lessons/reviews. Typed activity schemas now reference ayat or token IDs; raw Quran answer text is not stored in curriculum.

Compatibility: existing activity IDs/kinds and the `complete_missing_token` alias remain readable. Typed exercises are optional and non-blocking.

## T28 — Deterministic spaced review

Status: implemented (local foundation).

Delivered: package-authored review intervals, deterministic Again/Hard/Remembered/correct transitions, Progress V3 review state, atomic review attempts, due queries, and completed-level backfill from preserved successful attempts. Review keys include package revision, so stale schedules remain stored but inactive after package updates.

Migration: `qlp_progress_v2` is read once and written to `qlp_progress_v3` without changing levels, attempts, XP, streaks, or receipts. This is fixed interval review, not adaptive SRS.

## T29 — Al-Fil review vertical slice

Status: implemented (development content).

Delivered: Al-Fil package `2.1`/revision `r3`, a complete Level 1 retrieval ladder, a package-driven due-review card, and a generic review session reusing canonical repositories, evaluators, renderers, and progress storage. The ladder moves from recall to missing-token cues, full word reconstruction, optional free typing, and meaning matching.

Gate: production activation remains blocked by the pre-existing draft tafsir/context/summary/activity records. No approval states were fabricated.

## T30 — Complete Al-Fil pedagogy slice

Status: implemented (development content).

Delivered: generic canonical-token continuation and canonical-ayah ordering renderers; stricter stable-reference validation; complete short retrieval, vocabulary, tafsir, recall, and summary sequences for Levels 2–4; and deterministic review schedules for memory and selected-word practice. Level 4 orders all five ayat without copying Quran text into curriculum.

Migration: built-in package `2.2`/revision `r4` preserves existing IDs, Progress V3, V2 migration, completion receipts, and earned XP. Completed levels remain complete; unfinished sessions rewind through the existing required-step adapter. Old review revisions remain stored but inactive.

Gate: new derived activities remain source-linked drafts and production validation must reject them until genuine review and approval.

## T31 — Review scheduling correctness

Status: implemented. All authored intervals run before mastery; completed-level backfill anchors to the latest attempt after at least one success. Catalog sync repairs legacy stage-3 premature mastery once; Progress V3 keys and records are unchanged.

## T32 — Studio production gate

Status: implemented. Compilation uses production package validation and returns blocking package diagnostics for draft religious content. Approved test fixtures are isolated clones.

## T33 — Package integrity boundary

Status: implemented. Manifests require one safe relative curriculum file; verified bytes are captured and parsed as authoritative package content. Legacy stored objects remain readable after production revalidation.

## T34 — Recoverable package activation

Status: implemented. Immutable version data is written before the registry pointer; failed registry/runtime commits preserve the prior pointer. Hydration and rollback revalidate stored content.

## T35 — Package-scoped learning identity

Status: implemented. Review lookup resolves activities through their level, block IDs are package-wide unique, and installed packages cannot claim another package's level/activity IDs.

## T36 — Progress runtime integrity

Status: implemented. Progress V2/V3 dates, attempts, reviews, receipts, and JSON answers are validated before use; malformed snapshots use the existing quarantine and recovery warning path.

## T37 — Canonical word-token separation

Status: implemented. Al-Fil package `2.3`/revision `r5` authors immutable Hafs tokens independently from glosses; word meanings reference token IDs and render Arabic through repository lookup. Existing content IDs are preserved; old revision schedules remain stored but inactive.

## T38 — Legacy question consolidation

Status: implemented. Authoritative legacy-question evaluation lives beside the shared activity evaluator, match attempts persist stable pair mappings, optional steps do not gate navigation, and unsupported runtime content has a generic fallback.
