# Architecture Overview — Hafs, Memorization, Offline Packages, and Studio Readiness

## Core principle

Schema-first, repository-driven, package-delivered Quran learning.

Do not hardcode lessons in UI routes or components.

## Learner hierarchy

```text
Roadmap -> Surah -> Level -> Step -> Block/Activity
```

## Architectural layers

### 1. Canonical Quran layer

Owns:

- `QuranEdition`;
- `SurahRecord`;
- `AyahRecord`;
- `WordToken`;
- `QuranPosition`;
- `QuranRange`;
- `QuranDivision`;
- source/version/checksum metadata.

Rules:

- MVP edition is Hafs ʿan ʿAsim.
- Canonical Arabic text lives only here.
- `SurahRecord` never owns levels.
- Juz/hizb/rubʿ are range indexes, not guessed Surah properties.
- Exact division boundaries must be source-backed.

### 2. Resource layer

Owns:

- translations;
- tafsir entries;
- word glosses;
- reviewed context;
- reciters;
- recitation tracks;
- media assets;
- source and license records.

Resources declare locale, edition compatibility where applicable, source, version, and review state.

### 3. Curriculum layer

Owns:

- `LearningPath`;
- `Level`;
- `LevelStep`;
- `LevelBlock`;
- `LearningActivity`;
- knowledge references;
- completion rules.

Levels reference canonical ayat and resources. They do not duplicate Quran payloads.

## Lesson schema v3

`LevelStep` has a semantic `kind` and optional `required` flag. Schema-v2 packages author these kinds:

```text
context -> read -> translation -> word_meaning -> tafsir
-> memorize -> memory_practice -> understanding_practice -> summary
```

`context` may be authored with `required: false`. Content blocks and practice activities remain separate concepts, even though both are rendered within a step:

- Content: `ContextBlock`, `QuranPassageBlock`, `TranslationBlock`, `WordMeaningBlock`, `TafsirBlock`, `AudioBlock`, `MediaBlock`, and `SummaryBlock`.
- Practice: `LearningActivity` wrapped by a practice activity block.

Arabic Quran payloads remain canonical references. A passage or activity segment selects `AyahRef` and stable `WordToken` IDs; curriculum never stores Arabic Quran text.

Completion rules are explicit on a level. A schema-v2 level requires all required teaching steps, one successful memory activity from `memorize` or `memory_practice`, and one successful understanding activity or question from `understanding_practice`.

Schema v3 adds whole-lesson locale publication records and creation provenance.
The current Al-Fil package is a development-only English draft; Arabic and
French explicitly report unavailable rather than mixing blocks from English.
Schema-v1 and v2 packages remain development-readable. Schema-v1 packages are
adapted by inferring a step kind from their blocks and retain legacy completion
behavior. If an in-progress learner resumes after required steps were inserted
before their saved position, the session resumes at the earliest missing
required step.

Level entry is context-aware. A new level starts normally, an in-progress level
offers continue or start-over, and a completed level offers replay or optional
extra practice. Start-over resets only the active step pointer and never erases
attempt history, completion, XP, streaks, or scheduled reviews. Leaving during
an exercise preserves completed steps but remounts the current exercise with an
empty local answer when the learner returns.

Incorrect activities use a two-phase session queue: the authored main pass
continues once, then failed steps are retried from a FIFO queue. A failed retry
returns to the end of that queue without replaying unrelated steps. This queue
is shared by core lessons and extra practice.

### 4. Learner-state layer

Owns:

- current level and step;
- completed levels and steps;
- question/activity attempts;
- best results;
- XP and streak;
- completion receipts;
- package-independent progress.

Progress remains valid when a content package is updated, subject to explicit migration rules.

Progress schema V4 keeps level completion shared while scoping religious
attempts and reviews by lesson locale. Only activities explicitly marked
`languageIndependent` share review state. V2 and V3 snapshots migrate
atomically, assigning legacy language-dependent work to English. Quran/package
content is never copied into learner state. Due-review resolution joins learner
state to the active package and ignores missing or stale-revision activities
without deleting history.

### 5. Distribution layer

Owns:

- `ContentPackageManifest`;
- package files;
- checksums;
- package staging;
- validation;
- atomic activation;
- installed package registry;
- rollback.

