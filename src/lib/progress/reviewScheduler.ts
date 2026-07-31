import type { ActivityReviewSchedule, ReviewOutcome } from '../../types/activities';
import type { ActivityReviewState } from '../../types/progress';

export interface ScheduleReviewInput {
  activityId: string;
  levelId: string;
  packageRevisionId: string;
  outcome: ReviewOutcome;
  schedule: ActivityReviewSchedule;
  locale?: string;
  languageIndependent?: boolean;
}

export function scheduleActivityReview(
  current: ActivityReviewState | undefined,
  input: ScheduleReviewInput,
  now: Date = new Date()
): ActivityReviewState {
  const previousStage = current?.stage ?? 0;
  const passed = input.outcome === 'correct' || input.outcome === 'remembered';
  const stage = input.outcome === 'again' || input.outcome === 'incorrect'
    ? 0
    : passed ? previousStage + 1 : previousStage;
  // Stage counts successful exposures. The final configured interval must be
  // completed before an activity becomes mastered.
  const mastered = stage > input.schedule.intervalDays.length;
  const intervalIndex = Math.max(0, Math.min(stage - 1, input.schedule.intervalDays.length - 1));
  const dueAt = mastered ? undefined : addDays(now, input.schedule.intervalDays[intervalIndex]).toISOString();

  return {
    activityId: input.activityId,
    levelId: input.levelId,
    packageRevisionId: input.packageRevisionId,
    stage,
    dueAt,
    lastOutcome: input.outcome,
    lastReviewedAt: now.toISOString(),
    mastered,
    locale: input.languageIndependent ? 'shared' : input.locale ?? 'en',
    ...(input.languageIndependent ? { languageIndependent: true } : {}),
  };
}

export function isReviewDue(state: ActivityReviewState, now: Date = new Date()): boolean {
  return !state.mastered && Boolean(state.dueAt) && new Date(state.dueAt!).getTime() <= now.getTime();
}

export function reviewStateKey(
  levelId: string,
  activityId: string,
  packageRevisionId: string,
  locale = 'en',
  languageIndependent = false,
): string {
  return `${levelId}:${activityId}:${packageRevisionId}:${languageIndependent ? 'shared' : locale}`;
}

export function restorePendingFinalInterval(state: ActivityReviewState, schedule: ActivityReviewSchedule): ActivityReviewState {
  if (!state.mastered || state.stage !== schedule.intervalDays.length || schedule.intervalDays.length === 0) return state;
  const reviewedAt = new Date(state.lastReviewedAt);
  if (!Number.isFinite(reviewedAt.getTime())) return state;
  return {
    ...state,
    mastered: false,
    dueAt: addDays(reviewedAt, schedule.intervalDays.at(-1)!).toISOString(),
  };
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000);
}
