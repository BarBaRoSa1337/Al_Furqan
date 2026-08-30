// Progress Types for Quran Habit App

export interface XPRecord {
  amount: number;
  reason: string;
  earnedAt: string; // ISO string
}

export interface StreakRecord {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
}

export interface AppProgress {
  xp: number;
  xpHistory: XPRecord[];
  streak: StreakRecord;
  completedLevelIds: string[];
  completedLearningPathIds: string[];
  currentLevelId?: string;
  lastActiveAt: string; // ISO string
}

export interface QuestionAttempt {
  questionId: string;
  levelId: string;
  selectedAnswer: unknown;
  correct: boolean;
  attemptedAt: string;
  locale?: string;
}

export interface ActivityAttempt {
  activityId: string;
  levelId: string;
  answer: unknown;
  correct: boolean;
  attemptedAt: string;
  evaluationVersion: string;
  locale?: string;
  languageIndependent?: boolean;
}

export interface ActivityReviewState {
  activityId: string;
  levelId: string;
  packageRevisionId: string;
  stage: number;
  dueAt?: string;
  lastOutcome: import('./activities').ReviewOutcome;
  lastReviewedAt: string;
  mastered: boolean;
  locale?: string;
  languageIndependent?: boolean;
}

export interface LevelProgress {
  levelId: string;
  pathId: string;
  structureFingerprint?: string;
  completed: boolean;
  startedAt: string;
  completedAt?: string;
  currentStepId?: string;
  completedStepIds: string[];
  questionAttempts: QuestionAttempt[];
  activityAttempts: ActivityAttempt[];
}

export interface LearningPathProgress {
  learningPathId: string;
  totalLevels: number;
  completedLevels: number;
  overallProgress: number;
  levels: LevelProgress[];
  startedAt: string;
  completedAt?: string;
}

export interface CompletionReceipt {
  id: string;
  levelId: string;
  learningPathId: string;
  alreadyCompleted: boolean;
  learningPathJustCompleted: boolean;
  awardedLevelXp: number;
  awardedLearningPathXp: number;
  completedAt: string;
}

export interface ProgressSnapshotV2 {
  schemaVersion: 2;
  app: AppProgress;
  levels: Record<string, LevelProgress>;
  lastCompletionReceipt?: CompletionReceipt;
}

export interface ProgressSnapshotV3 {
  schemaVersion: 3;
  app: AppProgress;
  levels: Record<string, LevelProgress>;
  reviews: Record<string, ActivityReviewState>;
  lastCompletionReceipt?: CompletionReceipt;
}

export interface ProgressSnapshotV4 {
  schemaVersion: 4;
  app: AppProgress;
  levels: Record<string, LevelProgress>;
  reviews: Record<string, ActivityReviewState>;
  lastCompletionReceipt?: CompletionReceipt;
}

export interface ProgressSnapshotV5 {
  schemaVersion: 5;
  app: AppProgress;
  levels: Record<string, LevelProgress>;
  reviews: Record<string, ActivityReviewState>;
  appliedCurriculumMigrationIds: string[];
  lastCompletionReceipt?: CompletionReceipt;
}

export interface ProgressRecoveryWarning {
  code: 'corrupt_v2' | 'corrupt_v3' | 'corrupt_v4' | 'corrupt_v5' | 'partial_legacy_migration';
  message: string;
}

export const DEFAULT_PROGRESS: AppProgress = {
  xp: 0,
  xpHistory: [],
  streak: {
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: '',
  },
  completedLevelIds: [],
  completedLearningPathIds: [],
  lastActiveAt: new Date().toISOString(),
};

export function createDefaultProgress(): AppProgress {
  return {
    ...DEFAULT_PROGRESS,
    xpHistory: [],
    streak: { ...DEFAULT_PROGRESS.streak },
    completedLevelIds: [],
    completedLearningPathIds: [],
    lastActiveAt: new Date().toISOString(),
  };
}

export const XP_REWARDS = {
  LEVEL_COMPLETE: 20,
  LEARNING_PATH_COMPLETE: 100,
  QUIZ_CORRECT: 10,
  QUIZ_PERFECT: 30,
  DAILY_STREAK: 5,
} as const;
