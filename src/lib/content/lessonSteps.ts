import type { Level, LevelStep } from '../../types/content';

/** Core steps are the focused daily loop. Optional interactive steps remain available as extra practice. */
export function getCoreLevelSteps(level: Pick<Level, 'steps'>): LevelStep[] {
  return level.steps.filter(step => step.required !== false || !isInteractiveStep(step));
}

export function getPracticeLevelSteps(level: Pick<Level, 'steps'>): LevelStep[] {
  return level.steps.filter(step => step.required === false && isInteractiveStep(step));
}

export function hasPracticeSteps(level: Pick<Level, 'steps'>): boolean {
  return getPracticeLevelSteps(level).length > 0;
}

function isInteractiveStep(step: LevelStep): boolean {
  return step.blocks.some(block => block.type === 'activity' || block.type === 'question');
}
