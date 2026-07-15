import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LevelStep } from '../../types/content';
import LevelBlockRenderer from './LevelBlockRenderer';

interface StepRendererProps {
  step: LevelStep;
  onQuestionAnswer?: (blockId: string, selectedAnswer: string | number, correct: boolean) => void | Promise<void>;
}

export default function StepRenderer({ step, onQuestionAnswer }: StepRendererProps) {
  return (
    <View>
      <Text style={styles.stepTitle}>{step.title}</Text>
      {step.blocks.map(block => (
        <LevelBlockRenderer
          key={block.id}
          block={block}
          onQuestionAnswer={onQuestionAnswer}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stepTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1B4F72',
    marginBottom: 16,
  },
});
