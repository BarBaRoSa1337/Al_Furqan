# Quran Habit App — Product Brief

## Vision

Help Muslims aged 12+, adults, and families build a sustainable daily relationship with the Quran through memorization, understanding, and active recall.

## Positioning

A memorization-first Quran habit companion with trusted explanations, structured exercises, offline lessons, and scholar-reviewed publishing.

## Initial Quran edition

The MVP uses:

```text
Hafs ʿan ʿAsim
```

The architecture remains edition-aware so another complete edition can be added later without mixing text, word tokens, fonts, audio, or exercise data.

## Initial content

Start with Surah Al-Fil and its five ayat, arranged into four short levels:

1. context + Ayah 1;
2. Ayah 2;
3. Ayat 3–4;
4. Ayah 5 + full-surah review.

## Quran navigation

Learners should eventually browse the same canonical content by:

- Surah;
- Juz;
- Hizb;
- current learning path;
- downloaded lessons;
- due or unfinished practice.

Juz and hizb are navigation indexes over Quran ranges. They do not replace the Surah/ayah model.

## Core user experience

A new-learning level follows an authored sequence:

```text
optional visual/context hook
-> listen and read the ayah
-> translation for non-Arabic learners
-> selected word meanings
-> concise trusted tafsir
-> guided repetition and recall
-> memorization exercise
-> one or two understanding exercises
-> reviewed wisdom or summary
-> completion
```

The Quran passage remains the center of the experience. Visuals support the lesson but do not replace the Quran.

## Memorization experience

The app should emphasize:

- repeat and reveal;
- missing-word completion;
- ordering words or segments;
- continuation selection;
- word-to-meaning matching;
- short writing exercises;
- review across multiple ayat.

Speech recognition and advanced SRS are later features.

## Language behavior

The app separates:

- interface language;
- study/explanation language;
- translation resource;
- tafsir resource;
- transliteration preference.

Arabic Quran text is always primary. Translation and transliteration are optional learning aids.

## Audio

Recitation is a first-class resource.

The first production-shaped audio experience should use:

- one approved Hafs reciter;
- ayah-level playback;
- repeat controls;
- local caching or package download;
- source and license metadata.

Multiple reciters, word timings, and voice evaluation come later.

## Offline behavior

Learners should be able to download a complete lesson package containing the required:

- lesson data;
- Hafs ayah references/text dependency;
- translations;
- tafsir/context;
- exercises;
- audio;
- images/SVG/animation assets.

Downloads must be versioned, checksum-verified, validated, and activated atomically.

## Content Studio direction

Lessons must not remain hardcoded.

A future Studio will allow authorized authors, editors, and shaykh reviewers to:

- choose Quran ranges;
- compose steps;
- attach trusted resources;
- create exercises;
- preview learner output;
- request changes;
- approve;
- publish immutable package versions.

The mobile app should consume published packages, not editable Studio database rows.

## Product principles

1. Religious accuracy before speed.
2. Memorization outcomes before decorative gamification.
3. One primary learning objective per step.
4. Short sessions with low cognitive load.
5. Offline-first where practical.
6. Positive progress without guilt-based punishment.
7. Architecture compatible with future Studio publishing.
