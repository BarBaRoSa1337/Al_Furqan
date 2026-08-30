# Core Learning Flow Update

Date: 2026-08-30

## Scope

This update repairs localization, lesson sequencing, audio controls, and progress presentation without changing the established domain hierarchy:

```text
Roadmap -> Surah -> Level -> Step -> Block
```

Production review and source-license gates remain unchanged.

## Locale Ownership

Learner preferences now keep three independent locale values:

- `interfaceLocale`: application controls and screen direction;
- `lessonLocale`: authored curriculum and attempt/review scope;
- `contentLocale`: provider translation, word meaning, and tafsir selection.

Arabic Quran text always renders RTL. Translation and tafsir blocks use their resource locale. Missing religious content is omitted instead of silently falling back to another language. Missing application copy produces a development warning and a localized unavailable label, never a raw i18n key.

Preference storage moved from `furqan_learner_preferences_v1` to `furqan_learner_preferences_v2`. V1 values migrate automatically. Existing users inherit `contentLocale` from `lessonLocale` and autoplay remains enabled unless explicitly disabled.

## Runtime Content

Bundled EN, FR, and AR preview artifacts are integrity-checked and merged into one in-memory package at bootstrap. Repository registration and indexing happen once. Locale changes update selectors only; they do not reload, rehash, revalidate, or reindex the package.

The backend remains first provider priority. Quran.Foundation credentials remain server-only. Local preview remains preview-only and does not change approval state.

## Lesson Flow

Normal ayah lessons resolve this focused order from authored step arrays:

```text
Ayah study and optional recitation
-> available localized word meanings
-> available localized tafsir
-> one memory activity
-> one understanding activity
```

Source-lock placeholders and unavailable localized religious-resource steps are removed from the core loop. Optional extra drills remain in the separate practice session.

Ayah study uses exact canonical Arabic plus the exact selected translation and transliteration. Translation selection no longer falls back to another content locale.

## Audio

Recitation keeps provider tracks from package data. Player behavior now includes:

- persisted autoplay preference, enabled by default;
- preload/resolution state;
- play, pause, restart, speed, and repeat controls;
- browser autoplay fallback;
- unavailable/error message and retry action;
- non-blocking lesson continuation.

## Progress

Only the first incomplete lesson is visually current. Later lessons remain available and selectable. Progress counters use explicit LTR rendering to avoid bidi reversal.

Progress V5 storage format is unchanged. Restored snapshots are cached in memory outside tests, cloned before mutation, and invalidated after reset or failed writes. This removes repeated AsyncStorage reads and JSON parsing from normal selectors while preserving serialized writes and migration behavior.

## Compatibility

- Content package schema version is unchanged.
- `WordMeaning.locale` is optional; legacy records inherit source language.
- Existing Progress V2-V5 migration remains active.
- Existing package validation and production governance remain active.
- Existing Surah, level, activity, and progress IDs remain unchanged.

## Remaining Source Gaps

- Quran.Foundation runtime course generation currently publishes a complete English preview locale only. FR/AR backend resources need explicit configured resource IDs and complete provider mapping before being enabled.
- Local preview word meanings are English-only. FR/AR word-meaning steps are intentionally omitted.
- Tafsir appears only where the selected locale has a trusted provider entry.
- Real-device audio, browser autoplay fallback, RTL layout, and haptic timing require manual verification.
