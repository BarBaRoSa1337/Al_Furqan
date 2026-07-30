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
- exact audio resource IDs and checksums in audio grants.

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

Quran Foundation grants default to a maximum seven-day retention unless a
separate written permission explicitly replaces that limit. See the
[Quran Foundation Developer Terms](https://api-docs.quran.foundation/legal/developer-terms/).

## Provider status

- Quran Foundation structure and Al-Husary audio remain development-only.
- QuranicAudio personal-use language is not treated as public-app permission.
- Sahih International and the current summarized tafsir remain unverified.
- MP3QuranNet remains disabled until a secure permission reference and
  repository-safe attestation cover the exact reciter/resources, public app
  distribution, streaming, segmentation, platform caching, and offline use.

Provider credentials are build/CLI secrets. Import scripts require
`QF_CLIENT_ID` and a short-lived `QF_ACCESS_TOKEN` and target the authenticated
Quran Foundation content endpoint. Credentials never enter the Expo bundle.
