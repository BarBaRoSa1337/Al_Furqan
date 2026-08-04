# Local Preview Source Package

This directory is for a development-only, source-backed preview of Surahs
105-114. It is not a production release and does not change any editorial or
Islamic review records.

Place manually downloaded files in `source-inputs/` using the layout requested
by the importer. Tanzil input must be the official Uthmani text plus its
`LICENSE.txt`; QuranEnc input must contain the raw registry response and raw
Surah responses for `english_rwwad` and `french_rashid`.

Run `npm run content:preview:build` after supplying all files. The command
fails before writing output when any input or provenance value is missing:

```bash
TANZIL_SOURCE_VERSION='<official-version>' \
TANZIL_RETRIEVED_AT='<ISO-8601-date>' \
npm run content:preview:build
```

`npm run content:preview:fetch-quranenc` downloads raw QuranEnc registry and
Surah responses plus hash-bound retrieval evidence. Tanzil is never downloaded
automatically.

Generated output is usable only with:

```text
EXPO_PUBLIC_FURQAN_CONTENT_MODE=preview
EXPO_PUBLIC_FURQAN_LOCAL_PREVIEW=true
```

Generation emits separate English and French lesson artifacts in one runtime
bundle. They intentionally contain no audio, tafsir, context, word meanings,
reflections, or wisdom cards.
