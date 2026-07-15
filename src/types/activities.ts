import { AyahRef, ReviewerStatus } from './content';

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

export type RecallRating = 'again' | 'hard' | 'remembered';
export type TextComparisonMode = 'letters_and_order' | 'exact_canonical';
export type ReviewOutcome = RecallRating | 'correct' | 'incorrect';

export interface ActivityReviewSchedule {
  intervalDays: number[];
}

interface ActivityBase {
  id: string;
  kind: ActivityKind;
  ayahRefs: AyahRef[];
  instruction: string;
  required: boolean;
  difficulty: 1 | 2 | 3 | 4 | 5;
  knowledgeRefs: string[];
  sourceIds: string[];
  reviewerStatus: ReviewerStatus;
  reviewSchedule?: ActivityReviewSchedule;
}

export interface RecallThenRevealActivity extends ActivityBase { kind: 'recall_then_reveal'; config: Record<string, never>; }
export interface FillGapActivity extends ActivityBase { kind: 'fill_gap' | 'complete_missing_token'; config: { tokenBankIds: string[]; correctTokenIds: string[] }; }
/** Backward-compatible name for packages authored before fill_gap. */
export type CompleteMissingTokenActivity = FillGapActivity;
export interface ActivitySegment { id: string; tokenIds: string[]; }
export interface OrderActivity extends ActivityBase { kind: 'order_tokens' | 'order_segments'; config: { itemIds: string[]; correctOrderIds: string[]; segments?: ActivitySegment[] }; }
export interface ChooseContinuationActivity extends ActivityBase {
  kind: 'choose_continuation';
  config: {
    optionIds: string[];
    correctOptionId: string;
    /** Canonical prefix shown before the learner selects the continuation. */
    promptTokenIds?: string[];
    /** Canonical multi-token options. Without segments, option IDs are WordToken IDs. */
    segments?: ActivitySegment[];
  };
}
export interface MatchWordMeaningActivity extends ActivityBase { kind: 'match_word_meaning'; config: { pairs: Array<{ promptTokenId: string; meaningId: string }> }; }
export interface MatchAyahTranslationActivity extends ActivityBase {
  kind: 'match_ayah_translation';
  config: {
    ayahSegments: ActivitySegment[];
    translationSegments: Array<{ id: string; text: string; translationEntryId: string }>;
    pairs: Array<{ ayahSegmentId: string; translationSegmentId: string }>;
  };
}
export type TypedAnswerTarget =
  | { kind: 'ayah'; ayahRef: AyahRef }
  | { kind: 'token_sequence'; tokenIds: string[] };
export interface TypeMissingTextActivity extends ActivityBase { kind: 'type_missing_text'; config: { target: TypedAnswerTarget; comparisonMode: TextComparisonMode; ignoreHarakat?: boolean }; }
export interface OrderAyatActivity extends ActivityBase { kind: 'order_ayat'; config: { correctOrderRefs: AyahRef[] }; }
export interface MultipleChoiceActivity extends ActivityBase { kind: 'multiple_choice'; config: { options: Array<{ id: string; text: string }>; correctOptionId: string }; }

export type LearningActivity = RecallThenRevealActivity | FillGapActivity | OrderActivity | ChooseContinuationActivity | MatchWordMeaningActivity | MatchAyahTranslationActivity | TypeMissingTextActivity | OrderAyatActivity | MultipleChoiceActivity;

export interface ActivityEvaluation { correct: boolean; normalizedAnswer?: unknown; expectedAnswerRef?: unknown; feedbackKey: string; }
export interface ActivityValidationContext { availableAyahRefs: AyahRef[]; availableTokenIds: string[]; availableMeaningIds: string[]; availableTranslationEntryIds: string[]; taughtKnowledgeRefs: string[]; }
export interface ActivityValidationResult { valid: boolean; errors: string[]; }
export interface ActivityEvaluationContext { resolveTypedTarget: (target: TypedAnswerTarget) => string | undefined; }
