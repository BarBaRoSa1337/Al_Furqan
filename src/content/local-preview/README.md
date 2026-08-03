# Local preview export

`EXPO_PUBLIC_FURQAN_LOCAL_PREVIEW=true` loads only a verified local package
through `src/lib/content/localPreviewProvider.ts`. It never enables draft
content in production.

The content pipeline must replace `surahs-105-114.preview.json` with an
immutable `ContentPackage` and replace the adjacent
`surahs-105-114.preview.sha256.json` with:

```ts
{
  packageId: 'surah-al-fil-v1',
  revisionId: '<package revision>',
  payloadSha256: '<SHA-256 of stable package payload>'
}
```

The digest is calculated with `getPackagePayloadHash(package)`, which excludes
the governance envelope and uses the repository's stable serialization. The
provider verifies the digest, validates the development package, and requires
canonical ayat plus curriculum for every Surah from Al-Fil (105) through
An-Nas (114).

Do not create a placeholder Quran package. The registry stays empty until an
export with Quran Foundation, QuranEnc, recitation, and draft governance
metadata has been generated through the approved content pipeline.
