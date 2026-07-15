import { ActivityEvaluation, ActivityEvaluationContext, ActivityValidationContext, ActivityValidationResult, LearningActivity, TextComparisonMode } from '../../types/activities';
import type { QuestionBlock } from '../../types/content';

export function evaluateActivity(activity: LearningActivity, answer: unknown, context?: ActivityEvaluationContext): ActivityEvaluation {
  switch (activity.kind) {
    case 'recall_then_reveal': return { correct: answer === 'hard' || answer === 'remembered', normalizedAnswer: answer, feedbackKey: 'self_rated_recall' };
    case 'fill_gap':
    case 'complete_missing_token': return orderedEqual(answer, activity.config.correctTokenIds, 'token_answer');
    case 'order_tokens':
    case 'order_segments': return orderedEqual(answer, activity.config.correctOrderIds, 'order_answer');
    case 'choose_continuation':
    case 'multiple_choice': return { correct: answer === activity.config.correctOptionId, normalizedAnswer: answer, expectedAnswerRef: activity.config.correctOptionId, feedbackKey: 'choice_answer' };
    case 'match_word_meaning': return matchEqual(answer, activity.config.pairs.map(pair => ({ promptId: pair.promptTokenId, choiceId: pair.meaningId })), 'word_meaning_match');
    case 'match_ayah_translation': return matchEqual(answer, activity.config.pairs.map(pair => ({ promptId: pair.ayahSegmentId, choiceId: pair.translationSegmentId })), 'ayah_translation_match');
    case 'type_missing_text': {
      const expected = context?.resolveTypedTarget(activity.config.target);
      return expected === undefined
        ? { correct: false, expectedAnswerRef: activity.config.target, feedbackKey: 'typed_target_unavailable' }
        : textEqual(answer, expected, activity.config.comparisonMode, activity.config.ignoreHarakat ?? false, activity.config.target);
    }
    case 'order_ayat': return orderedEqual(answer, activity.config.correctOrderRefs.map(refKey), 'ayah_order');
  }
}

/** Compatibility evaluator for schema-v1 QuestionBlock records. */
export function evaluateQuestion(block: QuestionBlock, answer: unknown): boolean {
  if (block.questionType === 'multiple-choice' || block.questionType === 'true-false') return String(answer) === String(block.correctAnswer);
  if (block.questionType === 'fill-blank') {
    const actual = String(answer ?? '').trim();
    const expected = block.correctAnswer.trim();
    return block.caseSensitive ? actual === expected : actual.toLowerCase() === expected.toLowerCase();
  }
  if (block.questionType === 'match') {
    if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return false;
    const selections = answer as Record<string, unknown>;
    return block.matchPairs.every(pair => selections[pair.id] === pair.id);
  }
  return false;
}

