// Quiz Types for Quran Habit App

export type QuizQuestionType =
  | 'multiple-choice'
  | 'true-false'
  | 'fill-blank'
  | 'match';

export interface QuizOption {
  id: string;
  text: string;
  arabic?: string;
}

export interface BaseQuizQuestion {
  id: string;
  type: QuizQuestionType;
  question: string;
  arabicQuestion?: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  sourceId?: string;
}

export interface MultipleChoiceQuestion extends BaseQuizQuestion {
  type: 'multiple-choice';
  options: QuizOption[];
  correctOptionId: string;
}

export interface TrueFalseQuestion extends BaseQuizQuestion {
  type: 'true-false';
  correctAnswer: boolean;
}

export interface FillBlankQuestion extends BaseQuizQuestion {
  type: 'fill-blank';
  blankText: string; // sentence with ___ for blank
  correctAnswer: string;
  caseSensitive?: boolean;
}

export interface MatchPair {
  id: string;
  arabic: string;
  meaning: string;
}

export interface MatchQuestion extends BaseQuizQuestion {
  type: 'match';
  pairs: MatchPair[];
}

export type QuizQuestion =
  | MultipleChoiceQuestion
  | TrueFalseQuestion
  | FillBlankQuestion
  | MatchQuestion;

export interface QuizResult {
  questionId: string;
  selectedOptionId: string | null;
  correct: boolean;
  timeSpentMs?: number;
}

export interface QuizSession {
  lessonId: string;
  packageId: string;
  questions: QuizQuestion[];
  results: QuizResult[];
  score: number;
  maxScore: number;
  startedAt: Date;
  completedAt?: Date;
}

export interface QuizFeedback {
  correct: boolean;
  explanation?: string;
  correctOptionId: string;
}
