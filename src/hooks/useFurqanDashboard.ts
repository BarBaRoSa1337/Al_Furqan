import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getContentRepository } from '../lib/content/repository';
import { hasPracticeSteps } from '../lib/content/lessonSteps';
import { getLevelAccessState } from '../lib/progress/lessonAccess';
import {
  getAppProgress,
  getDueReviewStates,
  getLastCompletionReceipt,
  getProgressRecoveryWarning,
  getReviewStates,
  syncCompletedLevelReviews,
} from '../lib/progress/storage';
import { resolveDueReviewItems } from '../lib/progress/reviewQueue';
import {
  isDailyGoalComplete,
  resolveHomePrimaryAction,
  resolveQuranLocation,
  type HomePrimaryAction,
  type QuranLocationSummary,
} from '../lib/progress/dashboard';
import type { LearningPath, Level } from '../types/content';
import { DEFAULT_PROGRESS, type AppProgress } from '../types/progress';

export interface FurqanDashboardState {
  progress: AppProgress;
  path?: LearningPath;
  levels: Level[];
  activeLevel?: Level;
  latestCompletedLevel?: Level;
  location?: QuranLocationSummary;
  primaryAction: HomePrimaryAction;
  dueReviewCount: number;
  reviewItemCount: number;
  dailyGoalComplete: boolean;
  loading: boolean;
  error?: string;
  warning?: string;
}

const INITIAL_STATE: FurqanDashboardState = {
  progress: DEFAULT_PROGRESS,
  levels: [],
  primaryAction: { kind: 'explore', href: '/discover' },
  dueReviewCount: 0,
  reviewItemCount: 0,
  dailyGoalComplete: false,
  loading: true,
};

export function useFurqanDashboard(): FurqanDashboardState & { refresh: () => Promise<void> } {
  const [state, setState] = useState<FurqanDashboardState>(INITIAL_STATE);

  const refresh = useCallback(async () => {
    const repo = getContentRepository();
    const path = repo.getCurrentLearningPath();
    const levels = path ? repo.getLevelsForLearningPath(path.id) : [];
    try {
      await syncCompletedLevelReviews(levels.flatMap(level => {
        const pkg = repo.getPackageForLevel(level.id);
        return pkg ? [{ level, packageRevisionId: pkg.revisionId }] : [];
      }));
      const [progress, dueStates, reviewStates, receipt] = await Promise.all([
        getAppProgress(),
        getDueReviewStates(),
        getReviewStates(),
        getLastCompletionReceipt(),
      ]);
      const dueReviewCount = resolveDueReviewItems(repo, dueStates).length;
      const activeLevel = levels.find(level =>
        getLevelAccessState(levels, progress.completedLevelIds, level.id) === 'active'
      );
      const latestCompletedLevel = [...levels].reverse()
        .find(level => progress.completedLevelIds.includes(level.id));
      const locationLevel = activeLevel ?? latestCompletedLevel ?? levels[0];
      setState({
        progress,
        path,
        levels,
        activeLevel,
        latestCompletedLevel,
        location: resolveQuranLocation(repo, locationLevel),
        primaryAction: resolveHomePrimaryAction(
          dueReviewCount,
          activeLevel,
          latestCompletedLevel,
          Boolean(latestCompletedLevel && hasPracticeSteps(latestCompletedLevel))
        ),
        dueReviewCount,
        reviewItemCount: reviewStates.length,
        dailyGoalComplete: isDailyGoalComplete(receipt, reviewStates),
        loading: false,
        warning: getProgressRecoveryWarning()?.message,
      });
    } catch (cause) {
      setState(current => ({
        ...current,
        path,
        levels,
        loading: false,
        error: cause instanceof Error ? cause.message : 'Progress could not be loaded.',
      }));
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  return { ...state, refresh };
}
