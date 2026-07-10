# Implementation Tasks

## Phase 0 - Repo Setup

- Confirm Expo app runs.
- Confirm TypeScript works.
- Confirm Expo Router works.
- Add folder structure.
- Add base theme tokens.
- Add Arabic font support if available.
- Add RTL layout handling.

## Phase 1 - Types

Create:

- `src/types/content.ts`
- `src/types/quiz.ts`
- `src/types/progress.ts`

Define:
- LocalizedText
- QuranSource
- ContentPackage
- Subject
- Track
- Unit
- Concept
- LessonStep
- LessonBlock
- QuizQuestion
- ProgressState

## Phase 2 - Content Repository

Create:

- `src/lib/content/contentRepository.ts`
- `src/lib/content/packageValidator.ts`

Functions:
- getPackage()
- getRoadmap()
- getConceptById(id)
- getNextConcept(id)
- validatePackage(package)

## Phase 3 - Surah Al-Fil Package

Create:

- `src/content/packages/al-fil.v1.ts`

Include:
- package metadata
- source metadata
- intro concept
- 5 ayah concepts
- final review concept

Content can start as draft placeholders, but Quran/translation/tafsir fields must be clearly marked with source metadata and review status.

## Phase 4 - Progress Store

Create:

- `src/lib/progress/progressStore.ts`

Functions:
- getProgress()
- markStepComplete(conceptId, stepId)
- markConceptComplete(conceptId)
- addXp(amount)
- updateStreak()
- resetProgress()

Use AsyncStorage or local equivalent.

## Phase 5 - Roadmap

Create:

- `src/app/roadmap.tsx`
- `src/components/roadmap/RoadmapScreen.tsx`
- `src/components/roadmap/RoadmapNode.tsx`

Show:
- Surah title
- progress bar
- nodes for intro, ayat 1-5, review
- locked/unlocked/completed states

## Phase 6 - Lesson Player

Create:

- `src/app/lesson/[conceptId].tsx`
- `src/components/lesson/LessonPlayer.tsx`
- `src/components/lesson/StepRenderer.tsx`
- `src/components/lesson/BlockRenderer.tsx`

Support:
- step navigation
- next button
- required quiz step
- completion gate
- progress saving

## Phase 7 - Blocks

Create block components:

- QuranAyahBlock
- TranslationBlock
- WordExplorerBlock
- TafsirCardBlock
- StoryCardBlock
- ImageBlock
- AudioBlock placeholder
- QuestionBlock
- SummaryBlock

## Phase 8 - Quiz

Create:

- `src/lib/quiz/quizEngine.ts`
- `src/components/quiz/MultipleChoiceQuestion.tsx`
- `src/components/quiz/FillBlankQuestion.tsx`
- `src/components/quiz/MatchQuestion.tsx`

Support:
- answer selection
- check answer
- correct/incorrect feedback
- score returned to progress

## Phase 9 - Completion

Create:

- `src/app/complete/[conceptId].tsx`

Show:
- completed lesson
- XP gained
- streak
- next lesson button
- return to roadmap button

## Phase 10 - Polish

- Improve spacing.
- Improve Arabic rendering.
- Add safe placeholder illustrations.
- Add loading states.
- Add error boundaries.
- Add empty states.
- Add package validation warnings.