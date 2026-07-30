# Quran Edition and Division Model

## MVP edition

The only active edition is:

```text
Hafs ʿan ʿAsim
```

Do not expose an edition selector.

## Edition model

```ts
export type QuranEditionId = 'hafs-an-asim';

export type QuranEdition = {
  id: QuranEditionId;
  qiraah: 'asim';
  riwayah: 'hafs';
  displayName: LocalizedText;
  textSourceId: string;
  fontProfileId: string;
  version: string;
  checksum?: string;
};
```

The type may be extended later, but current code must not pretend that changing a font or audio track changes the edition.

## Canonical references

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

`wordIndex` is optional but keeps the model capable of representing an exact division boundary.

## Canonical records

```ts
export type SurahRecord = {
  id: string;
  surahNumber: number;
  arabicName: string;
  translatedName: LocalizedText;
  ayahCount: number;
  mushafOrder: number;
  sourceIds: string[];
};

export type AyahRecord = {
  id: string;
  editionId: QuranEditionId;
  ref: AyahRef;
  arabicText: string;
  wordTokenIds: string[];
  sourceId: string;
  sourceVersion: string;
  checksum: string;
};

export type WordToken = {
  id: string;
  editionId: QuranEditionId;
  ayahRef: AyahRef;
  position: number;
  arabicText: string;
  sourceId: string;
};
```

Canonical Arabic text must not be stored in curriculum blocks.

## Quran divisions

```ts
export type QuranDivisionKind = 'juz' | 'hizb' | 'rub';

export type QuranDivision = {
  id: string;
  editionId: QuranEditionId;
  kind: QuranDivisionKind;
  number: number;
  range: QuranRange;
  sourceId: string;
  sourceVersion: string;
};
```

Do not add `juzNumber` or `hizbNumber` as a single field on `SurahRecord`. A Surah can cross divisions, and a division can contain parts of several surahs.

## Query behavior

Required APIs:

```ts
listDivisions(kind, editionId)
getDivision(kind, number, editionId)
listAyahRefsInDivision(kind, number, editionId)
listSurahsInDivision(kind, number, editionId)
getDivisionsForAyah(ref, editionId)
```

The repository may use precomputed indexes, but the canonical source remains the division range records.

## Validation

Production validation must reject:

- unknown edition IDs;
- duplicate Surah, ayah, word, or division IDs;
- invalid Surah/ayah positions;
- division start after division end;
- overlapping or missing numbered divisions when a complete dataset is declared;
- word tokens pointing to the wrong edition or ayah;
- curriculum references to unavailable ayat;
- missing source/version metadata.

## Data population rule

Do not invent or manually type full-Quran Juz/Hizb/Rub data. Full navigation
metadata is imported through `npm run structure:import` from Quran Foundation
Content API v4, normalized into `src/content/structure/hafs/full.json`, and
validated with `npm run structure:validate`.

The snapshot contains only navigation metadata: 114 Surah records, 6,236 Hafs
ayah coordinates, and 30/60/240 Juz/Hizb/Rub memberships. It is not a full
Quran-text import. `navigationOnly` Surah records must have no `AyahRecord`
payload and must exactly match the imported structure index count.

The snapshot source and its metadata remain draft until source review is
complete; production validation must continue to enforce that gate.
