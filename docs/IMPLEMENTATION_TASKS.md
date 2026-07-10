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
- ContentSource
- SurahRecord
- AyahRecord
- TranslationEntry
- TafsirEntry
- LearningPath
- Level
- LevelStep
- LevelBlock
- QuizQuestion
- ProgressState

## Phase 2 - Content Repository

Create:

- `src/lib/content/repository.ts`
- `src/lib/content/packageValidator.ts`
- `src/lib/content/legacyAdapter.ts`

Functions:
- getCurrentLearningPath()
- getSurahById(id)
- getLevelById(id)
- getAyahByRef(ref)
- getAyatByRefs(refs)
- getNextLevel(id)
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

Content starts as canonical Surah/Ayah records plus LearningPath/Level curriculum. Quran/translation/tafsir fields must be source-attributed and review-marked.

## Phase 4 - Progress Store

Create:

- `src/lib/progress/progressStore.ts`

Functions:
- getProgress()
- markStepComplete(levelId, stepId)
- markLevelCompleted(levelId, pathId)
- addXp(amount)
- updateStreak()
- resetProgress()

Use AsyncStorage or local equivalent.

## Phase 5 - Roadmap

Create:

- `src/app/roadmap.tsx`
- `src/components/roadmap/RoadmapNode.tsx`

Show:
- Surah title
- progress bar
- nodes for levels
- locked/unlocked/completed states

## Phase 6 - Lesson Player

Create:

- `src/app/lesson/[levelId].tsx`
- `src/components/lesson/StepRenderer.tsx`
- `src/components/lesson/LevelBlockRenderer.tsx`
- `src/components/lesson/LevelQuestionBlock.tsx`

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

- `src/app/complete/[levelId].tsx`

Show:
- completed level
- XP gained
- streak
- next level button
- return to roadmap button

## Phase 10 - Polish

- Improve spacing.
- Improve Arabic rendering.
- Add safe placeholder illustrations.
- Add loading states.
- Add error boundaries.
- Add empty states.
- Add package validation warnings.
