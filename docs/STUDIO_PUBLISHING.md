# Studio and Publishing Contract

## Evidence-bound compilation

Studio diagnostics preserve validator codes such as
`approval_missing_or_stale`, `license_grant_missing_or_insufficient`, and
`religious_citation_missing`. The compiler accepts repository-safe approval and
license attestations but never accepts reviewer status as sufficient proof.

Authors preview a deterministic package payload, obtain reviews against its
SHA-256, attach the resulting attestations, and compile the immutable package.
Any subsequent payload change requires new matching approvals.

## Decision

A content Studio is needed so lessons do not remain hardcoded and authorized shaykhs can review learner-facing material.

Do not build the complete Studio in the current milestone.

Build the shared publishing contract and deterministic package compiler first.

## Future Studio users

```ts
export type StudioRole =
  | 'author'
  | 'editor'
  | 'shaykh_reviewer'
  | 'publisher'
  | 'administrator';
```

## Responsibilities

### Author

- selects Quran ranges;
- arranges steps;
- drafts explanations and activities;
- attaches sources and media.

### Editor

- improves language and learning structure;
- cannot modify canonical Quran text.

### Shaykh reviewer

- reviews translation selection, tafsir/context summaries, reflections, questions, answers, and media;
- approves or requests changes;
- sees diffs since the previous review.

### Publisher

- publishes only religiously approved and technically valid content.

### Administrator

- manages users, roles, source registry, and package policies.

## Publication states

```ts
export type PublicationStatus =
  | 'draft'
  | 'editorial_review'
  | 'changes_requested'
  | 'shaykh_review'
  | 'religiously_approved'
  | 'ready_to_publish'
  | 'published'
  | 'archived';
```

Suggested flow:

```text
draft
-> editorial review
-> shaykh review
-> changes requested or religiously approved
-> technical validation
-> ready to publish
-> immutable published version
```

## Canonical Quran lock

The Studio must let users select:

- edition;
- Surah;
- ayah/range;
- word tokens.

It must not allow free editing of:

- canonical Quran Arabic;
- ayah numbering;
- Hafs edition identity;
- division markers.

## Shared schemas

The Studio, compiler, API, and mobile app must share the same:

- domain types;
- runtime schemas;
- package manifest;
- activity validators;
- source registry contracts;
- publication diagnostics.

Avoid duplicated TypeScript definitions.

## Current implementation boundary

Implement now:

1. publishable content DTO/schema;
2. publication status and role types;
3. validator diagnostics with machine-readable paths/codes;
4. deterministic `compilePackage(draft)` function or CLI;
5. stable output ordering and content hash;
6. local Al-Fil fixture compilation;
7. tests proving compiled output is accepted by the mobile package validator.

Do not implement now:

- Studio authentication;
- database;
- browser editor;
- file upload service;
- real CDN publishing;
- email notifications;
- collaborative editing.

## Review diagnostics

Validators should return structured errors:

```ts
type ValidationDiagnostic = {
  severity: 'warning' | 'error';
  code: string;
  path: string;
  message: string;
  sourceId?: string;
};
```

This lets a future Studio show the exact field that blocks publication.

## Immutable publication

Publishing creates a new version. It does not mutate the previously published package.

A published record should retain:

- package ID;
- version;
- content hash;
- schema version;
- approved review IDs;
- source registry version;
- compiler version;
- publication timestamp.
