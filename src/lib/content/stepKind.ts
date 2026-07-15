import type { LevelStep, LevelStepKind } from '../../types/content';

/** Compatibility adapter for immutable schema-v1 packages without semantic step kinds. */
export function getLevelStepKind(step: LevelStep): LevelStepKind {
  if (step.kind) return step.kind;
  if (step.blocks.some(block => block.type === 'context')) return 'context';
  if (step.blocks.some(block => block.type === 'summary')) return 'summary';
  if (step.blocks.some(block => block.type === 'tafsir_ref')) return 'tafsir';
  if (step.blocks.some(block => block.type === 'word_explorer' || block.type === 'word_meaning')) return 'word_meaning';
  if (step.blocks.some(block => block.type === 'translation')) return 'translation';
  if (step.blocks.some(block => block.type === 'question')) return 'understanding_practice';
  if (step.blocks.some(block => block.type === 'activity')) return 'memory_practice';
  return 'read';
}
