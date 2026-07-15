import { ChooseContinuationActivity, CompleteMissingTokenActivity, MatchAyahTranslationActivity, MatchWordMeaningActivity, OrderActivity, OrderAyatActivity, TypeMissingTextActivity } from '../../types/activities';
import { evaluateActivity, validateActivity } from './activityEngine';

const missing: CompleteMissingTokenActivity = { id: 'missing', kind: 'complete_missing_token', ayahRefs: [{ surahNumber: 105, ayahNumber: 1 }], instruction: 'Complete', required: true, difficulty: 1, knowledgeRefs: ['token-1'], sourceIds: ['quran'], reviewerStatus: 'approved', config: { tokenBankIds: ['token-1', 'token-2'], correctTokenIds: ['token-1'] } };

test('evaluates stable token IDs, not display order', () => {
  expect(evaluateActivity(missing, ['token-1']).correct).toBe(true);
  expect(evaluateActivity(missing, ['token-2']).correct).toBe(false);
});

test('normalizes only configured typed comparison copies', () => {
  const activity: TypeMissingTextActivity = { ...missing, id: 'typed', kind: 'type_missing_text', config: { target: { kind: 'token_sequence', tokenIds: ['token-1', 'token-2'] }, comparisonMode: 'letters_and_order', ignoreHarakat: true } };
  expect(evaluateActivity(activity, ' ألم   ترَ ', { resolveTypedTarget: () => 'أَلَمْ تَرَ' }).correct).toBe(true);
  expect(evaluateActivity(activity, ' ألم   ترَ ').feedbackKey).toBe('typed_target_unavailable');
});

test('rejects required activities testing untaught knowledge', () => {
  expect(validateActivity(missing, { availableAyahRefs: missing.ayahRefs, availableTokenIds: ['token-1', 'token-2'], availableMeaningIds: [], availableTranslationEntryIds: [], taughtKnowledgeRefs: [] }).valid).toBe(false);
});

test('rejects invalid review intervals and unavailable typed targets', () => {
  const activity: TypeMissingTextActivity = {
    ...missing,
    id: 'typed-invalid',
    kind: 'type_missing_text',
    reviewSchedule: { intervalDays: [3, 1] },
    config: { target: { kind: 'token_sequence', tokenIds: ['missing-token'] }, comparisonMode: 'letters_and_order' },
  };
  const result = validateActivity(activity, { availableAyahRefs: missing.ayahRefs, availableTokenIds: ['token-1'], availableMeaningIds: [], availableTranslationEntryIds: [], taughtKnowledgeRefs: ['token-1'] });
  expect(result.errors).toEqual(expect.arrayContaining([
    'Review intervals must be positive, strictly increasing whole days',
    'Typed activity references unavailable token',
  ]));
});

test('evaluates word-meaning matches by stable IDs', () => {
  const activity: MatchWordMeaningActivity = { ...missing, id: 'match', kind: 'match_word_meaning', config: { pairs: [{ promptTokenId: 'token-1', meaningId: 'meaning-1' }] } };
  expect(evaluateActivity(activity, { 'token-1': 'meaning-1' }).correct).toBe(true);
  expect(evaluateActivity(activity, { 'token-1': 'meaning-2' }).correct).toBe(false);
});

test('evaluates ayah-translation segments by stable IDs', () => {
  const activity: MatchAyahTranslationActivity = {
    ...missing, id: 'translation-match', kind: 'match_ayah_translation',
    config: {
      ayahSegments: [{ id: 'ayah-a', tokenIds: ['token-1'] }],
      translationSegments: [{ id: 'translation-a', text: 'Meaning', translationEntryId: 'translation-1' }],
      pairs: [{ ayahSegmentId: 'ayah-a', translationSegmentId: 'translation-a' }],
    },
  };
  expect(evaluateActivity(activity, { 'ayah-a': 'translation-a' }).correct).toBe(true);
  expect(evaluateActivity(activity, { 'ayah-a': 'translation-b' }).correct).toBe(false);
});

test('evaluates segment ordering independently from authored display IDs', () => {
  const activity: OrderActivity = {
    ...missing, id: 'segment-order', kind: 'order_segments',
    config: {
      itemIds: ['segment-b', 'segment-a'], correctOrderIds: ['segment-a', 'segment-b'],
      segments: [{ id: 'segment-a', tokenIds: ['token-1'] }, { id: 'segment-b', tokenIds: ['token-2'] }],
    },
  };
  expect(evaluateActivity(activity, ['segment-a', 'segment-b']).correct).toBe(true);
  expect(evaluateActivity(activity, activity.config.itemIds).correct).toBe(false);
});

test('evaluates and validates canonical continuation segments by stable ID', () => {
  const activity: ChooseContinuationActivity = {
    ...missing, id: 'continuation', kind: 'choose_continuation',
    config: {
      promptTokenIds: ['token-1'], optionIds: ['correct', 'distractor'], correctOptionId: 'correct',
      segments: [{ id: 'correct', tokenIds: ['token-2'] }, { id: 'distractor', tokenIds: ['token-1'] }],
    },
  };
  const context = { availableAyahRefs: missing.ayahRefs, availableTokenIds: ['token-1', 'token-2'], availableMeaningIds: [], availableTranslationEntryIds: [], taughtKnowledgeRefs: ['token-1'] };

  expect(validateActivity(activity, context).valid).toBe(true);
  expect(evaluateActivity(activity, 'correct').correct).toBe(true);
  expect(evaluateActivity(activity, 'distractor').correct).toBe(false);
});

test('rejects malformed continuation and ayah-order references', () => {
  const continuation: ChooseContinuationActivity = {
    ...missing, id: 'continuation-invalid', kind: 'choose_continuation',
    config: { promptTokenIds: ['missing-token'], optionIds: ['same', 'same'], correctOptionId: 'missing-option' },
  };
  const order: OrderAyatActivity = {
    ...missing, id: 'order-invalid', kind: 'order_ayat',
    ayahRefs: [{ surahNumber: 105, ayahNumber: 1 }, { surahNumber: 105, ayahNumber: 2 }],
    config: { correctOrderRefs: [{ surahNumber: 105, ayahNumber: 1 }, { surahNumber: 105, ayahNumber: 1 }] },
  };
  const context = { availableAyahRefs: order.ayahRefs, availableTokenIds: ['token-1', 'token-2'], availableMeaningIds: [], availableTranslationEntryIds: [], taughtKnowledgeRefs: ['token-1'] };

  expect(validateActivity(continuation, context).errors).toEqual(expect.arrayContaining([
    'Duplicate continuation option ID',
    'Continuation answer references unavailable option',
    'Continuation prompt references unavailable token',
    'Continuation option references unavailable token',
  ]));
  expect(validateActivity(order, context).errors).toEqual(expect.arrayContaining([
    'Duplicate ayah order ID',
    'Ayah order refs must match activity ayahRefs',
  ]));
});

test('only a passing self-rated recall unlocks a required recall activity', () => {
  const recall = { ...missing, id: 'recall', kind: 'recall_then_reveal' as const, config: {} };
  expect(evaluateActivity(recall, 'again').correct).toBe(false);
  expect(evaluateActivity(recall, 'hard').correct).toBe(true);
});
