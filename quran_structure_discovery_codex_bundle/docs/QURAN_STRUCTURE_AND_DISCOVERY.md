# Quran Structure and Discovery Architecture

## Core decision

Keep the learner hierarchy:

```text
LearningPath -> Level -> Step -> Block / Activity
```

Add a separate canonical navigation index:

```text
QuranEdition -> Surah -> Ayah -> QuranRange -> Juz / Hizb / Rub el Hizb
```

Curriculum references this index. It never duplicates or owns canonical Quran
structure.

## Hafs MVP division policy

The Hafs MVP supports:

- 30 Juz;
- 60 Hizb;
- 240 Rub el Hizb;
- 114 Surahs;
- canonical ayah references.

Use the internal name `thumun_al_hizb` for the user term “tomon”. Do not enable
or generate it for Hafs merely by splitting every Rub in half. It is an optional
source/riwayah-specific division and is enabled only when an approved source for
the selected edition supplies authoritative boundaries.

```ts
export type QuranDivisionKind =
  | 'juz'
  | 'hizb'
  | 'rub_el_hizb'
  | 'thumun_al_hizb';
```

Current Hafs configuration:

```ts
export const HAFS_ENABLED_DIVISIONS = [
  'juz',
  'hizb',
  'rub_el_hizb',
] as const;
```

## Canonical position model

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

`wordIndex` remains optional so exact source-backed boundaries can be added
later without forcing word-level navigation into the MVP.

## Division model

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
```

Do not store one `juzId`, `hizbId`, or `rubId` on a Surah. A Surah may cross
several divisions, and one division may include parts of several Surahs.

Use an ayah membership index:

```ts
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

Current Hafs records must not contain `thumunAlHizbNumber` unless a reviewed
Hafs source is deliberately added later.

## Pedagogical alignment

Canonical divisions and lesson levels are related but not equal.

```ts
export type CurriculumAlignment =
  | { type: 'surah'; surahNumber: number }
  | { type: 'ayah_range'; range: QuranRange }
  | { type: 'juz'; number: number }
  | { type: 'hizb'; number: number }
  | { type: 'rub_el_hizb'; number: number }
  | { type: 'custom_ranges'; ranges: QuranRange[] };
```

Rules:

- divisions support navigation, download grouping, progress summaries, and
  filtering;
- authors define pedagogical level boundaries;
- a course/module may align to a Rub or Hizb while levels remain ayah- or
  phrase-sized;
- never split an ayah automatically;
- warn when a memorization module unexpectedly crosses a Rub/Hizb boundary;
- do not sacrifice thematic coherence merely to force every level to equal one
  complete division.

## Search and filtering

Return two distinct result families:

1. Canonical Quran references:
   - Surah;
   - exact ayah;
   - ayah range;
   - Juz;
   - Hizb;
   - Rub el Hizb.

2. Published learning content:
   - courses/paths;
   - levels;
   - approved themes;
   - content types;
   - learning goals.

A valid ayah with no lesson should still resolve as a Quran reference and show
“No published lesson yet.” Never fabricate a lesson.

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

## Deterministic query parser

Support these forms first:

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

Do not implement semantic AI search now.

## Theme filtering

Use an approved taxonomy. Never infer themes from raw text at runtime.

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

Paths and levels declare reviewed theme IDs.

## Package context

Reduce reliance on one mutable global active package using the smallest
compatible extension:

```ts
export type ContentScope = {
  activePackageIds: string[];
  editionId: QuranEditionId;
  studyLocale: Locale;
};
```

Repository methods should accept a scope or be created from a scoped repository
factory. Preserve existing single-package behavior and avoid a broad rewrite.

## Repository APIs

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

## Data ingestion

Do not manually type a full Quran index.

```text
Approved metadata source
-> server/CLI/build-time importer
-> normalized structure index
-> validation
-> versioned metadata snapshot
-> repository
```

First prove the model with Al-Fil. A later lightweight full-Quran metadata
package may contain only:

- 114 Surah records;
- 6236 Hafs ayah references;
- Juz/Hizb/Rub membership;
- source/version/hash metadata;
- no full tafsir, lessons, audio, or media.

## Production validation

Reject:

- unsupported division kind for the edition;
- invented Hafs Thumun values;
- invalid Quran references or reversed ranges;
- duplicate or inconsistent division records;
- unresolved lesson references;
- unapproved themes or learner content;
- package leakage across scopes.

Warn:

- a level unexpectedly crosses Rub/Hizb;
- an ayah has no published lesson;
- a course lacks discovery metadata;
- a requested path exists but is not installed.
