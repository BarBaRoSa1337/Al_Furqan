import { AyahRef, ReviewerStatus } from './content';

export type ActivityKind =
  | 'recall_then_reveal'
  | 'complete_missing_token'
  | 'order_tokens'
  | 'order_segments'
  | 'choose_continuation'
  | 'match_word_meaning'
  | 'type_missing_text'
  | 'order_ayat'
  | 'multiple_choice';

export type RecallRating = 'again' | 'hard' | 'remembered';
export type TextComparisonMode = 'letters_and_order' | 'exact_canonical';

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
}

export interface RecallThenRevealActivity extends ActivityBase { kind: 'recall_then_reveal'; config: Record<string, never>; }
export interface CompleteMissingTokenActivity extends ActivityBase { kind: 'complete_missing_token'; config: { tokenBankIds: string[]; correctTokenIds: string[] }; }
export interface OrderActivity extends ActivityBase { kind: 'order_tokens' | 'order_segments'; config: { itemIds: string[]; correctOrderIds: string[] }; }
export interface ChooseContinuationActivity extends ActivityBase { kind: 'choose_continuation'; config: { optionIds: string[]; correctOptionId: string }; }
export interface MatchWordMeaningActivity extends ActivityBase { kind: 'match_word_meaning'; config: { pairs: Array<{ promptId: string; meaningId: string }> }; }
export interface TypeMissingTextActivity extends ActivityBase { kind: 'type_missing_text'; config: { expectedText: string; comparisonMode: TextComparisonMode; ignoreHarakat?: boolean }; }
export interface OrderAyatActivity extends ActivityBase { kind: 'order_ayat'; config: { correctOrderRefs: AyahRef[] }; }
export interface MultipleChoiceActivity extends ActivityBase { kind: 'multiple_choice'; config: { optionIds: string[]; correctOptionId: string }; }

export type LearningActivity = RecallThenRevealActivity | CompleteMissingTokenActivity | OrderActivity | ChooseContinuationActivity | MatchWordMeaningActivity | TypeMissingTextActivity | OrderAyatActivity | MultipleChoiceActivity;

export interface ActivityEvaluation { correct: boolean; normalizedAnswer?: unknown; expectedAnswerRef?: unknown; feedbackKey: string; }
export interface ActivityValidationContext { availableAyahRefs: AyahRef[]; availableTokenIds: string[]; taughtKnowledgeRefs: string[]; }
export interface ActivityValidationResult { valid: boolean; errors: string[]; }
