# Codex Master Prompt — Quran Structural Indexing, Consistent Divisions, Search, and Course Filtering

Read `AGENTS.md` and all project documentation before editing.

Inspect the current repository first. The repository is the source of truth
when this prompt conflicts with implemented names or newer storage versions.

## Preserve the current foundation

Preserve:

- Expo + React Native + TypeScript;
- Hafs ʿan ʿAsim MVP;
- package-authored `LearningPath -> Level -> Step -> Block / Activity`;
- canonical Quran repository;
- generic block/activity renderers;
- Progress V3 and V2-to-V3 migration;
- deterministic review scheduler;
- activity attempts and idempotent completion receipts;
- offline package validation, activation, and rollback;
- Studio compiler contract;
- production content approval gate.

Do not create a second Quran repository, progress store, review scheduler,
activity engine, source registry, package format, or Studio model.

Do not perform a broad UI redesign.

## First pass — inspection only

Before modifying files:

1. inspect canonical Quran types and repositories;
2. inspect existing Juz/Hizb/Rub metadata;
3. inspect `LearningPath`, Level, theme, and discovery metadata;
4. inspect package compiler/validator and offline activation;
5. inspect the mutable active-package singleton;
6. inspect current search/filter utilities;
7. run baseline typecheck, tests, lint, content validation, diff check, and Expo
   export;
8. report stale assumptions, duplicate-system risks, and minimum changes.

Do not modify files during this first pass.

## Immediate stabilization

Before the discovery milestone:

1. fix the `legacyPackageAdapter.ts` TypeScript error without weakening types;
2. preserve the current draft-content production failures;
3. reset lesson scroll position when advancing steps;
4. avoid overwriting uncommitted changes;
5. rerun baseline checks.

## Main goal

Add a canonical Quran structure and discovery layer so users can:

- navigate by Surah;
- navigate by exact ayah or ayah range;
- navigate by Juz;
- navigate by Hizb;
- navigate by Rub el Hizb;
- filter published paths by Quran location;
- filter paths by approved subject/theme;
- filter by content type, goal, language, duration, audience, and download state;
- see canonical Quran-reference results even when no lesson is published.

Keep the roadmap as the structured learning experience. Search and filtering
must not detach arbitrary steps from path prerequisites.

## Terminology and edition policy

The current Hafs MVP supports:

```text
30 Juz
60 Hizb
240 Rub el Hizb
114 Surahs
canonical ayah references
```

Normalize the user term “tomon” internally as `thumun_al_hizb`.

Do not enable or generate Thumun al-Hizb for the current Hafs package. Thumun is
an optional source/riwayah-specific division. Enable it only when an approved
metadata source for the selected edition explicitly provides boundaries.

```ts
export type QuranDivisionKind =
  | 'juz'
  | 'hizb'
  | 'rub_el_hizb'
  | 'thumun_al_hizb';

export const HAFS_ENABLED_DIVISIONS = [
  'juz',
  'hizb',
  'rub_el_hizb',
] as const;
```

Never create Thumun boundaries by mechanically halving a Rub.

## Canonical positions and ranges

Add or adapt:

```ts
export type AyahRef = {
  surahNumber: number;
  ayahNumber: number;
};

export type QuranPosition = AyahRef & {
  wordIndex?: number;
};

export type QuranRange = {
  start: QuranPosition;
  end: QuranPosition;
};
```

Do not add learner-facing word-level division navigation now.

## Division model

Add or adapt:

```ts
export type QuranDivision = {
  id: string;
  editionId: QuranEditionId;
  kind: QuranDivisionKind;
  number: number;
  range: QuranRange;
  sourceId: string;
  sourceVersion: string;
  contentHash?: string;
};

export type AyahStructureIndex = {
  editionId: QuranEditionId;
  ayahRef: AyahRef;
  juzNumber: number;
  hizbNumber: number;
  rubElHizbNumber: number;
  thumunAlHizbNumber?: number;
  pageNumber?: number;
  rukuNumber?: number;
  manzilNumber?: number;
};
```

Rules:

- do not put one division ID on `SurahRecord`;
- Surahs may cross divisions;
- divisions may contain parts of several Surahs;
- metadata is source-backed and immutable;
- current Hafs records must not contain Thumun values.

## Pedagogical alignment

Do not equate Quran divisions with lesson levels.

