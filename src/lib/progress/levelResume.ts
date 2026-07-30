import type { LevelStep } from '../../types/content';
import type { LevelProgress } from '../../types/progress';

export function getResumeStepIndex(steps: LevelStep[], progress: LevelProgress, authoredSteps: LevelStep[] = steps): number {
  const savedIndex = steps.findIndex(step => step.id === progress.currentStepId);
  const savedAuthoredIndex = authoredSteps.findIndex(step => step.id === progress.currentStepId);
  const resumeIndex = savedIndex >= 0
    ? savedIndex
    : savedAuthoredIndex >= 0
      ? (() => {
        const followingCoreIndex = steps.findIndex(step => authoredSteps.indexOf(step) > savedAuthoredIndex);
        return followingCoreIndex >= 0 ? followingCoreIndex : Math.max(0, steps.length - 1);
      })()
      : 0;
  const newlyRequiredIndex = steps.findIndex((step, index) =>
    index < resumeIndex && step.required !== false && !progress.completedStepIds.includes(step.id)
  );
  return newlyRequiredIndex >= 0 ? newlyRequiredIndex : resumeIndex;
}
