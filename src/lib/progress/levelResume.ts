import type { LevelStep } from '../../types/content';
import type { LevelProgress } from '../../types/progress';

export function getResumeStepIndex(steps: LevelStep[], progress: LevelProgress): number {
  const savedIndex = steps.findIndex(step => step.id === progress.currentStepId);
  const resumeIndex = savedIndex >= 0 ? savedIndex : 0;
  const newlyRequiredIndex = steps.findIndex((step, index) =>
    index < resumeIndex && step.required !== false && !progress.completedStepIds.includes(step.id)
  );
  return newlyRequiredIndex >= 0 ? newlyRequiredIndex : resumeIndex;
}