```ts
export type CurriculumAlignment =
  | { type: 'surah'; surahNumber: number }
  | { type: 'ayah_range'; range: QuranRange }
  | { type: 'juz'; number: number }
  | { type: 'hizb'; number: number }
  | { type: 'rub_el_hizb'; number: number }
  | { type: 'custom_ranges'; ranges: QuranRange[] };
```

Use divisions for stable navigation, downloads, aggregation, and filtering.
Use ayah/phrase-sized levels for microlearning.

Do not split an ayah automatically. Emit a warning when a memorization module
unexpectedly crosses a Rub or Hizb boundary.

## Discovery query model

Add or adapt:

```ts
export type QuranLookup =
  | { type: 'surah'; surahNumber: number }
  | { type: 'ayah'; ayahRef: AyahRef }
  | { type: 'ayah_range'; range: QuranRange }
  | { type: 'juz'; number: number }
  | { type: 'hizb'; number: number }
  | { type: 'rub_el_hizb'; number: number };

export type DiscoveryFilters = {
  quranLookup?: QuranLookup;
  themeIds?: string[];
  contentTypes?: CourseContentType[];
  learningGoals?: LearningGoal[];
  studyLocale?: Locale;
  maximumMinutesPerLevel?: number;
  audience?: 'teen' | 'adult' | 'family';
  downloadedOnly?: boolean;
  approvedOnly?: boolean;
};
```

Do not expose Thumun filters until the active edition/source enables them.

## Deterministic query parser

Support:

```text
Al-Fil
Surah 105
105:1
105:1-5
Juz 30
Hizb 60
Rub 240
patience
stories
memorization
```

```ts
export type ParsedDiscoveryQuery =
  | { kind: 'quran_lookup'; lookup: QuranLookup }
  | { kind: 'text'; normalizedText: string }
  | { kind: 'empty' };
```

Requirements:

- validate Surah and ayah ranges;
- validate Juz 1–30;
- validate Hizb 1–60;
- validate Rub 1–240;
- never silently clamp invalid values;
- return structured diagnostics;
- Surah-name aliases are data-driven and localizable;
- no semantic AI search.

## Themes and subjects

Reuse or add a controlled taxonomy:

```ts
export type Theme = {
  id: string;
  parentId?: string;
  title: LocalizedText;
  aliases?: LocalizedText;
  description?: LocalizedText;
  sourceIds: string[];
  reviewStatus: ReviewStatus;
};
```

Paths and levels declare approved theme IDs. Do not infer themes from raw
translation or tafsir text in the mobile app. Do not recommend Fiqh until its
separate governance model exists.

## Repository APIs

Add or adapt the smallest equivalent APIs:

```ts
getSurahByNumber(number, scope)
getAyahByRef(ref, scope)
getAyahsInRange(range, scope)
getDivision(kind, number, scope)
listDivisions(kind, scope)
getDivisionsForAyah(ref, scope)
getAyahRefsInDivision(kind, number, scope)
parseDiscoveryQuery(query, scope)
searchQuranMetadata(query, scope)
listLearningPaths(filters, scope)
listLevels(filters, scope)
findLearningContentForQuranLookup(lookup, scope)
```

Filtering must:

- be deterministic;
- preserve path prerequisites;
- exclude draft/unpublished content in production;
- respect locale and audience;
- return Quran references separately from courses;
- clearly identify a Quran reference with no lesson.

## Package/content scope

Address the mutable singleton risk with the smallest compatible extension.

Use a scoped repository or:

```ts
export type ContentScope = {
  activePackageIds: string[];
  editionId: QuranEditionId;
  studyLocale: Locale;
};
```

Do not rewrite every repository call in one ticket.

Acceptance:

- current single-package behavior remains;
- two-package tests show no resource/asset leakage;
- search results identify the owning package/path;
- shared canonical metadata remains stable.

## Import policy

Do not manually type a full Quran structure index.

Add a server/CLI/build-time import boundary for:

- 114 Surahs;
- Hafs ayah references;
- Juz/Hizb/Rub membership;
- source version/hash.

Quran Foundation may be used as the operational importer because it supports
chapter, Juz, Hizb, and Rub queries. A local Hafs metadata library may be used
for build-time verification only, not as a second runtime source of truth.

