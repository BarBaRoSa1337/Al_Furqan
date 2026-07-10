// Quiz Engine — checks answers and calculates scores

import { QuizLessonBlock } from '../../types/content';

export interface AnswerCheckResult {
  correct: boolean;
  explanation?: string;
  correctAnswer: string | number;
}

export function checkAnswer(
  block: QuizLessonBlock,
  selectedAnswer: string | number
): AnswerCheckResult {
  const correct = selectedAnswer === block.content.correctAnswer;
  return {
    correct,
    explanation: block.content.explanation,
    correctAnswer: block.content.correctAnswer,
  };
}

export function calculateScore(
  blocks: QuizLessonBlock[],
  answers: Record<string, string | number>
): { score: number; maxScore: number; percentage: number; allCorrect: boolean } {
  let score = 0;
  const maxScore = blocks.length;

  blocks.forEach(block => {
    const answer = answers[block.id];
    if (answer !== undefined && answer === block.content.correctAnswer) {
      score++;
    }
  });

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  return { score, maxScore, percentage, allCorrect: score === maxScore };
}

export function getQuizBlocks(blocks: QuizLessonBlock[]): QuizLessonBlock[] {
  return blocks.filter(b => b.type === 'quiz') as QuizLessonBlock[];
}

export function getXpForQuizResult(correct: boolean, allCorrect: boolean): number {
  if (allCorrect) return 30;
  if (correct) return 10;
  return 0;
}
