import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LevelStep } from '../../types/content';
import type { ExerciseSubmissionResult } from '../../types/activities';
import { colors, fonts } from '../../theme/tokens';
import LevelBlockRenderer from './LevelBlockRenderer';
import Card from '../ui/Card';

interface StepRendererProps {
  step: LevelStep;
  onQuestionAnswer?: (blockId: string, selectedAnswer: unknown, correct: boolean) => Promise<ExerciseSubmissionResult>;
  onActivityAnswer?: (activityId: string, answer: unknown, correct: boolean) => Promise<ExerciseSubmissionResult>;
}

export default function StepRenderer({ step, onQuestionAnswer, onActivityAnswer }: StepRendererProps) {
  return (
    <View>
      <Card elevated={false} style={styles.titleCard}>
        <Text accessibilityRole="header" style={styles.stepTitle}>{step.title}</Text>
      </Card>
      {step.blocks.map(block => (
        <LevelBlockRenderer
          key={block.id}
          block={block}
          onQuestionAnswer={onQuestionAnswer}
          onActivityAnswer={onActivityAnswer}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stepTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    fontWeight: '800',
    color: colors.primary,
  },
  titleCard: { backgroundColor: 'transparent', marginBottom: 8, padding: 0 },
});
