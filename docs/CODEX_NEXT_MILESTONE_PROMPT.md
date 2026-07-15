# Codex Prompt — Hafs, Quran Divisions, Memorization, Offline Packages, and Studio Readiness

Read `AGENTS.md` and every Markdown file under `docs/` before editing.

Inspect the actual repository and preserve the completed foundation described in `docs/FOUNDATION_MIGRATION_TICKETS.md`. Do not assume file names from the docs are exact when the repository already has an established equivalent.

## Goal

Implement the next architecture milestone with minimum breakage:

1. lock the MVP to Hafs ʿan ʿAsim;
2. index canonical Quran content by Surah, Juz, Hizb, and optional Rubʿ;
3. make memorization activities first-class;
4. add offline package installation foundations;
5. add a Studio-ready publishing/compiler contract;
6. keep the existing Al-Fil roadmap, level session, progress, validator, and completion flow working.

## Product UX to support

A normal new-learning level is authored in this order:

```text
optional context/visual
-> listen and read Quran
-> translation when needed
-> selected word meanings
-> concise trusted tafsir
-> guided memorization
-> required memory activity
-> one or two understanding activities
-> reviewed wisdom/summary
-> completion
```

Do not create a complex sequencing engine. Step array order is authoritative.

## Architecture decisions

### Canonical Quran

Add or adapt:

- `QuranEditionId = 'hafs-an-asim'`;
- `QuranEdition`;
- `QuranPosition`;
- `QuranRange`;
- edition-aware `AyahRecord`;
- edition-aware `WordToken`;
- `QuranDivision` for `juz | hizb | rub`.

Rules:

- canonical Arabic text exists only in the Quran repository;
- levels/blocks reference ayat and token IDs;
- `SurahRecord` does not own levels;
- a Surah does not have one guessed `juzId` or `hizbId`;
- exact division boundaries require source/version metadata;
- do not invent a full division dataset.

Required repository methods:

```ts
getEdition(id)
getSurahById(id)
getSurahByNumber(number)
getAyahByRef(ref, editionId)
getAyatByRefs(refs, editionId)
getWordToken(id)
listDivisions(kind, editionId)
getDivision(kind, number, editionId)
listSurahsInDivision(kind, number, editionId)
getDivisionsForAyah(ref, editionId)
```

Use a verified existing dataset when present. Otherwise implement a minimal source-backed Al-Fil fixture and clearly report the limitation.

### Memorization activities

Create one reusable activity domain and evaluator boundary.

Learner-facing activities for this milestone:

- recall then reveal;
- complete missing token;
- order tokens or short segments;
- match Arabic word to meaning.

Schema/evaluator support:

- choose continuation;
- type missing text;
- order ayat.

Typed input may remain optional and non-blocking.

Requirements:

- stable IDs, never answer-by-array-position;
- independently shuffle prompts and choices;
- required activities reference knowledge taught earlier;
- pure deterministic evaluators;
- attempts persist through the existing Progress V2/session controller;
- retries do not duplicate XP or completion;
- accessible tap/keyboard alternatives; no drag-only interaction.

For typed comparison, use an explicit mode. Normalization may trim/collapse whitespace, remove tatweel, and optionally ignore configured harakat. Do not silently replace letters and never alter displayed canonical text.

### Audio foundation

Add/adapt:

- `Reciter`;
- `RecitationTrack`;
- Hafs compatibility;
- ayah reference;
- source/license/checksum;
- local/remote asset resolution;
- repeat-ready player contract.

Do not fetch or redistribute real audio unless an approved source is already configured in the repository. Preserve graceful fallback when audio is unavailable.

### Offline packages

Add:

- runtime-validated manifest;
- package file checksums;
- installed-package registry;
- staging;
- validation;
- atomic active-version switch;
- rollback;
- failed-staging cleanup.

Use a local fixture or mocked downloader. A backend endpoint is not required.

Learner progress must remain separate and survive package updates/removal.

### Studio readiness

Do not build the complete Studio.

Add:

- Studio roles;
- publication states;
- publishable draft schema;
- structured validation diagnostics;
- deterministic `compilePackage` function or CLI;
- stable output ordering/content hash;
- Al-Fil compile fixture;
- test that compiled output is accepted by the mobile package validator.

Canonical Quran text must be selectable but not editable in the publishing model.

## Migration strategy

1. Run the existing full baseline suite.
2. Add types/runtime schemas first.
3. Extend repositories and validators.
4. Add adapters at boundaries where needed.
5. Integrate activities into the existing level renderer/session controller.
6. Add package installer/compiler foundations.
7. Migrate one Al-Fil level into the complete new flow.
8. Preserve stable IDs and stored progress where practical.
9. Avoid unrelated UI changes and mass renames.
10. Remove no compatibility path until migration tests pass.

## Tests required

Add focused tests for:

- Hafs edition resolution;
- Surah/Juz/Hizb queries;
- invalid division ranges/references;
- activity evaluation;
- matching/order answer exposure;
- typed-answer normalization;
- attempt persistence/resume;
- idempotent completion;
- manifest parsing;
- checksum mismatch;
- missing required file;
- incompatible edition;
- atomic activation/rollback;
- progress preservation;
- deterministic compilation;
- production rejection of non-approved content;
- accessibility smoke behavior.

Then run the repository's:

- format check;
- lint;
- typecheck;
- focused tests;
- full tests;
- content validation;
- production build.

## Non-goals

Do not add:

- Warsh or an edition switcher;
- full Studio UI/backend/auth;
- full-Quran data from an unverified source;
- voice recognition;
- adaptive SRS;
- AI-generated religious content;
- multiple reciters;
- word timings;
- leaderboards/social/payment features;
- broad UI redesign.

## Final report

Return:

1. concise architecture summary;
2. files changed;
3. migrations and compatibility behavior;
4. commands/tests run with results;
5. source/data limitations;
6. risks;
7. next recommended ticket.

Do not claim completion when any validation, test, or build fails.
