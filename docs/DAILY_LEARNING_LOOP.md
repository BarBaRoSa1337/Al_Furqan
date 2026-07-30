# Daily Learning Loop

## Runtime architecture

The mobile app renders immutable package payloads through:

```text
Lesson route
-> level session controller
-> DailyLearningLoop
-> StepRenderer
-> LevelBlockRenderer / activity renderer
-> canonical/resource repositories
-> Progress V3
```

`Level.steps` array order remains authoritative. A backend or future Studio can change the sequence by compiling a new validated package; route and component code do not encode lesson order.

The daily route renders every teaching step plus required interaction. Optional interactive steps are deliberately excluded from this focused loop and exposed as a separate, completion-gated practice session. This keeps a new-learning session to a small number of exercises while retaining authored reinforcement. Legacy progress pointing at an extracted practice step resumes at the next core step, while unfinished required steps still take priority.

The current Al-Fil thematic path maps one meaning-focused circle to each stable `Level`: context plus Ayah 1, Ayah 2, Ayat 3–4, then Ayah 5 plus full review.

## Content provider boundary

Quran.com API v4 and QuranEnc are upstream publishing inputs, not live learner-screen dependencies:

```text
provider API
-> server-side importer
-> normalized Hafs/resource records
-> source and license review
-> scholar/editorial review
-> deterministic package compiler
-> checksum-verified mobile package
```

This preserves offline use, reproducible builds, canonical Quran locking, and production approval gates. Provider credentials and unrestricted network clients must not enter the Expo bundle.

Quran.com may supply candidate Uthmani text, word data, and edition-compatible recitation metadata. QuranEnc may supply candidate translations or concise tafsir resources by locale. Imported data remains draft until its source, license, edition compatibility, checksums, and required religious review are recorded.

## Media behavior

`MediaBlock` selects package-declared image, SVG, or animation assets with alt text, source/license metadata, review state, and reduced-motion fallback. `AudioBlock` selects Hafs-compatible recitation tracks declared by the package.

The current development package renders an Al-Husary ayah player for Al-Fil.
Native playback attempts to start after the active ayah resolves; web waits for
an explicit learner gesture. The player loads only the active track, provides
repeat controls, and pauses on app background.

Media policy is resolved before loading. The current unlicensed development
audio streams with a warning and is not persisted. Evidence-backed grants may
enable SHA-256-verified, source-specific native or web caching with explicit
expiry. See `docs/CONTENT_RIGHTS_AND_AUDIO_CACHE.md`.
