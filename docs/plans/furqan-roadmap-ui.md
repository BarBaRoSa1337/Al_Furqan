# Furqan Roadmap UI Handoff

Status: implemented. Scope: roadmap UI + Quran search only.

## Shape

```text
Roadmap -> SurahRoadmap -> AyahRoadmap -> level route
```

Reusable parts:

- `IslamicNodeFrame`: one SVG ornament shell; state colors injected.
- `RoadmapPath`: decoration only. Never controls layout.
- `SurahRoadmapNode`: Arabic Surah name + Latin transliteration beside it.
- `AyahRoadmapNode`: ayah number only.
- `surahRoadmapModel`: stable IDs, state, internal progress.
- `ayahRoadmapModel`: expands canonical ayah ranges; maps hidden intro/context/checkpoint/review to smart anchors.

No Surah-specific components. No hardcoded ayah text. Future package/API data feeds models.

## State

```text
completed = emerald
current   = emerald + gold
upcoming  = soft beige
```

Roadmap shows no locks, percentages, ayah counts, Makki/Madani, meanings, translations, cards, or bottom tabs.

Header: menu + `الفرقان` + streak/points. Menu opens Search, Profile, Settings.

## Search

`/discover` is the dedicated Search screen; route name stays for compatibility.

Search accepts ayah reference, Arabic text, Surah name, Juz, Hizb. Mobile merges backend results with active-package local fallback. Results show Arabic/reference data only; no translation or religious explanation.

Server endpoint:

```text
GET /v1/quran/search?q=<query>&language=<en|fr|ar>
```

Provider search is bounded, quick, uncached, and normalized. Only explicit transliterations may become `displayName`.

## Rules for future agents

- Keep node/path components generic; never add `AlXNode` files.
- Keep path decorative and responsive. Tap target >= 44px.
- Keep Arabic Quran content in packages/structure, never UI literals.
- Keep progress separate from content packages.
- Do not re-add bottom navigation or roadmap metadata.
- Do not put translations, tafsir, or lesson copy in roadmap nodes.
- Preserve `/discover`, stable IDs, deep-link `?ayah=`, RTL, and accessibility labels.
- If changing provider search, retain local offline fallback and translation-free normalization.

## Checks

Passed: `npm run typecheck`, `npm run server:typecheck`, `npm run lint`, `npm test` (44 suites/194 tests), `npm run server:test`, `npm run structure:validate`, Expo web export, `git diff --check`.

Known baseline: production content validation still reports existing draft/unapproved governance records. This roadmap change adds no religious content.
