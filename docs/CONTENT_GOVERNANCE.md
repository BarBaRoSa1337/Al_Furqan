# Content Governance

## Golden rule

Never publish Quran text, translation, tafsir, word meaning, context, activity, answer, summary, reflection, audio association, or derived explanation without trusted source metadata and the required review state.

## Review states

```ts
type ReviewStatus = 'draft' | 'reviewed' | 'approved';
```

- `draft`: development preview only;
- `reviewed`: checked but not approved for learner release;
- `approved`: allowed in production.

Development may show warnings. Production must reject non-approved learner-facing religious content.

## Canonical Quran policy

- MVP edition is Hafs ʿan ʿAsim.
- Canonical Arabic text is imported from a verified, versioned source.
- Canonical text is never manually authored inside a lesson or editable in the Studio.
- Ayah IDs, references, word token IDs, source version, and checksums are preserved.
- Juz/hizb/rubʿ ranges require a verified source.
- Do not invent missing full-Quran division data.

## Resource separation

Keep distinct:

- translation;
- tafsir;
- historical context;
- occasion of revelation;
- tafsir summary;
- reflection/wisdom;
- word gloss;
- recitation.

A translation must not silently include an unsourced tafsir rewrite.

## Derived content

Every derived explanation, summary, reflection, and activity must include:

- source IDs;
- its own review status;
- reviewer record when approved;
- locale;
- version or revision ID.

## Activity governance

- Required activities must test material taught earlier.
- Correct answers use stable IDs, not display order.
- Matching choices must be independently randomized.
- Canonical Quran text used in an answer remains source-backed.
- Typed-answer normalization must be documented and tested.
- Self-rated recall must not be described as verified recitation accuracy.

## Audio governance

Every recitation track must identify:

- reciter;
- Quran edition;
- ayah reference;
- source;
- license record;
- checksum;
- processing/segmentation provenance when applicable.

Do not pair non-Hafs audio with the Hafs MVP text.

## Media governance

Allowed examples:

- landscapes;
- maps;
- animals where appropriate;
- architecture/environment;
- abstract Islamic geometry;
- explanatory diagrams.

Avoid depictions of Allah, prophets, angels, and unseen realities.

Media requires alt text, source/license metadata, and review state. Animation needs a reduced-motion fallback.

## Studio governance

- Authors and editors cannot edit canonical Quran text.
- Shaykh approval is separate from technical validation.
- Publisher cannot bypass failed religious or technical gates.
- Published versions are immutable.
- Changes create a new version and require appropriate re-review.
- The reviewer must see learner-facing wording, answers, and media, not only source records.

## Production gates

A package cannot publish or activate when it contains:

- unresolved sources;
- non-approved learner-facing religious content;
- incompatible edition resources;
- invalid Quran references;
- invalid activities or answers;
- checksum mismatch;
- missing required assets;
- unsupported schema version.

Run the repository's content validation and release checks before shipping.