The app renders only active, validated packages. Production startup fetches an
immutable runtime package from the Furqan backend and does not persist it.
Downloaded package hydration is disabled while source-specific offline rights
and update controls remain unresolved.

### 6. Studio publishing contract

Owns:

- draft/publishable DTOs;
- publication workflow;
- role capabilities;
- validation diagnostics;
- immutable package compilation;
- content revision history identifiers.

The complete Studio is a later application. The shared contract is part of the current foundation.

### 7. Governance envelope

Owns evidence references, exact hash-bound approval attestations, provider
license grants, release usage profiles, and machine-readable validation
diagnostics. This layer gates publishing and media policy without moving
learner progress or religious content into executable code.

## Suggested folders

Adapt to the existing repository rather than moving working files unnecessarily.

```text
src/
  domain/
    quran/
      edition.ts
      records.ts
      divisions.ts
    curriculum/
      levels.ts
      blocks.ts
      activities.ts
    media/
      recitation.ts
      assets.ts
    packages/
      manifest.ts
    studio/
      publication.ts

  content/
    canonical/
      hafs/
        surahs/
        ayat/
        words/
        divisions/
    packages/
      surah-al-fil/
    sources/
    assets/

  lib/
    content/
      repository.ts
      packageValidator.ts
      packageCompiler.ts
    quran/
      quranRepository.ts
      divisionIndex.ts
    activities/
      activityEngine.ts
      evaluators/
    packages/
      packageManager.ts
      packageStorage.ts
      packageDownloader.ts
    media/
      recitationRepository.ts
      assetResolver.ts
    progress/
      storage.ts

  components/
    lesson/
      StepRenderer.tsx
      LevelBlockRenderer.tsx
    activities/
      RecallThenReveal.tsx
      MissingToken.tsx
      OrderTokens.tsx
      MatchWordMeaning.tsx
      TypeMissingText.tsx
    audio/
      AyahRecitationPlayer.tsx
```

## Key repository APIs

### Quran repository

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

### Curriculum repository

```ts
getCurrentLearningPath()
getLevelById(id)
getNextLevel(id)
listAuthoredSurahs(pathId?)
getSurahCurriculum(pathId, surahId)
getLevelsForSurah(pathId, surahId)
```

### Package manager

```ts
listInstalledPackages()
stagePackage(source)
validateStagedPackage(id)
activateStagedPackage(id)
rollbackPackage(id)
removePackage(id)
```

### Activity engine

```ts
evaluateActivity(activity, answer, context)
validateActivity(activity, packageContext)
```

### Review repository

```ts
getReviewStates()
getDueReviewStates(now)
recordReviewAttempt(input)
syncCompletedLevelReviews(catalog)
```

## Data flow

```text
Published package
-> package staging
-> checksum verification
-> schema/content validation
-> atomic activation
-> repositories
-> roadmap/level entry
-> core lesson or extra-practice session
-> blocks and activities
-> progress storage
```

Due review follows the same rendering boundary:

```text
Progress V3 due state
-> active package/revision lookup
-> LearningActivity
-> canonical evaluation context
-> shared activity renderer
-> atomic attempt + schedule update
```

## Compatibility strategy

- Preserve the active level session controller.
- Preserve serialized progress mutations and completion receipts.
- Add adapters only at repository boundaries.
- Do not mass-rename working routes/components.
- Keep old installed/built-in package identifiers readable until migration tests prove safe.
- Package updates must not reset learner progress.

## Surah curriculum layer (schema v4)

The learner hierarchy is now:

```text
Roadmap -> SurahCurriculum -> SurahLesson -> Level -> Step -> Block
```

`SurahCurriculum` is structural metadata owned by a `LearningPath`; canonical
`SurahRecord` still owns no levels. Home aggregates one node per authored
Surah. Opening that node resolves the ordered introduction, ayah/range,
segment-review, and final-review Levels through stable IDs.

Schema v1-v3 packages are adapted into inferred Surah curricula. Schema v4
requires explicit curricula, ordered membership, review boundaries, activity
placement, and summary variants. Completion equivalences permit idempotent
structural backfills without XP, streak, or receipt changes.

## Backend decision

No production backend is required for this milestone.

Use:

- local built-in Al-Fil package;
- local/mock downloadable package fixture;
- deterministic package compiler/export;
- interfaces that a future Studio/API can call.
