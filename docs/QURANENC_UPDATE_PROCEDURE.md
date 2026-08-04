# QuranEnc Translation Update Procedure

QuranEnc republication conditions require keeping translations up to date
with the latest version issued by the source. This document defines the
procedure for checking, reviewing, and adopting updates.

## Version pinning

Translation versions are pinned in two locations:

1. `apps/server/src/quranEnc.ts` — runtime version pins
2. `packages/content-preview/src/constants.ts` — preview fetch metadata

The server-side `QuranEncClient` compares the provider registry version
against the pinned version at runtime. If a version mismatch is detected,
the request fails closed with an error identifying the update candidate.

## Checking for updates

Run the QuranEnc-only fetch to detect version changes:

```bash
npm run content:preview:fetch-quranenc
```

If a version mismatch is detected, the script exits with an error:

```text
QuranEnc update candidate X.X.X requires review; pinned Y.Y.Y
```

## Review and adoption procedure

1. **Fetch the candidate version** for all preview surahs (105–114).
2. **Diff** the new responses against the stored pinned-version responses
   in `packages/content-preview/source-inputs/quranenc/`.
3. **Review changes** for translation accuracy, footnote integrity, and
   content governance compliance.
4. **Update the pinned version** in both files:
   - `apps/server/src/quranEnc.ts`: update `version` field
   - `packages/content-preview/src/constants.ts`: if preview metadata
     references a version
5. **Re-fetch and rebuild**:
   ```bash
   npm run content:preview:fetch-quranenc
   npm run content:preview:build
   ```
6. **Validate** the rebuilt preview package:
   ```bash
   npm run content:preview:validate
   ```
7. **Update retrieval evidence** hashes in `retrieval.json` files.
8. **Run the full test suite**:
   ```bash
   npm run typecheck && npm run test && npm run content:validate
   ```

## Schedule

Check for updates:

- Before every production release
- At least quarterly
- When notified by QuranEnc of a translation update

## Notification to source

QuranEnc condition 5 requires notifying the source of any notes or feedback.
If translation issues are discovered during review, report them to QuranEnc
before adopting the update.
