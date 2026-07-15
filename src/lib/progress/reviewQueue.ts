import type { LearningActivity } from '../../types/activities';
import type { ContentPackage, ContentRepository, LearningPath, Level } from '../../types/content';
import type { ActivityReviewState } from '../../types/progress';

export interface DueReviewItem {
  state: ActivityReviewState;
  activity: LearningActivity;
  level: Level;
  path: LearningPath;
  package: ContentPackage;
}

export function resolveDueReviewItems(repo: ContentRepository, states: ActivityReviewState[]): DueReviewItem[] {
  return states.flatMap(state => {
    const level = repo.getLevelById(state.levelId);
    const activity = repo.getActivityForLevel(state.levelId, state.activityId);
    const pkg = repo.getPackageForLevel(state.levelId);
    const path = level ? repo.getLearningPathById(level.pathId) : undefined;
    if (!level || !activity || !activity.reviewSchedule || !pkg || !path || pkg.revisionId !== state.packageRevisionId) return [];
    return [{ state, activity, level, path, package: pkg }];
  });
}
