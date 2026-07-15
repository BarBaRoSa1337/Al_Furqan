# Memorization Activities

## Goal

Make memorization the central interaction, not a generic quiz added after reading.

## Learning sequence

```text
listen/read
-> repeat
-> partially hide
-> recall
-> reconstruct
-> check
-> understand
-> review
```

A typical level should require:

- one memorization activity;
- one or two understanding activities.

## Activity kinds

```ts
export type ActivityKind =
  | 'recall_then_reveal'
  | 'fill_gap'
  | 'complete_missing_token'
  | 'order_tokens'
  | 'order_segments'
  | 'choose_continuation'
  | 'match_word_meaning'
  | 'match_ayah_translation'
  | 'type_missing_text'
  | 'order_ayat'
  | 'multiple_choice';
```

## Shared activity shape

```ts
export type LearningActivity = {
  id: string;
  kind: ActivityKind;
  ayahRefs: AyahRef[];
  instruction: LocalizedText;
  required: boolean;
  difficulty: 1 | 2 | 3 | 4 | 5;
  knowledgeRefs: string[];
  config: ActivityConfig;
  sourceIds: string[];
  reviewStatus: ReviewStatus;
};
```

`knowledgeRefs` must point to material introduced earlier in the same level or explicitly declared prerequisite content.

`complete_missing_token` remains a schema-v1 compatibility alias. New schema-v2 packages author `fill_gap`.

## First learner-facing activities

### Recall then reveal

The Quran text starts hidden. The learner recalls verbally or mentally, then reveals and self-rates.

Stored result:

```ts
type RecallRating = 'again' | 'hard' | 'remembered';
```

This is not machine-verified and must not be presented as recitation correctness.

### Complete missing token

Hide one or more canonical word tokens and ask the learner to choose from a token bank.

The correct answer uses stable word token IDs, never array position alone.

### Order tokens or segments

Shuffle stable token/segment IDs.

The correct order must be stored independently from the displayed shuffled order. Never render both columns or choices in answer order.

### Match word to meaning

Prompts and choices must be independently shuffled.

Evaluation uses stable word-gloss IDs.

### Match ayah to translation

Arabic segments reference canonical token IDs. Translation segments and pair IDs are package-authored, sourced, reviewed, and independently shuffled from Arabic prompts. Evaluation compares stable segment IDs.

## Completion contract

A level requires all authored teaching steps except `required: false` steps, at least one successful activity from a `memorize` or `memory_practice` step, and at least one successful activity/question from an `understanding_practice` step.

## Supported next activities

### Choose continuation

Show a passage prefix and multiple candidate continuations. Use canonical token or segment references.

The learner-facing contract keeps stable option IDs while resolving every Arabic label from canonical tokens:

```ts
config: {
  promptTokenIds?: string[];
  optionIds: string[];
  correctOptionId: string;
  segments?: ActivitySegment[];
}
```

With `segments`, each option may contain several tokens. Without them, option IDs are canonical `WordToken` IDs for backward compatibility. Options are shuffled once and evaluation uses the selected stable ID.

### Type missing text

Typing should be optional and non-blocking in the first slice.

Comparison policy must be explicit:

```ts
type TextComparisonMode =
  | 'letters_and_order'
  | 'exact_canonical';
```

For `letters_and_order`, answer normalization may:

- trim surrounding whitespace;
- collapse repeated whitespace;
- remove tatweel;
- optionally ignore configured harakat.

It must not silently replace letters or alter the displayed canonical Quran text.

Normalization applies only to the learner answer and a comparison copy.

The activity stores a canonical target, never copied Quran text:

```ts
type TypedAnswerTarget =
  | { kind: 'ayah'; ayahRef: AyahRef }
  | { kind: 'token_sequence'; tokenIds: string[] };
```

The evaluator resolves the expected string through the active content repository. The first learner slice uses `letters_and_order` with optional harakat, while preserving hamza/letter identity and canonical display text.

### Order ayat

Use only in a multi-ayah review after the ayat were taught.

The renderer resolves `correctOrderRefs` through the Quran repository, shuffles the ayah choices, and submits stable `surah:ayah` keys. Validation requires at least two unique refs and an exact set match with the activity ayah refs.

## Evaluation contract

```ts
type ActivityEvaluation = {
  correct: boolean;
  normalizedAnswer?: unknown;
  expectedAnswerRef?: unknown;
  feedbackKey: string;
};
```

Evaluators must be pure, deterministic, and unit-tested.

## Attempt persistence

Store:

```ts
type ActivityAttempt = {
  activityId: string;
  levelId: string;
  answer: unknown;
  correct: boolean;
  attemptedAt: string;
  evaluationVersion: string;
};
```

Completion XP must remain idempotent. Retrying must not create duplicate completion rewards.

## Deterministic spaced review

An activity may author `reviewSchedule.intervalDays`. Al-Fil Level 1 uses `[1, 3, 7]`.

- correct/Remembered advances one stage;
- Hard retains the current stage;
- incorrect/Again resets to stage zero;
- the last successful stage marks the activity mastered;
- package revision is part of review identity.

Completed-level catalog sync can seed missing review state from preserved successful attempts. Old revision state is retained but excluded from the active queue. This is deterministic offline review, not adaptive SRS.

## Validation rules

Reject or warn when:

- a required activity tests untaught knowledge;
- an activity references unavailable ayat, tokens, glosses, or segments;
- correct answers depend on display array order;
- matching prompts and choices are aligned in answer order;
- duplicate IDs make evaluation ambiguous;
- a typed-answer activity lacks a comparison policy;
- a review activity uses ayat not previously taught;
- an activity is production-visible without approved review state and sources.

## Accessibility

- Do not require drag gestures; provide tap-based alternatives.
- Every token and option needs an accessible label.
- Correctness cannot be communicated by color alone.
- Reordering must work with keyboard/screen-reader-friendly controls on web.
- Arabic text direction must remain RTL inside LTR interfaces.
