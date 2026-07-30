# Implementation Tickets — Quran Structure, Search, and Discovery

## Ticket 0 — Stabilize the branch

Before new feature work:

- fix the TypeScript error in `legacyPackageAdapter.ts`;
- preserve the production gate blocking the current draft content;
- reset the lesson ScrollView to the top when advancing steps;
- record the dirty working tree and avoid overwriting unrelated work;
- run typecheck, tests, lint, content validation, diff check, and Expo export.

Acceptance:

- TypeScript passes;
- existing tests pass;
- draft-content validation remains blocked as designed;
- each new step starts at the top.

## Ticket 1 — Quran location and division types

Add or adapt:

- `QuranPosition`;
- `QuranRange`;
- `QuranDivisionKind`;
- `QuranDivision`;
- `AyahStructureIndex`;
- `CurriculumAlignment`.

Rules:

- Hafs enables Juz/Hizb/Rub only;
- Thumun remains unsupported in the current Hafs source;
- no boundaries are invented;
- no learner UI changes.

## Ticket 2 — Structure indexes and repository queries

Add:

- division lookup;
- ayah-to-division lookup;
- division-to-ayah lookup;
- Surah/ayah/range resolution;
- source/version/hash metadata.

Preserve canonical IDs and repository ownership.

## Ticket 3 — Deterministic query parser

Support:

- Surah number/name;
- exact `surah:ayah`;
- ayah range;
- Juz;
- Hizb;
- Rub;
- plain subject/theme text.

No semantic AI search.

## Ticket 4 — Course and level filtering

Extend existing discovery metadata and repository methods to filter by:

- Surah/ayah/range;
- Juz/Hizb/Rub;
- approved theme;
- content type;
- learning goal;
- locale;
- duration;
- audience;
- downloaded state.

Filtering must preserve prerequisites and return Quran references separately
from learning content.

## Ticket 5 — Minimal discovery UI

Without redesigning the app, add:

```text
Search / Filter
-> Quran reference results
-> Published learning-path results
```

Controls may include:

- search input;
- Surah/Juz/Hizb/Rub selector;
- theme chips;
- downloaded filter.

Show a clear “No lesson available yet” state.

## Ticket 6 — Explicit package scope

Introduce the smallest `ContentScope` or scoped repository wrapper.

Acceptance:

- current single-package flow works;
- two package fixtures do not leak resources/assets;
- results identify the package that owns a path.

## Ticket 7 — Lightweight structure importer boundary

Add a fixture-first CLI/build-time import contract for:

- Surahs;
- ayah references;
- Juz/Hizb/Rub membership;
- source version/hash.

Do not import full lessons, tafsir, translation, or audio.

## Ticket 8 — Regression and governance

Test:

- Progress V3;
- V2-to-V3 migration;
- attempts and reviews;
- package activation/rollback;
- roadmap locks;
- search/filter;
- package scoping;
- production gate;
- accessibility;
- Expo export.

Never approve draft religious content through code.
