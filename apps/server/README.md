# Furqan Provider Backend

This workspace is the only production boundary for Quran Foundation credentials
and provider normalization. The Expo application must never call Quran
Foundation directly or persist its responses.

## Providers

- Quran Foundation Content API v4: canonical Hafs text, words, structure and
  approved tafsir. Server cache entries honor `no-store` and upstream expiry,
  and are capped at seven days. Expired data is deleted; stale fallback is not
  served.
- QuranEnc: exact pinned Rowwad English (`1.0.19`) and Rashid French (`1.0.3`)
  payloads. A provider version change fails closed until reviewed.
- MP3Quran: Al-Husary, reciter `118`, mushaf `118`, riwayah `1`. The server
  validates catalog identity, HTTPS host, timings, response type and size. The
  returned URL is stream-only.
- Mafateeh: disabled. The adapter exposes only a permission record until written
  rights exist.

## Operations

Copy `.env.example` into deployment secrets. Never use `EXPO_PUBLIC_` for Quran
Foundation credentials. `MemoryServerCache` is suitable for tests and local
development only; production must provide an expiry-reliable cache implementing
`ServerCache`.

The HTTP boundary permits only narrow GET routes, checks CORS origins, limits
URL size, applies a fixed-window rate limit, returns `nosniff`, and sends mobile
responses with `Cache-Control: no-store`.

```sh
npm run server:typecheck
npm run server:test
npm run server:dev
```

## Draft short-Surah runtime course

Development can assemble the English Al-Fil-to-An-Nas practice course in
memory from Quran Foundation, pinned QuranEnc Rowwad `1.0.19`, and MP3Quran
Al-Husary streams. Set `FURQAN_ENABLE_DRAFT_RUNTIME=true` on the server and
`EXPO_PUBLIC_INITIAL_PACKAGE_ID=surah-al-fil-v1` in Expo.

The endpoint returns `no-store`; Expo registers the package in memory and does
not persist Quran Foundation payloads. Arabic and French course publications
remain explicitly unavailable until complete reviewed package catalogs exist.
