# Prompt for Cline / Codex / Antigravity

You are working on a Quran Habit mobile app.

Read these files first:
- AGENTS.md
- docs/PRODUCT_BRIEF.md
- docs/ARCHITECTURE_OVERVIEW.md
- docs/CONTENT_GOVERNANCE.md
- docs/MVP_SCOPE.md
- docs/IMPLEMENTATION_TASKS.md

Goal:
Build the MVP foundation for a Quran learning app for adults, teens 12+, and families.

MVP content:
Only Surah Al-Fil with 5 ayat.

Important rules:
- Do not hardcode Quran lessons inside UI screens.
- Use schema-first content packages.
- The UI renders content from `src/content/packages`.
- Do not invent religious content.
- All religious content must include source metadata and reviewer status.
- Audio is later, but add placeholder schema/component now.
- Backend is later.
- Use local progress first.

First implementation target:
Build the complete vertical slice:

Roadmap -> Ayah 1 Lesson -> Quiz -> Completion -> Local Progress

Then extend the same structure to Ayat 2-5.

Use TypeScript.
Keep components small.
Do not add unnecessary dependencies.
Do not build auth, backend, payment, voice AI, or full Quran import.