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
  selectedAnswer: string | number;
  correct: boolean;
  attemptedAt: string;
}

export interface ActivityAttempt {
  activityId: string;
  levelId: string;
  answer: unknown;
  correct: boolean;
  attemptedAt: string;
  evaluationVersion: string;
}

export interface LevelProgress {
  levelId: string;
  pathId: string;
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

export interface ProgressRecoveryWarning {
  code: 'corrupt_v2' | 'partial_legacy_migration';
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
