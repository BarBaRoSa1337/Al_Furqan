# MVP Scope — Updated Foundation

## Product scope

Quran Habit App for teens aged 12+, adults, and families.

## Content scope

Only Surah Al-Fil, five ayat, four learning levels.

## Edition scope

Only **Hafs ʿan ʿAsim**.

No learner-facing edition selector in this milestone.

## Must have

### Canonical Quran foundation

- `QuranEdition` for Hafs;
- canonical `SurahRecord`, `AyahRecord`, and edition-aware `WordToken`;
- source/version/checksum metadata for canonical text;
- Quran positions and ranges;
- Juz, hizb, and optional rubʿ division indexes;
- repository queries by Surah, Juz, and Hizb.

### Learning experience

- authored Level -> Step -> Block flow;
- Quran passage;
- translation;
- word explorer;
- tafsir/context;
- guided memorization step;
- memorization activities;
- understanding activities;
- reviewed summary/wisdom;
- existing completion and progress behavior.

### Memorization activities

Required for the first vertical slice:

- recall then reveal;
- complete missing token;
- order words or segments;
- match word to meaning.

Supported in schema and tests:

- choose continuation;
- type missing text;
- order ayat.

Typing may remain optional and non-blocking in the first learner-facing slice.

### Offline package foundation

- versioned manifest;
- required/optional files;
- checksums;
- staged validation;
- atomic activation;
- rollback to the last valid package;
- installed-package registry;
- progress preserved across package updates.

A local fixture or mocked downloader is enough until a real publishing endpoint exists.

### Audio foundation

- edition-aware reciter metadata;
- ayah-level track metadata;
- local/remote asset resolution;
- source and license record;
- repeat-ready player contract.

Do not download or redistribute real audio unless the repository already contains an approved source configuration.

### Studio-ready publishing contract

- shared publishable schemas;
- publication states;
- role definitions;
- validator output suitable for a Studio;
- deterministic package export/compile boundary.

Do not build the complete Studio UI or backend yet.

## Should have

- image, SVG, and generic animation asset references;
- reduced-motion fallback;
- download status UI placeholder;
- clear development warnings for draft content;
- source sheet or source metadata access;
- tests for repository queries, activity evaluators, manifests, and production gates.

## Later

- complete Studio web application;
- authentication and role management;
- remote publishing API;
- more surahs and full Quran dataset;
- Warsh edition;
- multiple reciters;
- word-level audio timing;
- speech recognition;
- adaptive SRS;
- family sync and parent dashboard;
- subscriptions and social features.

## Definition of done

The milestone is complete when:

1. Existing Al-Fil roadmap and level flow still work.
2. Al-Fil resolves through an explicit Hafs edition.
3. Repository can list/find Al-Fil through Surah, Juz, and Hizb indexes.
4. Canonical Quran text is not duplicated inside curriculum levels.
5. One level includes guided memorization plus required memory and understanding activities.
6. Activity attempts persist through the existing progress architecture.
7. A fixture package can be staged, checksum-checked, validated, and atomically activated.
8. A deterministic publish/export command or function emits the same package format used by mobile.
9. Production validation rejects unapproved religious content and incompatible edition resources.
10. Format, lint, typecheck, tests, content validation, and build pass.
