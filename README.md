# Al Furqan Academy

A mobile-first Quran learning app for Muslims aged 12+, adults, and families.

## What this project does

Helps learners:

- build a daily Quran habit;
- memorize short passages;
- understand translations and selected words;
- study concise, source-backed tafsir and context;
- practice with active recall;
- keep learning offline.

## Core principles

- **Canonical Quran text is never UI copy.**
- **Hafs ʿan ʿAsim only** in the current milestone.
- **Learning content is structured and reviewable.**
- **Interactive behavior is driven by approved schemas, not arbitrary code.**
- **Offline packages are immutable, validated, and atomically activated.**
- **Learner progress is separate from downloadable content.**

## Learning structure

`Roadmap -> Surah -> Level -> Step -> Block`

Levels are built from canonical ayat and learning activities. The app guides learners through orientation, listening, translation, word meanings, tafsir, guided memorization, recall exercises, understanding exercises, and completion.

## Current scope

- foundation architecture;
- canonical content rendering;
- level and session flow;
- content validation;
- offline package contracts;
- progress tracking;
- test foundation.

**Not included yet:** edition switching, Warsh support, AI-generated content, adaptive SRS, social features, subscriptions, or a full Studio web app.

## Getting started

1. Review `docs/` for product and architecture details.
2. Install dependencies using the existing package manager.
3. Run the baseline validation and test suite.
4. Make changes in small, reviewable steps.

## Development rules

- Use **Expo + React Native + strict TypeScript**.
- Keep Quran text canonical and edition-compatible.
- Do not hardcode lessons in routes or components.
- Use source IDs and review state for all authored content.
- Preserve existing working behavior.

## Validation

Run TypeScript, linting, unit tests, integration tests, and content validation before merging.
