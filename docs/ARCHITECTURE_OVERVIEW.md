# Architecture Overview

## Core Principle

Schema-first content.

The app should render structured Quran learning content from versioned packages.

Do not hardcode lessons inside screens.

## Content Hierarchy

Roadmap -> Surah -> Level -> Step -> Block

Layers:

- Canonical Quran content: `SurahRecord`, `AyahRecord`, translations, tafsir, word meanings, sources.
- Learning curriculum: `LearningPath`, `Level`, `LevelStep`, `LevelBlock`.
- Learner state: level progress, question attempts, XP, streak.

Rules:

- `SurahRecord` never owns levels.
- Levels reference ayat by `AyahRef`; Quran Arabic is stored only in canonical ayah records.
- Difficulty belongs to `Level`.
- Context and tafsir are distinct block families.

## Recommended Folders

src/
  app/
    _layout.tsx
    index.tsx
    roadmap.tsx
    lesson/[levelId].tsx
    complete/[levelId].tsx

  components/
    lesson/
      StepRenderer.tsx
      LevelBlockRenderer.tsx
      BlockRenderer.tsx
      blocks/
        QuranAyahBlock.tsx
        TranslationBlock.tsx
        WordExplorerBlock.tsx
        TafsirCardBlock.tsx
        StoryCardBlock.tsx
        ImageBlock.tsx
        AudioBlock.tsx
        QuestionBlock.tsx
        SummaryBlock.tsx

    quiz/
      MultipleChoiceQuestion.tsx
      FillBlankQuestion.tsx
      MatchQuestion.tsx

    roadmap/
      RoadmapNode.tsx

    ui/
      Button.tsx
      Card.tsx
      ProgressBar.tsx
      Screen.tsx

  content/
    packages/
      al-fil.v1.ts
    sources/
      quranText.ts
      translations.ts
      tafsir.ts
    assets/

  lib/
    content/
      repository.ts
      legacyAdapter.ts
      packageValidator.ts
    progress/
      storage.ts
    quiz/
      quizEngine.ts
    i18n/
      localizedText.ts

  types/
    content.ts
    quiz.ts
    progress.ts

## Main Modules

### Content Repository

Responsible for loading local packages, exposing canonical records, exposing learning path/level APIs, and validating package structure.

### Lesson Player

Responsible for rendering level steps, tracking current step, gating required questions, and completing levels.

### Step / Block Renderers

`StepRenderer` renders `LevelStep`.
`LevelBlockRenderer` resolves `AyahRef`/tafsir refs against canonical content and renders native question blocks.
`LevelBlockRenderer` also renders canonical context, word explorer, and summary blocks directly.
`BlockRenderer` is isolated compatibility for legacy lesson-shaped blocks and is not used by the active level flow.

### Quiz Engine

Responsible for:
- checking answers
- calculating score
- giving feedback
- returning completion status

### Progress Store

MVP uses local persistence.

Tracks:
- completed levels
- completed steps
- quiz scores
- XP
- streak
- current level

Backend comes later.

## Data Flow

Content Package -> Content Repository -> Roadmap -> Level Player -> Step Renderer -> Level Block Renderer -> Progress Store -> Completion Screen

## MVP Backend Decision

No backend for MVP.

Use local storage first.

Add Supabase later for:
- auth
- family accounts
- multi-device sync
- parent dashboard
- analytics
- subscriptions
