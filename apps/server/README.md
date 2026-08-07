# Furqan Provider Backend

This workspace is the only production boundary for Quran Foundation credentials
and provider normalization. The Expo application must never call Quran
Foundation directly or persist its responses.

## Quran.Foundation SDK boundary

`QuranFoundationProvider` implements the generic `QuranContentProvider`
contract using `@quranjs/api/server`. The assessment runtime maps Content API
v4 chapter metadata, Uthmani Hafs verses, words, translation footnotes, tafsir,
chapter information, and verse recitation into the existing Furqan package
schema. QuranEnc and MP3Quran adapters remain available to their narrow legacy
routes, but they are not mixed into this runtime course.

Cache entries honor upstream `no-store` and lower expiry values and are always
capped at seven days. Expired content is deleted; stale content is never served.
Mobile responses are `no-store` and Quran.Foundation responses are not written
into downloadable packages or mobile persistence.

## Operations

Copy `.env.example` to the ignored `apps/server/.env` file before starting the
local server. Never use `EXPO_PUBLIC_` for Quran.Foundation credentials. Use
separate secret-manager values for PRELIVE and production. `MemoryServerCache` is
suitable for tests and local development only; production must provide an
expiry-reliable cache implementing `ServerCache`.

`QF_ENV` must be exactly `prelive` or `production`; Expo cannot select it.
`QF_TRANSLATION_RESOURCE_ID` is required. Tafsir, chapter-information, and
recitation IDs are optional and must be selected explicitly from the account's
available resources. List safe resource metadata with:

```sh
npm run server:qf:resources
```

The HTTP boundary permits only narrow GET routes, checks CORS origins, limits
URL size, applies a fixed-window rate limit, returns `nosniff`, and sends mobile
responses with `Cache-Control: no-store`.

```sh
npm run server:typecheck
npm run server:test
npm run server:dev
```

To let Expo load the development runtime course, copy the repository-root
`.env.example` to `.env` and set `EXPO_PUBLIC_FURQAN_API_BASE_URL` to the
server URL. Use `http://localhost:8787` for Expo web. For a physical phone,
use the development machine's LAN address, for example
`http://192.168.1.12:8787`, and include the Expo web origin and/or the app's
development origin in `FURQAN_ALLOWED_ORIGINS`.

Preview mode is explicit and requires both
`FURQAN_ENABLE_DRAFT_RUNTIME=true` on the server and
`EXPO_PUBLIC_FURQAN_CONTENT_MODE=preview` in Expo. A missing or invalid Expo
mode defaults to production. Preview fails visibly when the backend is absent;
it never substitutes the Al-Fil-only fixture for the ten-Surah course.

Production requests use a separate published-package provider. They cannot
consume the preview provider and every response is revalidated using the full
production source, license, approval, hash, and locale-publication gates.

## Draft short-Surah runtime course

Development can assemble the English Al-Fil-to-An-Nas practice course in
memory from the official Quran.Foundation SDK. Set
`FURQAN_ENABLE_DRAFT_RUNTIME=true` on the server,
`EXPO_PUBLIC_FURQAN_CONTENT_MODE=preview`, and
`EXPO_PUBLIC_INITIAL_PACKAGE_ID=surah-al-fil-v1` in Expo.

The endpoint returns `no-store`; Expo registers the package in memory and does
not persist Quran.Foundation payloads. Arabic and French course publications
remain explicitly unavailable until complete reviewed package catalogs exist.
The response is labeled `contentMode: preview`; its locale publication remains
`draft` and is never rewritten as published.

Automated tests inject mocked SDK responses and require no credentials. If
credentials or the required translation resource are absent at runtime, server
startup fails with a technical configuration error instead of fabricating
content. PRELIVE resource availability is account-dependent and must be checked
with `server:qf:resources`; production Search and user authentication remain out
of scope until their additional scopes are granted.
