import type { LevelStep } from '../../types/content';
import { getLevelStepKind } from './stepKind';

test('infers semantic kinds for immutable schema-v1 steps', () => {
  const legacyRead = { id: 'read', title: 'Read', blocks: [{ id: 'ayah', type: 'ayah_ref', ayahRef: { surahNumber: 105, ayahNumber: 1 } }] } as LevelStep;
  const legacyQuestion = { id: 'quiz', title: 'Quiz', blocks: [{ id: 'question', type: 'question', questionType: 'true-false', question: 'Fixture', correctAnswer: 0, sourceIds: ['source'], reviewerStatus: 'approved' }] } as LevelStep;

  expect(getLevelStepKind(legacyRead)).toBe('read');
  expect(getLevelStepKind(legacyQuestion)).toBe('understanding_practice');
});
