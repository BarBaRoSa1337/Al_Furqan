import { ActivityEvaluation, ActivityValidationContext, ActivityValidationResult, LearningActivity, TextComparisonMode } from '../../types/activities';

export function evaluateActivity(activity: LearningActivity, answer: unknown): ActivityEvaluation {
  switch (activity.kind) {
    case 'recall_then_reveal': return { correct: isRecallRating(answer), normalizedAnswer: answer, feedbackKey: 'self_rated_recall' };
    case 'complete_missing_token': return orderedEqual(answer, activity.config.correctTokenIds, 'token_answer');
    case 'order_tokens':
    case 'order_segments': return orderedEqual(answer, activity.config.correctOrderIds, 'order_answer');
    case 'choose_continuation':
    case 'multiple_choice': return { correct: answer === activity.config.correctOptionId, normalizedAnswer: answer, expectedAnswerRef: activity.config.correctOptionId, feedbackKey: 'choice_answer' };
    case 'match_word_meaning': return matchEqual(answer, activity.config.pairs);
    case 'type_missing_text': return textEqual(answer, activity.config.expectedText, activity.config.comparisonMode, activity.config.ignoreHarakat);
    case 'order_ayat': return orderedEqual(answer, activity.config.correctOrderRefs.map(refKey), 'ayah_order');
  }
}

export function validateActivity(activity: LearningActivity, context: ActivityValidationContext): ActivityValidationResult {
  const errors: string[] = [];
  if (!activity.id || activity.ayahRefs.length === 0 || activity.sourceIds.length === 0) errors.push('Activity requires id, ayahRefs, and sourceIds');
  if (activity.required && activity.knowledgeRefs.some(ref => !context.taughtKnowledgeRefs.includes(ref))) errors.push('Required activity references untaught knowledge');
  if (activity.ayahRefs.some(ref => !context.availableAyahRefs.some(candidate => refKey(candidate) === refKey(ref)))) errors.push('Activity references unavailable ayah');
  if (activity.kind === 'complete_missing_token' && activity.config.correctTokenIds.some(id => !context.availableTokenIds.includes(id))) errors.push('Activity references unavailable token');
  if ('itemIds' in activity.config && !sameSet(activity.config.itemIds, activity.config.correctOrderIds)) errors.push('Order activity item IDs must match correct order IDs');
  if (activity.kind === 'type_missing_text' && !activity.config.expectedText) errors.push('Typed activity requires expectedText');
  return { valid: errors.length === 0, errors };
}

function orderedEqual(answer: unknown, expected: string[], feedbackKey: string): ActivityEvaluation {
  const normalized = Array.isArray(answer) ? answer.map(String) : [];
  return { correct: normalized.length === expected.length && normalized.every((value, index) => value === expected[index]), normalizedAnswer: normalized, expectedAnswerRef: expected, feedbackKey };
}
function matchEqual(answer: unknown, expected: Array<{ promptId: string; meaningId: string }>): ActivityEvaluation {
  const normalized = typeof answer === 'object' && answer ? answer as Record<string, string> : {};
  return { correct: expected.every(pair => normalized[pair.promptId] === pair.meaningId), normalizedAnswer: normalized, expectedAnswerRef: expected, feedbackKey: 'match_answer' };
}
function textEqual(answer: unknown, expected: string, mode: TextComparisonMode, ignoreHarakat = false): ActivityEvaluation {
  const normalize = (value: string) => mode === 'exact_canonical' ? value : value.trim().replace(/\s+/g, ' ').replace(/ـ/g, '').replace(ignoreHarakat ? /[\u064B-\u065F\u0670]/g : /$^/, '');
  const normalized = normalize(String(answer ?? ''));
  return { correct: normalized === normalize(expected), normalizedAnswer: normalized, expectedAnswerRef: expected, feedbackKey: 'typed_answer' };
}
function isRecallRating(value: unknown): value is 'again' | 'hard' | 'remembered' { return value === 'again' || value === 'hard' || value === 'remembered'; }
function sameSet(a: string[], b: string[]): boolean { return a.length === b.length && new Set(a).size === a.length && a.every(value => b.includes(value)); }
function refKey(ref: { surahNumber: number; ayahNumber: number }): string { return `${ref.surahNumber}:${ref.ayahNumber}`; }