export function validateActivity(activity: LearningActivity, context: ActivityValidationContext): ActivityValidationResult {
  const errors: string[] = [];
  if (!activity.id || activity.ayahRefs.length === 0 || activity.sourceIds.length === 0) errors.push('Activity requires id, ayahRefs, and sourceIds');
  if (activity.reviewSchedule) {
    const intervals = activity.reviewSchedule.intervalDays;
    if (intervals.length === 0 || intervals.some((days, index) => !Number.isInteger(days) || days < 1 || (index > 0 && days <= intervals[index - 1]))) {
      errors.push('Review intervals must be positive, strictly increasing whole days');
    }
  }
  if (activity.required && activity.knowledgeRefs.some(ref => !context.taughtKnowledgeRefs.includes(ref))) errors.push('Required activity references untaught knowledge');
  if (activity.ayahRefs.some(ref => !context.availableAyahRefs.some(candidate => refKey(candidate) === refKey(ref)))) errors.push('Activity references unavailable ayah');
  if ((activity.kind === 'fill_gap' || activity.kind === 'complete_missing_token') && activity.config.correctTokenIds.some(id => !context.availableTokenIds.includes(id))) errors.push('Activity references unavailable token');
  if ('itemIds' in activity.config && !sameSet(activity.config.itemIds, activity.config.correctOrderIds)) errors.push('Order activity item IDs must match correct order IDs');
  if (activity.kind === 'order_tokens' && activity.config.itemIds.some(id => !context.availableTokenIds.includes(id))) errors.push('Order activity references unavailable token');
  if (activity.kind === 'order_segments') validateSegments(activity.config.segments, activity.config.itemIds, context.availableTokenIds, errors);
  if (activity.kind === 'match_word_meaning') {
    if (activity.config.pairs.length < 2) errors.push('Word match requires at least two pairs');
    validateUnique('word-match prompt', activity.config.pairs.map(pair => pair.promptTokenId), errors);
    validateUnique('word-match meaning', activity.config.pairs.map(pair => pair.meaningId), errors);
    if (activity.config.pairs.some(pair => !context.availableTokenIds.includes(pair.promptTokenId))) errors.push('Word match references unavailable token');
    if (activity.config.pairs.some(pair => !context.availableMeaningIds.includes(pair.meaningId))) errors.push('Word match references unavailable meaning');
  }
  if (activity.kind === 'match_ayah_translation') {
    validateSegments(activity.config.ayahSegments, activity.config.pairs.map(pair => pair.ayahSegmentId), context.availableTokenIds, errors);
    validateUnique('translation segment', activity.config.translationSegments.map(segment => segment.id), errors);
    validateUnique('ayah-translation prompt', activity.config.pairs.map(pair => pair.ayahSegmentId), errors);
    validateUnique('ayah-translation choice', activity.config.pairs.map(pair => pair.translationSegmentId), errors);
    if (!sameSet(activity.config.ayahSegments.map(segment => segment.id), activity.config.pairs.map(pair => pair.ayahSegmentId))) errors.push('Ayah translation prompts must match configured segments');
    if (!sameSet(activity.config.translationSegments.map(segment => segment.id), activity.config.pairs.map(pair => pair.translationSegmentId))) errors.push('Ayah translation choices must match configured segments');
    if (activity.config.translationSegments.some(segment => !context.availableTranslationEntryIds.includes(segment.translationEntryId))) errors.push('Ayah translation match references unavailable translation');
    if (activity.config.pairs.some(pair => !activity.config.translationSegments.some(segment => segment.id === pair.translationSegmentId))) errors.push('Ayah translation match references unavailable translation segment');
  }
  if (activity.kind === 'choose_continuation') {
    const { optionIds, correctOptionId, promptTokenIds, segments } = activity.config;
    if (optionIds.length < 2) errors.push('Continuation activity requires at least two options');
    validateUnique('continuation option', optionIds, errors);
    if (!optionIds.includes(correctOptionId)) errors.push('Continuation answer references unavailable option');
    if (promptTokenIds && (promptTokenIds.length === 0 || promptTokenIds.some(id => !context.availableTokenIds.includes(id)))) {
      errors.push('Continuation prompt references unavailable token');
    }
    if (segments) {
      validateSegments(segments, optionIds, context.availableTokenIds, errors);
      if (!sameSet(segments.map(segment => segment.id), optionIds)) errors.push('Continuation segments must match option IDs');
    } else if (optionIds.some(id => !context.availableTokenIds.includes(id))) {
      errors.push('Continuation option references unavailable token');
    }
  }
  if (activity.kind === 'multiple_choice') {
    validateUnique('multiple-choice option', activity.config.options.map(option => option.id), errors);
    if (!activity.config.options.some(option => option.id === activity.config.correctOptionId)) errors.push('Multiple-choice answer references unavailable option');
  }
  if (activity.kind === 'type_missing_text') {
    const target = activity.config.target;
    if (target.kind === 'ayah' && !context.availableAyahRefs.some(ref => refKey(ref) === refKey(target.ayahRef))) errors.push('Typed activity references unavailable ayah');
    if (target.kind === 'token_sequence' && (target.tokenIds.length === 0 || target.tokenIds.some(id => !context.availableTokenIds.includes(id)))) errors.push('Typed activity references unavailable token');
  }
  if (activity.kind === 'order_ayat') {
    const orderKeys = activity.config.correctOrderRefs.map(refKey);
    const activityKeys = activity.ayahRefs.map(refKey);
    if (orderKeys.length < 2) errors.push('Ayah order activity requires at least two ayat');
    validateUnique('ayah order', orderKeys, errors);
    if (activity.config.correctOrderRefs.some(ref => !context.availableAyahRefs.some(candidate => refKey(candidate) === refKey(ref)))) {
      errors.push('Ayah order activity references unavailable ayah');
    }
    if (!sameSet(orderKeys, activityKeys)) errors.push('Ayah order refs must match activity ayahRefs');
  }
  return { valid: errors.length === 0, errors };
}

function orderedEqual(answer: unknown, expected: string[], feedbackKey: string): ActivityEvaluation {
  const normalized = Array.isArray(answer) ? answer.map(String) : [];
  return { correct: normalized.length === expected.length && normalized.every((value, index) => value === expected[index]), normalizedAnswer: normalized, expectedAnswerRef: expected, feedbackKey };
}
function matchEqual(answer: unknown, expected: { promptId: string; choiceId: string }[], feedbackKey: string): ActivityEvaluation {
  const normalized = typeof answer === 'object' && answer ? answer as Record<string, string> : {};
  return { correct: expected.every(pair => normalized[pair.promptId] === pair.choiceId), normalizedAnswer: normalized, expectedAnswerRef: expected, feedbackKey };
}
function textEqual(answer: unknown, expected: string, mode: TextComparisonMode, ignoreHarakat: boolean, expectedAnswerRef: unknown): ActivityEvaluation {
  const normalized = normalizeTypedAnswer(String(answer ?? ''), mode, ignoreHarakat);
  return { correct: normalized === normalizeTypedAnswer(expected, mode, ignoreHarakat), normalizedAnswer: normalized, expectedAnswerRef, feedbackKey: 'typed_answer' };
}
export function normalizeTypedAnswer(value: string, mode: TextComparisonMode, ignoreHarakat = false): string {
  return mode === 'exact_canonical'
    ? value
    : value.trim().replace(/\s+/g, ' ').replace(/ـ/g, '').replace(ignoreHarakat ? /[\u064B-\u065F\u0670]/g : /$^/, '');
}
function sameSet(a: string[], b: string[]): boolean { return a.length === b.length && new Set(a).size === a.length && a.every(value => b.includes(value)); }
function validateSegments(segments: { id: string; tokenIds: string[] }[] | undefined, requiredIds: string[], availableTokenIds: string[], errors: string[]): void {
  if (!segments || segments.length === 0) { errors.push('Segment activity requires segment definitions'); return; }
  validateUnique('segment', segments.map(segment => segment.id), errors);
  if (requiredIds.some(id => !segments.some(segment => segment.id === id))) errors.push('Segment activity references unavailable segment');
  if (segments.some(segment => segment.tokenIds.length === 0 || segment.tokenIds.some(id => !availableTokenIds.includes(id)))) errors.push('Segment activity references unavailable token');
}
function validateUnique(label: string, ids: string[], errors: string[]): void {
  if (new Set(ids).size !== ids.length) errors.push(`Duplicate ${label} ID`);
}
function refKey(ref: { surahNumber: number; ayahNumber: number }): string { return `${ref.surahNumber}:${ref.ayahNumber}`; }
