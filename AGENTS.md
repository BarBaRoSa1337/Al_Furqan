# Quran Habit App - Agent Instructions

You are coding a mobile-first Quran learning MVP for adults, teens, and families.

The app helps users build a daily Quran habit through:
- ayah-by-ayah learning
- memorization support
- word meanings
- short tafsir cards
- story/context cards
- interactive quizzes
- streaks, XP, and progress

This is NOT a generic quiz app.
This is a trusted Islamic learning product.

## Product Positioning

A gamified Quran companion for Muslims aged 12+ and families.  
The app helps users memorize, understand, and reflect on Quran daily through short guided sessions.

## MVP Scope

Build the foundation using only Surah Al-Fil, 5 ayat.

MVP includes:
- roadmap screen
- Surah Al-Fil intro
- 5 ayah lessons
- word explorer
- tafsir/context cards
- basic quiz types
- local progress
- XP/streak placeholder
- completion screen

Do NOT build:
- authentication
- backend
- payment
- AI-generated tafsir
- voice recognition
- full Quran
- parent dashboard
- complex social/gamification features
- dynamic content CMS

## Technical Direction

Use:
- Expo
- React Native
- TypeScript
- Expo Router
- local JSON/TypeScript content packages
- AsyncStorage or local storage for progress
- component-driven architecture

Prefer:
- schema-first content
- reusable lesson renderer
- content repository pattern
- no hardcoded lesson UI
- no Quran text inside React components

## Architecture Rule

The UI never owns Quran content.

The UI only renders trusted, versioned, reviewed content packages.

## Religious Content Rules

Never invent Quran text, tafsir, or religious claims.

All Quranic content must include source metadata:
- Quran Arabic source
- translation source
- tafsir source
- reviewer status

Child/family-friendly explanations must be derived from trusted tafsir and marked as draft until reviewed.

Do not depict:
- Allah
- prophets
- angels
- unseen matters
- sacred events in a disrespectful way

Use respectful Islamic wording.

## Coding Rules

- Use TypeScript strictly.
- Create small reusable components.
- Keep business logic out of screens.
- Keep content in `src/content`.
- Keep progress logic in `src/lib/progress`.
- Keep rendering logic in `src/components/lesson`.
- Do not hardcode Surah Al-Fil directly in route files.
- Add graceful fallbacks for missing images/audio.
- Audio should be supported in schema but can be placeholder in MVP.

## Initial Folder Structure

src/
  app/
  components/
    lesson/
    roadmap/
    quiz/
    ui/
  content/
    packages/
    sources/
    assets/
  lib/
    content/
    progress/
    quiz/
    i18n/
  types/

docs/
  PRODUCT_BRIEF.md
  ARCHITECTURE_OVERVIEW.md
  CONTENT_GOVERNANCE.md
  MVP_SCOPE.md
  IMPLEMENTATION_TASKS.md

## First Goal

Build one complete vertical slice:

Roadmap -> Surah Al-Fil Intro -> Ayah 1 Lesson -> Quiz -> Completion -> Progress saved locally.

After that, duplicate the pattern for Ayat 2-5.