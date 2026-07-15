# Offline Content Packages

## Goal

Allow learners to install complete, validated lesson packages for reliable offline learning.

## Package boundary

A package may contain:

- curriculum levels;
- references or included snapshots for required canonical data;
- translations;
- tafsir/context;
- word glosses;
- activities;
- recitation audio;
- images;
- SVG;
- generic animation assets;
- source/license metadata.

Learner progress is never stored inside the content package.

## Manifest

```ts
export type PackageFileKind =
  | 'content'
  | 'quran_text'
  | 'division_index'
  | 'translation'
  | 'tafsir'
  | 'word_data'
  | 'audio'
  | 'image'
  | 'svg'
  | 'animation';

export type PackageFile = {
  path: string;
  kind: PackageFileKind;
  bytes: number;
  checksum: string;
  optional: boolean;
};

export type ContentPackageManifest = {
  id: string;
  schemaVersion: string;
  contentVersion: string;
  editionId: QuranEditionId;
  learningPathIds: string[];
  surahIds: string[];
  locales: Locale[];
  files: PackageFile[];
  totalBytes: number;
  contentHash: string;
  publishedAt: string;
  sourceRegistryVersion: string;
  signature?: string;
};
```

## Install states

```ts
type PackageInstallStatus =
  | 'not_installed'
  | 'downloading'
  | 'staged'
  | 'validating'
  | 'active'
  | 'failed'
  | 'update_available';
```

## Safe installation

```text
fetch manifest
-> create staging directory
-> download/copy required files
-> verify size and checksums
-> parse schema
-> validate sources, review states, edition compatibility, and references
-> atomically switch active pointer
-> retain previous valid version for rollback
```

Never activate a partially downloaded package.

## Storage rules

- Use package ID + version in storage paths.
- Keep a small installed-package registry.
- Keep the previous active version until the new version is confirmed.
- Remove abandoned staging directories safely.
- Package deletion must not delete learner progress.
- Built-in and downloaded packages must expose the same repository interface.

## Curriculum schema migration

The current Al-Fil content package uses curriculum schema v2. V2 requires semantic lesson step kinds, explicit completion rules, and validation that separates teaching blocks from practice activities.

Schema-v1 packages remain readable through a repository/session adapter: missing step kinds are inferred from the existing blocks and legacy completion behavior is retained. A package upgrade never deletes learner progress; an unfinished session is moved back only when it skipped a newly inserted required step.

Activity review schedules are immutable package curriculum. Learner review stages and due dates remain in Progress V3. Review state is keyed by level, activity, and package revision; activating a new revision retains old state but only matching active-revision entries can enter the due queue.

Al-Fil package `2.2`/revision `r4` expands Levels 2–4 while preserving stable level and legacy activity IDs. Existing completed progress and rewards remain valid; only successful activities authored with a review schedule seed the active r4 review queue.

## Current milestone

Implement:

- manifest types and schema;
- installed-package registry;
- staging/validation/activation state machine;
- atomic active-version pointer;
- rollback;
- local fixture or mocked downloader tests.

A real remote endpoint is not required.

## Validation

Reject packages with:

- checksum mismatch;
- missing required files;
- unsupported schema version;
- incompatible Quran edition;
- unresolved canonical/resource references;
- draft or reviewed-only production content;
- duplicate IDs;
- invalid activities;
- missing source/license records;
- invalid file paths or path traversal attempts.

## Media behavior

Media files are optional only when the lesson remains usable without them.

Every visual asset needs:

- alt text;
- source/license metadata when external;
- review state;
- fallback when required;
- reduced-motion fallback for animation.

## Audio behavior

Audio tracks must declare:

- reciter;
- Hafs edition compatibility;
- ayah reference;
- source;
- license record;
- checksum;
- local or remote asset location.

Do not mix audio from another edition with Hafs text.
