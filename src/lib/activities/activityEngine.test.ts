import { CompleteMissingTokenActivity, TypeMissingTextActivity } from '../../types/activities';
import { evaluateActivity, validateActivity } from './activityEngine';

const missing: CompleteMissingTokenActivity = { id: 'missing', kind: 'complete_missing_token', ayahRefs: [{ surahNumber: 105, ayahNumber: 1 }], instruction: 'Complete', required: true, difficulty: 1, knowledgeRefs: ['token-1'], sourceIds: ['quran'], reviewerStatus: 'approved', config: { tokenBankIds: ['token-1', 'token-2'], correctTokenIds: ['token-1'] } };

test('evaluates stable token IDs, not display order', () => {
  expect(evaluateActivity(missing, ['token-1']).correct).toBe(true);
  expect(evaluateActivity(missing, ['token-2']).correct).toBe(false);
});

test('normalizes only configured typed comparison copies', () => {
  const activity: TypeMissingTextActivity = { ...missing, id: 'typed', kind: 'type_missing_text', config: { expectedText: 'أَلَمْ تَرَ', comparisonMode: 'letters_and_order', ignoreHarakat: true } };
  expect(evaluateActivity(activity, ' ألم   ترَ ').correct).toBe(true);
});

test('rejects required activities testing untaught knowledge', () => {
  expect(validateActivity(missing, { availableAyahRefs: missing.ayahRefs, availableTokenIds: ['token-1', 'token-2'], taughtKnowledgeRefs: [] }).valid).toBe(false);
});
