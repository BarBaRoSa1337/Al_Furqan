import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SummaryLessonBlock } from '../../../types/content';
import Card from '../../ui/Card';

interface Props { block: SummaryLessonBlock; }

const SummaryBlock: React.FC<Props> = ({ block }) => {
  const { title, points } = block.content;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>✨ {title}</Text>
      {points.map((point, i) => (
        <View key={i} style={styles.point}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.pointText}>{point}</Text>
        </View>
      ))}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#EBF5FB' },
  title: { fontSize: 18, fontWeight: '700', color: '#1B4F72', marginBottom: 16 },
  point: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  bullet: { fontSize: 18, color: '#1B4F72', marginRight: 10, lineHeight: 24 },
  pointText: { fontSize: 15, color: '#2C3E50', lineHeight: 24, flex: 1 },
});

export default SummaryBlock;
