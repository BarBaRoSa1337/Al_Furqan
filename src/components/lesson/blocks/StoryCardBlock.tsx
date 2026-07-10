import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StoryLessonBlock } from '../../../types/content';
import Card from '../../ui/Card';

interface Props { block: StoryLessonBlock; }

const StoryCardBlock: React.FC<Props> = ({ block }) => {
  const { title, description } = block.content;

  return (
    <Card variant="story">
      <Text style={styles.emoji}>🕌</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{description}</Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  emoji: { fontSize: 28, marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '700', color: '#1E5631', marginBottom: 10 },
  text: { fontSize: 16, color: '#2C3E50', lineHeight: 26 },
});

export default StoryCardBlock;
