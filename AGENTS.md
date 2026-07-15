# Quran Habit App — Agent Instructions

## Read first

Before editing code, read:

1. `docs/PRODUCT_BRIEF.md`
2. `docs/MVP_SCOPE.md`
3. `docs/ARCHITECTURE_OVERVIEW.md`
4. `docs/QURAN_EDITION_AND_DIVISIONS.md`
5. `docs/MEMORIZATION_ACTIVITIES.md`
6. `docs/OFFLINE_CONTENT_PACKAGES.md`
7. `docs/STUDIO_PUBLISHING.md`
8. `docs/CONTENT_GOVERNANCE.md`
9. `docs/FOUNDATION_MIGRATION_TICKETS.md`
10. `docs/IMPLEMENTATION_TASKS.md`

Inspect the repository before proposing new folders or replacing working architecture.

## Product

Build a calm, trusted, mobile-first Quran learning application for Muslims aged 12+, adults, and families.

The product helps learners:

- build a daily Quran habit;
- memorize short passages;
- understand translations and selected words;
- learn concise, source-backed tafsir and context;
- practice with active-recall exercises;
- continue offline.

The MVP uses **Hafs ʿan ʿAsim** only.

## Current architecture

The active learning hierarchy is:

```text
Roadmap -> Surah -> Level -> Step -> Block
```

The domain is divided into:

1. canonical Quran content;
2. learning curriculum;
3. media and recitation resources;
4. downloadable content packages;
5. learner progress and attempts;
6. a future Studio publishing contract.

Existing foundation tickets T1–T15 are complete. Preserve the working roadmap, level session controller, canonical block renderer, content validator, progress migration, and test foundation.

## Hard rules

- Expo + React Native + strict TypeScript.
- Arabic Quran text is canonical data, never UI copy.
- Do not hardcode lessons in route or component files.
- Do not let `SurahRecord` own levels.
- Levels reference canonical ayat.
- Juz, hizb, and rubʿ are range/index records, not fields guessed from a surah.
- Hafs text, word tokens, audio, and memorization data must be edition-compatible.
- Translation, tafsir, context, word meanings, summaries, and questions require source IDs and review state.
- Draft or merely reviewed religious content must not ship in production.
- Canonical Quran text must not be editable by a future Studio.
- Interactive behavior must come from approved schemas and evaluators, never arbitrary executable lesson code.
- Content package activation must be validated and atomic.
- Learner progress must remain separate from downloadable content packages.
- Use the repository's existing package manager and scripts.
- Add dependencies only when necessary and explain why.

## UX sequence

A normal new-learning level should support this authored order:

```text
optional orientation
-> listen/read Quran
-> translation when needed
-> selected word meanings
-> concise tafsir
-> guided memorization
-> memory exercise
-> one or two understanding exercises
-> reviewed wisdom/summary
-> completion
```

Array order is the sequencing mechanism. Do not create a complex sequencing engine.

## Memorization-first scope

Prioritize these reusable activities:

- recall then reveal;
- complete a missing token;
- order words or short segments;
- choose the correct continuation;
- match Arabic words to meanings;
- type missing text with an explicit comparison policy;
- order short ayat in a review level.

Questions must reference knowledge taught earlier in the level.

## Offline and Studio direction

The mobile app consumes immutable, versioned, validated packages.

The future flow is:

```text
Studio draft
-> editorial review
-> shaykh review
-> technical validation
-> immutable package
-> storage/CDN
-> mobile download
-> staged validation
-> atomic activation
```

Do not build the complete Studio or backend in the current milestone. Build the shared package contract, validators, and export boundary first.

## Current milestone non-goals

Do not add:

- Warsh support or an edition switcher;
- full-Quran import without a verified source and explicit task;
- voice recognition;
- AI-generated religious explanations;
- adaptive SRS;
- leaderboards;
- social features;
- subscriptions;
- a complete Studio web application;
- unrelated UI redesign.

## Completion report

After implementation, report:

1. files changed;
2. migrations introduced;
3. backward-compatibility behavior;
4. tests and validation run;
5. known risks;
6. deferred work.
