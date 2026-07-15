# Foundation Migration Tickets

## Completed foundation

T1–T15 are complete and must remain working:

- progress naming/storage migration;
- native level questions;
- legacy renderer removal;
- direct level flow;
- source validation;
- resumable level progress;
- question attempts;
- canonical block rendering;
- completion/validator hardening;
- test foundation;
- atomic Progress V2;
- production content gate;
- level session controller;
- legacy model removal;
- SDK/mobile quality.

Refer to repository history for the full completed-ticket detail.

## T16 — Hafs edition identity and canonical positions

Status: planned.

Scope:

- add explicit `hafs-an-asim` edition;
- edition-aware ayat and word tokens;
- Quran position/range types;
- source version/checksum metadata;
- migrate Al-Fil package references.

Compatibility:

- preserve existing stable ayah and level IDs where possible;
- add repository adapters rather than changing routes.

## T17 — Juz/Hizb/Rub indexes

Status: planned.

Scope:

- division records and indexes;
- queries by division;
- source-backed minimal fixture or verified dataset integration;
- validation of ranges and references.

Compatibility:

- Surah roadmap remains primary;
- no UI redesign required.

## T18 — Memorization activity domain

Status: planned.

Scope:

- shared activity schema;
- stable token/segment answer references;
- knowledge references;
- review/source metadata;
- pure evaluators.

Compatibility:

- existing native questions remain readable or are adapted through one activity boundary;
- no duplicate competing engines.

## T19 — Memorization activity UI and persistence

Status: planned.

Scope:

- recall/reveal;
- missing token;
- token/segment ordering;
- word-meaning matching;
- optional typed missing text;
- attempt persistence through Progress V2.

Compatibility:

- retain idempotent XP and existing completion receipts.

## T20 — Audio resource foundation

Status: planned.

Scope:

- reciter/track records;
- Hafs compatibility;
- source/license/checksum;
- local/remote resolution;
- repeat-ready player contract.

Compatibility:

- no unapproved audio fetch;
- lesson remains usable without optional audio unless explicitly marked required.

## T21 — Offline package manifest and installer

Status: planned.

Scope:

- manifest schema;
- staging;
- checksums;
- validation;
- atomic activation;
- rollback;
- installed registry;
- fixture downloader tests.

Compatibility:

- built-in and downloaded packages share repository APIs;
- progress remains separate.

## T22 — Studio publishing contract

Status: planned.

Scope:

- roles;
- publication states;
- publishable schemas;
- structured diagnostics;
- deterministic compiler/export.

Compatibility:

- no Studio UI/backend;
- compiler output matches mobile package schema.

## T23 — Al-Fil production-shaped vertical slice

Status: planned.

Scope:

- explicit Hafs edition;
- division discoverability;
- guided memorization;
- memory activity;
- understanding activity;
- reviewed summary;
- package/export fixture.

Compatibility:

- preserve current roadmap and level access behavior.

## T24 — Release hardening

Status: planned.

Scope:

- migration tests;
- activity security/correctness tests;
- package failure/rollback tests;
- production content/edition gates;
- accessibility and build validation.
