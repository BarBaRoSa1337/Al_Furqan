# Architecture Overview

## Core Principle

Schema-first content.

The app should render structured Quran learning content from versioned packages.

Do not hardcode lessons inside screens.

## Content Hierarchy

Subject -> Track -> Unit -> Concept -> Step -> Block

For this app:

Subject = Quran  
Track = Short Surahs  
Unit = Surah Al-Fil  
Concept = Ayah 1 / Ayah 2 / Ayah 3 / Ayah 4 / Ayah 5  
Step = Read / Meaning / Words / Tafsir / Practice / Summary  
Block = Quran text / Translation / Word Explorer / Tafsir Card / Image / Quiz  

## Recommended Folders

src/
  app/
    _layout.tsx
    index.tsx
    roadmap.tsx
    lesson/[conceptId].tsx
    complete/[conceptId].tsx

  components/
    lesson/
      LessonPlayer.tsx
      StepRenderer.tsx
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
      RoadmapScreen.tsx
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
      contentRepository.ts
      packageValidator.ts
    progress/
      progressStore.ts
      progressTypes.ts
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

Responsible for:
- loading local content packages
- finding concept by ID
- listing roadmap nodes
- validating package structure

### Lesson Player

Responsible for:
- rendering steps
- tracking current step
- gating completion
- sending quiz results to progress store

### Block Renderer

Responsible for rendering each block by type.

Example:
- `quran_ayah`
- `translation`
- `word_explorer`
- `tafsir_card`
- `story_card`
- `image`
- `audio`
- `question`
- `summary`

### Quiz Engine

Responsible for:
- checking answers
- calculating score
- giving feedback
- returning completion status

### Progress Store

MVP uses local persistence.

Tracks:
- completed concepts
- completed steps
- quiz scores
- XP
- streak
- current concept

Backend comes later.

## Data Flow

Content Package
  -> Content Repository
  -> Roadmap
  -> Lesson Player
  -> Block Renderer
  -> Quiz Engine
  -> Progress Store
  -> Completion Screen

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