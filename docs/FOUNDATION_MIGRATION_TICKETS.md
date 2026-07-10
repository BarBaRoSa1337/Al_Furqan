# Foundation Migration Tickets

## T1 Progress naming/storage
Status: done.
Scope: app progress writes `completedLevelIds`, `completedLearningPathIds`, `currentLevelId`; level/path records use `qlp_level_*` and `qlp_path_*`.
Compat: old `completedLessonIds`, `completedPackageIds`, `currentLessonId`, `qlp_lesson_*`, and `qlp_package_*` are read for migration only.

## T2 Native level questions
Status: done.
Scope: `question` level blocks render via `LevelQuestionBlock`, using quiz widgets directly.
Compat: legacy `QuizLessonBlock` remains only for old `BlockRenderer` callers.

## T3 Remove unused legacy components
Status: done.
Scope: deleted old `LessonRenderer` and unused `components/roadmap/RoadmapScreen`.
Compat: active routes keep their existing visual structure.

## T4 Direct level flow
Status: done.
Scope: roadmap, lesson, and completion routes read `LearningPath` and `Level` directly.
Compat: temporary content adapter remains for legacy package fields and non-question block rendering.

## T5 Source validation
Status: done.
Scope: package validator checks source references from surah metadata, ayat, tafsir, translations, learning paths, and level blocks.
Compat: draft review states warn; missing source IDs fail validation.

## T6 Resumable level progress
Status: done.
Scope: entering a level creates/resumes `LevelProgress`; completing a step saves its ID and the next current step ID; path progress mirrors stored levels.
Compat: legacy completed lesson records still migrate into read-only level progress.

## T7 Question attempts
Status: done.
Scope: every submitted native quiz answer is stored in `LevelProgress.questionAttempts` with answer, result, and timestamp.
Compat: no XP, analytics, or retry policy is introduced yet.

## T8 Native canonical block rendering
Status: done.
Scope: `LevelBlockRenderer` renders canonical ayah, tafsir, context, word explorer, question, and summary blocks directly from repository records.
Compat: `BlockRenderer` remains isolated for legacy package consumers; active level flow no longer imports it.