Do not make live provider calls from Expo screens. Do not import full Quran
tafsirs, translations, lessons, or audio in this milestone.

First implement a deterministic Al-Fil fixture and import contract. Treat full
real metadata activation as a separate reviewed ticket.

## Minimal UI

Do not redesign navigation. Add a small discovery entry point that separates:

```text
Quran references
Published learning paths
```

Filters may include:

- Surah;
- Juz;
- Hizb;
- Rub;
- subject/theme;
- content type;
- language;
- downloaded status.

Actions:

- open/preview Quran reference;
- continue/open an approved path;
- show “No lesson available yet” when needed.

Never generate a lesson automatically for an uncovered ayah.

## Validation

Reject:

- unsupported division kind for the active edition;
- any Hafs Thumun value without an approved Hafs source;
- invalid Quran references or reversed ranges;
- invalid Juz/Hizb/Rub numbers;
- duplicate division IDs/numbers;
- unresolved lesson references;
- unknown or draft production themes;
- cross-package leakage.

Warn:

- course lacks discovery metadata;
- level unexpectedly crosses Rub/Hizb;
- valid Quran reference has no published path;
- requested path exists only in a non-installed package;
- query cannot be resolved.

## Tests

Add focused tests for:

### Structure

- Al-Fil ayat resolve to correct source-backed Juz/Hizb/Rub fixture values;
- Surah crossing divisions is supported;
- division-to-ayah and ayah-to-division queries agree;
- invalid ranges are rejected;
- Hafs Thumun is rejected;
- optional wordIndex is preserved.

### Query parser

- Surah name/number;
- exact ayah;
- ayah range;
- Juz;
- Hizb;
- Rub;
- theme text;
- invalid inputs;
- localized aliases.

### Filtering

- Quran lookup;
- theme;
- content type;
- goal;
- locale;
- duration;
- audience;
- downloaded state;
- production approval;
- deterministic ordering.

### Package scope

- two installed package fixtures;
- no cross-package asset/resource leakage;
- shared canonical metadata stable;
- single-package compatibility.

### Regression

- TypeScript;
- roadmap and locks;
- Progress V3;
- V2-to-V3 migration;
- attempts;
- reviews;
- package activation/rollback;
- production content gate;
- accessibility;
- Expo export.

## Implementation order

1. inspection and baseline;
2. stabilize TypeScript and scroll transition;
3. location/division types and schemas;
4. Al-Fil structure fixture;
5. repository indexes/queries;
6. query parser;
7. discovery/filter APIs;
8. theme integration;
9. minimal package scope;
10. minimal discovery UI;
11. focused tests;
12. full regression checks;
13. report full metadata import as the next separate ticket.

Keep every intermediate change buildable.

## Non-goals

Do not implement:

- full Studio UI/backend;
- full Quran lesson/content import;
- live mobile Quran Foundation calls;
- semantic AI search;
- emotional diagnosis or religious rulings;
- Fiqh recommendations;
- Warsh or edition switching;
- invented Hafs Thumun boundaries;
- voice recognition;
- Tajweed annotations;
- broad UI redesign.

## Acceptance criteria

The milestone is accepted when:

1. TypeScript passes.
2. Every new step starts at the top.
3. Hafs Juz/Hizb/Rub data is source-backed and validated.
4. Thumun remains disabled for Hafs.
5. Every installed ayah can be queried by canonical reference.
6. Al-Fil can be found by Surah, ayah, Juz, Hizb, Rub, and approved theme.
7. Quran-reference results are distinct from course results.
8. Missing lessons produce a clear state.
9. Filtering preserves prerequisites.
10. No Surah-specific screen or lesson data is hardcoded.
11. Progress V3 and offline package behavior remain intact.
12. Draft records remain blocked unless genuinely approved.
13. Engineering checks pass.
14. Fixture work is not misreported as full-Quran activation.

## Required final report

Return:

1. baseline results;
2. stabilization fixes;
3. architecture reused;
4. files changed;
5. division/structure model;
6. Thumun policy;
7. parser behavior;
8. discovery filters;
9. package-scope changes;
10. UI scope;
11. exact tests/results;
12. content-gate status;
13. fixture versus real-data status;
14. limitations;
15. one recommended next ticket.

Classify work as:

```text
Implemented and tested
Fixture-only
Contract/stub only
Deferred
```
