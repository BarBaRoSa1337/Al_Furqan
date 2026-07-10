import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { TafsirLessonBlock } from '../../../types/content';
import Card from '../../ui/Card';
import { getContentRepository } from '../../../lib/content/repository';

interface Props { block: TafsirLessonBlock; }

const TafsirCardBlock: React.FC<Props> = ({ block }) => {
  const [expanded, setExpanded] = useState(true);
  const { tafsir } = block.content;
  const repo = getContentRepository();
  const source = repo.getSourceById(tafsir.sourceId);
  const isDraft = source?.reviewerStatus !== 'approved';

  return (
    <Card variant="tafsir">
      <TouchableOpacity onPress={() => setExpanded(e => !e)} activeOpacity={0.8}>
        <View style={styles.header}>
          <Text style={styles.label}>📖 Tafsir</Text>
          <Text style={styles.toggle}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.body}>
          {isDraft ? (
            <View style={styles.reviewBadge}>
              <Text style={styles.reviewBadgeText}>Draft religious explanation pending review</Text>
            </View>
          ) : null}
          <Text style={styles.text}>{tafsir.text}</Text>
          {tafsir.explanation ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Explanation</Text>
              <Text style={styles.sectionText}>{tafsir.explanation}</Text>
            </View>
          ) : null}
          {tafsir.context ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Historical Context</Text>
              <Text style={styles.sectionText}>{tafsir.context}</Text>
            </View>
          ) : null}
          <Text style={styles.source}>
            Source: {source?.name ?? tafsir.sourceId}
            {source?.reviewerStatus ? ` (${source.reviewerStatus})` : ''}
          </Text>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 16, fontWeight: '700', color: '#7D6608' },
  toggle: { fontSize: 12, color: '#999' },
  body: { marginTop: 4 },
  reviewBadge: {
    backgroundColor: '#FCF3CF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  reviewBadgeText: { fontSize: 12, fontWeight: '700', color: '#9A7D0A', textAlign: 'center' },
  text: { fontSize: 16, color: '#2C3E50', lineHeight: 26 },
  section: { marginTop: 12, padding: 12, backgroundColor: '#FFFDE7', borderRadius: 10 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#7D6608', textTransform: 'uppercase', marginBottom: 4 },
  sectionText: { fontSize: 14, color: '#444', lineHeight: 22 },
  source: { fontSize: 11, color: '#AAA', marginTop: 12 },
});

export default TafsirCardBlock;
