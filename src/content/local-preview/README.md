# Local preview export

`EXPO_PUBLIC_FURQAN_LOCAL_PREVIEW=true` loads only a verified local package
through `src/lib/content/localPreviewProvider.ts`. It never enables draft
content in production.

The content pipeline replaces `surahs-105-114.preview.json` with an immutable
English/French package bundle and the adjacent integrity file with:

```ts
{
  schemaVersion: 1,
  packageId: 'surah-al-fil-v1',
  revisions: { en: '<revision>', fr: '<revision>' },
  payloadSha256: { en: '<SHA-256>', fr: '<SHA-256>' }
}
```

Each digest is calculated with `getPackagePayloadHash(package)`, which excludes
the governance envelope and uses the repository's stable serialization. The
provider verifies the digest, validates the development package, and requires
canonical ayat plus curriculum for every Surah from Al-Fil (105) through
An-Nas (114).

The checked-in `status` objects are non-content placeholders. Registry remains
empty until generation supplies Tanzil Arabic, QuranEnc English/French, source
evidence, and draft metadata. Bundle contains no audio or explanations.
