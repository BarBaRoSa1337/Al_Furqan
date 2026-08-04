# Content Rights and Verified Audio Cache

## Release profiles

Furqan validates packages against an explicit usage profile:

- `public-free`: public Android, iOS, and web distribution with no paid
  features assumed;
- `commercial`: the same distribution plus commercial use.

The initial product uses `public-free`. Public distribution is not personal
use. A future business-model change must validate every active package against
`commercial` before release.

## Evidence model

`ContentPackage.governance` contains repository-safe attestations:

```text
EvidenceReference
-> ApprovalAttestation
-> exact target ID and SHA-256

EvidenceReference
-> LicenseGrant
-> source, resources, content hashes, platforms, uses, and retention
```

Confidential contracts, emails, and reviewer records remain in secure external
storage. Packages contain their immutable reference IDs and SHA-256 digests.
Changing governed content, structure metadata, source declarations, or a
resource checksum invalidates the matching approval.

Legacy `reviewerStatus` remains readable and visible in development, but cannot
make a package production eligible by itself.

## Approval requirements

A production package requires:

- editorial, shaykh, and technical approval of its exact payload hash;
- technical approval of the exact Quran structure snapshot hash;
- legal approval of every exact source declaration;
- a current license grant covering the selected release profile and all target
  platforms;
- exact citations for tafsir records;
- exact audio resource IDs in audio grants; checksums are mandatory only for
  resources that may be persisted.

Use `npm run content:audit` for grouped blockers or
`npm run content:audit -- --json` for Studio/CI diagnostics.

## Audio policy

The player resolves a policy before loading media:

| Rights result | Runtime behavior |
| --- | --- |
| No grant in production | Playback blocked |
| No grant in development | Remote streaming with a visible warning; no persistence |
| Streaming-only grant | Remote streaming; no persistence |
| Cache grant | Download, verify SHA-256, then persist for the granted period |

Native bounded media uses the app cache directory. Web uses Cache Storage for
verified bytes and IndexedDB for source, grant, hash, fetch, and expiry
metadata. Expired, corrupt, grant-mismatched, and legacy unversioned entries are
deleted. Expiry is never extended while offline.

Quran Foundation data is fetched only by the Furqan backend. Server cache
entries honor `no-store` and upstream expiry and have a hard seven-day maximum.
Expired responses are deleted and are never served as stale fallback. The Expo
client receives `no-store` responses and does not persist provider payloads.

## Provider status

- Quran Foundation supplies canonical text, words, structure and approved
  tafsir through the backend; production credentials never enter Expo.
- QuranEnc Rowwad English `1.0.19` and Rashid French `1.0.3` are pinned. Their
  provider payloads are not rewritten and updates fail closed pending review.
- QuranicAudio is excluded.
- MP3Quran Al-Husary reciter `118`, mushaf `118`, riwayah `1` streams directly
  from the approved provider host. Furqan does not download, rehost or persist
  it. The published permission page is hash-bound as evidence; named legal
  approval is still required before the draft source can pass production.
- Local preview stores only validated MP3Quran stream/timing metadata for
  Surahs 105-114; it never stores MP3 bytes.
- Quran Foundation resource 169 tafsir and word-by-word meanings are resolved
  only by the backend. Local preview exposes source-lock cards and safe
  alternatives instead of copying or inventing these resources.
- Provider tafsir markup may be normalized for React Native display, while the
  exact provider text and its hash remain attached to the tafsir record.

Provider credentials are backend deployment secrets. `QF_CLIENT_ID` and
`QF_CLIENT_SECRET` are used only by `apps/server` for OAuth client credentials.
