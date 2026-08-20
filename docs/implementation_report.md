# Furqan Improvement Plan — Completion Report

## 1. Files Changed

*   `packages/content-preview/src/importer.ts`
    *   Merged `read`, `translation`, `word_meaning`, and `tafsir` into a single `Study the Ayah` step.
    *   Relaxed word meaning validation to allow partial data (`length > 0`).
*   `src/components/lesson/DailyLearningLoop.tsx`
    *   Removed redundant bottom feedback banner to rely entirely on instant inline activity feedback.
*   `src/components/lesson/LevelBlockRenderer.tsx`
    *   Added `DraftBadge` component for preview mode.
    *   Implemented `hasDraftStatus` checker for governed blocks.
    *   Cleaned up `CanonicalAyahBlock` source attribution behind a toggleable `(i)` icon.
*   `src/hooks/useLevelSession.ts`
    *   Reduced auto-advance delay for correct answers from 700ms to 500ms for snappier quiz feedback.
*   `src/app/complete/[id].tsx`
    *   Restricted confetti animation to `isFinalReview` levels only.
*   `src/components/lesson/AyahAudioPlayer.tsx`
    *   Added `autoplayBlocked` state.
    *   Added visible "Tap play to start audio" fallback for restrictive browser environments.

## 2. Migrations Introduced

*   **Step ID Migration**: Existing user progress in the `resume` state for mid-lesson ayah steps (e.g., `${id}-translation`, `${id}-word-meaning`) will now be mapped to the new unified `${id}-study` step. Progress is automatically handled by the `ContentPackage` adaptation logic since the new schema defines a valid unified step.

## 3. Backward-Compatibility Behavior

*   **Audio Cache**: No changes to the underlying `indexedDB` schema; audio caching remains compatible.
*   **Activity Engine**: Quiz evaluation logic was untouched. The only change was the *delay* between evaluation and advancing.
*   **Database Constraints**: No changes to the `sqlite` progress tables.

## 4. Tests and Validation Run

*   `npm run test` (Jest): **176/176 tests passed** across 39 suites. No regressions in curriculum generation, UI components, or the activity engine.
*   `npm run typecheck` (TypeScript): Completed successfully with 0 errors after importing `Ionicons` and adjusting styles in `LevelBlockRenderer.tsx`.

## 5. Known Risks

*   **Preview Content Discrepancy**: Because the `importer.ts` now wraps word meanings and tafsir in the unified read step *only if* they exist, any Surahs lacking this data will simply not show those UI sections rather than presenting a `source_locked` card. This is cleaner but means testers might not realize the data is missing unless they cross-reference the QF database.
*   **Audio Autoplay**: iOS Safari may still require a full screen tap before `expo-audio` initializes properly, though the UI will now prompt the user if it gets blocked.

## 6. Deferred Work

*   **P1-2**: Exercise Type Rotation (alternating between multiple choice, gap fill, and continuation).
*   **P2-1**: Surah Introduction with Chapter Info (Requires fetching new endpoints from Quran.Foundation).
*   **P2-2**: English Tafsir Integration (Requires verification of the QUL Al-Mukhtasar license terms).
