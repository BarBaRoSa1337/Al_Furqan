# Implementation Tasks — Next Foundation Milestone

## Evidence governance milestone

- [x] Add hash-bound approval and license contracts.
- [x] Add structured production audit diagnostics.
- [x] Quarantine sources with unsupported license claims.
- [x] Add source-specific native and web audio cache policies.
- [x] Move Quran Foundation importers to authenticated CLI use.
- [x] Add MP3Quran production permission gate (blocks audio in production until verified).
- [x] Add user-facing attribution screen with all source credits.
- [x] Add Privacy Policy and Terms of Use template pages.
- [x] Fix QuranEnc attribution to include quranenc.com source URL and version.
- [x] Document QuranEnc version update procedure.
- [x] Create source terms registry documentation.
- [x] Add license grant templates for all sources.
- [x] Deprecate legacy Quran Foundation CLI token client.
- [ ] Attach verified MP3QuranNet permission evidence and exact resource scope.
- [ ] Record editorial, shaykh, technical, and legal reviewer attestations.
- [ ] Add exact edition/page/entry citations for authored tafsir summaries.
- [ ] Supply application Privacy Policy and Terms before provider-backed release.
- [x] Enroll in Quran Foundation developer program.


## Phase 0 — Inventory and baseline

- Read all project docs.
- Inspect current types, repositories, package validator, progress storage, level session controller, activity/question renderers, asset system, and tests.
- Confirm T1–T15 behavior remains active.
- Run the existing validation suite before changes.
- Record the baseline results.

Do not redesign UI in this milestone.

## Phase 1 — Hafs edition and canonical positions

Add or adapt:

- `QuranEdition`;
- `QuranEditionId = 'hafs-an-asim'`;
- `QuranPosition`;
- `QuranRange`;
- edition-aware `AyahRecord`;
- edition-aware `WordToken`;
- source version/checksum metadata.

Migrate the Al-Fil fixture to explicit Hafs references without duplicating Arabic text in levels.

## Phase 2 — Juz/Hizb/Rub indexing

Add:

- `QuranDivisionKind`;
- `QuranDivision`;
- division index repository;
- query methods by Juz/Hizb;
- validation for ranges and references.

Do not import or invent a full dataset without a verified source.

Use verified existing data or a minimal source-backed fixture and document the limitation.

## Phase 3 — Memorization activity model

Add the shared `LearningActivity` schema and pure evaluator contract.

Implement learner-facing support for:

1. recall then reveal;
2. complete missing token;
3. order tokens/segments;
4. match word meaning.

Add schema/evaluator support for:

- choose continuation;
- type missing text;
- order ayat.

Keep typed input optional/non-blocking in the first vertical slice.

## Phase 4 — Activity integration

- Integrate activities into Level -> Step rendering.
- Reuse the active level session controller.
- Persist attempts through the existing atomic progress store.
- Keep XP/completion idempotent.
- Validate that required activities test taught knowledge.
- Add accessibility labels and non-drag controls.

## Phase 5 — Audio resource foundation

Add:

- `Reciter`;
- `RecitationTrack`;
- edition compatibility;
- source/license records;
- checksum;
- local/remote asset resolver;
- repeat-ready player interface.

If a working audio block already exists, adapt it. Otherwise implement a safe placeholder/player contract without fetching unapproved media.

## Phase 6 — Offline package manager foundation

Add:

- manifest runtime schema;
- installed-package registry;
- staging directory abstraction;
- checksum verification;
- package validation;
- atomic activation;
- rollback;
- cleanup of failed staging data.

Test with a local fixture or mocked downloader. No real backend endpoint is required.

## Phase 7 — Studio-ready compiler contract

Add:

- role and publication-state types;
- publishable draft schema;
- machine-readable validation diagnostics;
- deterministic package compiler/export;
- stable file ordering/content hash;
- local Al-Fil fixture compile test.

Compiled output must be accepted by the same validator used by mobile.

Do not build a Studio UI or backend.

## Phase 8 — Update the Al-Fil vertical slice

Update one complete level to include:

```text
optional context
-> Hafs Quran passage
-> translation
-> word explorer
-> concise tafsir
-> guided recall
-> missing-token or ordering activity
-> word-meaning/understanding activity
-> reviewed summary
-> completion
```

Keep the remaining levels working. Expand them only after the vertical slice passes.

## Phase 9 — Tests and release gates

Add or update tests for:

- Hafs edition resolution;
- Surah/Juz/Hizb queries;
- invalid division ranges;
- activity evaluators;
- independent matching/order randomization;
- typed-answer normalization;
- attempt persistence and resume;
- package checksum failure;
- incomplete package rejection;
- atomic activation and rollback;
- progress preservation;
- deterministic compilation;
- production rejection of non-approved or incompatible content;
- accessibility smoke tests.

Run:

- format check;
- lint;
- typecheck;
- focused tests;
- full tests;
- content validation;
- production build.

Use the repository's current package manager and command names.

## Lesson-entry and practice-session alignment

- Route every unlocked roadmap level through context-aware entry options.
- Offer start for new levels, continue/start-over for unfinished levels, and
  learn-again/extra-practice for completed levels.
- Preserve historical progress when starting over; reset only the active step
  pointer and local exercise answer.
- Postpone incorrect steps to a shared FIFO retry round without replaying later
  authored steps.
- Keep successful matching pairs visible, green, disabled, and accessible.
- Guarantee matching choices do not begin in a solved row alignment.

## Required completion report

Report:

1. files changed;
2. type/schema migrations;
3. storage/package migrations;
4. compatibility strategy;
5. tests and commands run;
6. unresolved source/data limitations;
7. deferred Studio/backend/audio work.

## Surah roadmap migration

Status: implemented on `feature/surah-learning-hierarchy`.

- Home displays authored Surah aggregates, not one card per Level.
- Surah detail displays ordered generic curriculum nodes.
- Progress V4 storage shape is unchanged; curriculum reconciliation is
  additive and idempotent.
- Exercise completion auto-submits and wrong answers reappear in the same
  session retry round.
- `react-native-svg` is the only added runtime dependency, used for segmented
  Surah progress rings.

## Short-Surah course expansion

Status: implemented as an English development runtime candidate.

- Al-Fil now has separate Ayah 3, Ayah 4, Ayah 5, and final checkpoint nodes.
- Progress V5 migrates historical combined-node completion exactly once.
- The backend can assemble canonical practice for Surahs 105-114 without
  persisting Quran Foundation payloads on mobile.
- Arabic/French complete lesson publications, source approvals, and production
  runtime activation remain deferred release work.
