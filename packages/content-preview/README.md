# Local Preview Source Package

This directory is for a development-only, source-backed preview of Surahs
105-114. It is not a production release and does not change any editorial or
Islamic review records.

Fetch all source inputs only after reviewing and accepting the Tanzil Text
License:

```bash
TANZIL_TERMS_ACCEPTED=true npm run content:preview:fetch
npm run content:preview:build
```

The acceptance value must be exactly `true`. The fetch command downloads
Tanzil 1.1 Uthmani text and its official license notice, plus the QuranEnc
registry and Surah responses for `english_rwwad` and `french_rashid`. Raw
responses are stored unchanged with retrieval metadata and SHA-256 evidence.
`npm run content:preview:fetch-quranenc` remains available when only QuranEnc
inputs need refreshing.

Generated output is usable only with:

```text
EXPO_PUBLIC_FURQAN_CONTENT_MODE=preview
EXPO_PUBLIC_FURQAN_LOCAL_PREVIEW=true
```

Generation emits separate English and French lesson artifacts in one runtime
bundle. They intentionally contain no audio, tafsir, context, word meanings,
reflections, or wisdom cards.

Expo is rooted at the repository root. Start the generated package with:

```bash
EXPO_PUBLIC_FURQAN_CONTENT_MODE=preview \
EXPO_PUBLIC_FURQAN_LOCAL_PREVIEW=true \
npx expo start -c
```
