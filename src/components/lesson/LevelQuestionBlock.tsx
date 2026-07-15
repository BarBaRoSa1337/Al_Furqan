import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { QuestionBlock } from '../../types/content';
import MultipleChoiceQuestion from '../quiz/MultipleChoiceQuestion';
import FillBlankQuestion from '../quiz/FillBlankQuestion';
import MatchQuestion from '../quiz/MatchQuestion';

interface LevelQuestionBlockProps {
  block: QuestionBlock;
  onAnswer?: (blockId: string, selectedAnswer: string | number, correct: boolean) => void | Promise<void>;
}

export default function LevelQuestionBlock({ block, onAnswer }: LevelQuestionBlockProps) {
  if (block.questionType === 'multiple-choice') {
    return (
      <View style={styles.container}>
        <Text style={styles.badge}>Quiz</Text>
        <MultipleChoiceQuestion
          question={block.question}
          options={block.options.map((text, index) => ({ id: String(index), text }))}
          correctOptionId={String(block.correctAnswer)}
          explanation={block.explanation}
          onResult={(correct, selectedAnswer) => onAnswer?.(block.id, selectedAnswer, correct)}
        />
      </View>
    );
  }

  if (block.questionType === 'true-false') {
    return (
      <View style={styles.container}>
        <Text style={styles.badge}>Quiz</Text>
        <MultipleChoiceQuestion
          question={block.question}
          options={['True', 'False'].map((text, index) => ({ id: String(index), text }))}
          correctOptionId={String(block.correctAnswer)}
          explanation={block.explanation}
          onResult={(correct, selectedAnswer) => onAnswer?.(block.id, selectedAnswer, correct)}
        />
      </View>
    );
  }

  if (block.questionType === 'fill-blank') {
    return (
      <View style={styles.container}>
        <Text style={styles.badge}>Quiz</Text>
        <FillBlankQuestion
          question={block.question}
          blankText={block.blankText ?? block.question}
          correctAnswer={String(block.correctAnswer)}
          caseSensitive={block.caseSensitive}
          explanation={block.explanation}
          onResult={(correct, selectedAnswer) => onAnswer?.(block.id, selectedAnswer, correct)}
        />
      </View>
    );
  }

  if (block.questionType === 'match') {
    return (
      <View style={styles.container}>
        <Text style={styles.badge}>Quiz</Text>
        <MatchQuestion
          question={block.question}
          pairs={block.matchPairs ?? []}
          onResult={(correct, score) => onAnswer?.(block.id, score, correct)}
        />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#6C3483',
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6C3483',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  unsupported: { fontSize: 14, color: '#7F8C8D', lineHeight: 22 },
});
