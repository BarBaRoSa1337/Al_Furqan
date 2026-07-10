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

export interface LevelProgress {
  levelId: string;
  pathId: string;
  completed: boolean;
  startedAt: string;
  completedAt?: string;
  currentStepId?: string;
  completedStepIds: string[];
  questionAttempts: QuestionAttempt[];
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

export const XP_REWARDS = {
  LESSON_COMPLETE: 20,
  QUIZ_CORRECT: 10,
  QUIZ_PERFECT: 30,
  PACKAGE_COMPLETE: 100,
  DAILY_STREAK: 5,
} as const;
