import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { QuestionBlock } from '../../types/content';
import MultipleChoiceQuestion from '../quiz/MultipleChoiceQuestion';
import FillBlankQuestion from '../quiz/FillBlankQuestion';
import MatchQuestion from '../quiz/MatchQuestion';
import { getContentRepository } from '../../lib/content/repository';
import { packageText } from '../../lib/content/text';
import { colors, fonts, radii, spacing } from '../../theme/tokens';

interface LevelQuestionBlockProps {
  block: QuestionBlock;
  onAnswer?: (blockId: string, selectedAnswer: unknown, correct: boolean) => void | Promise<void>;
}

export default function LevelQuestionBlock({ block, onAnswer }: LevelQuestionBlockProps) {
  const repo = getContentRepository();
  if (block.questionType === 'multiple-choice') {
    return (
      <View style={styles.container}>
        <Text style={styles.badge}>{packageText(repo, 'question.quiz')}</Text>
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
        <Text style={styles.badge}>{packageText(repo, 'question.quiz')}</Text>
        <MultipleChoiceQuestion
          question={block.question}
          options={[packageText(repo, 'question.true'), packageText(repo, 'question.false')].map((text, index) => ({ id: String(index), text }))}
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
        <Text style={styles.badge}>{packageText(repo, 'question.quiz')}</Text>
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
        <Text style={styles.badge}>{packageText(repo, 'question.quiz')}</Text>
        <MatchQuestion
          question={block.question}
          pairs={block.matchPairs ?? []}
          onResult={(correct, selections) => onAnswer?.(block.id, selections, correct)}
        />
      </View>
    );
  }

  return <Text style={styles.unsupported}>{packageText(repo, 'content.unsupported')}</Text>;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.gold,
  },
  badge: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  unsupported: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 22 },
});
