import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AyahLessonBlock } from '../../../types/content';
import Card from '../../ui/Card';
import { getContentRepository } from '../../../lib/content/repository';

interface Props { block: AyahLessonBlock; }

const QuranAyahBlock: React.FC<Props> = ({ block }) => {
  const { quranText, wordBreakdown } = block.content;
  const repo = getContentRepository();
  const arabicSource = repo.getSourceById(quranText.arabicSourceId);
  const translationSource = repo.getSourceById(quranText.translationSourceId);

  return (
    <View>
      <Card variant="ayah" style={styles.ayahCard}>
        <Text style={styles.arabic}>{quranText.arabic}</Text>
        {quranText.transliteration ? (
          <Text style={styles.transliteration}>{quranText.transliteration}</Text>
        ) : null}
        <View style={styles.divider} />
        <Text style={styles.translation}>{quranText.translation}</Text>
        <View style={styles.sourceGroup}>
          <Text style={styles.sourceLabel}>Arabic source</Text>
          <Text style={styles.sourceValue}>{arabicSource?.name ?? quranText.arabicSourceId}</Text>
          <Text style={styles.sourceLabel}>Translation source</Text>
          <Text style={styles.sourceValue}>{translationSource?.name ?? quranText.translationSourceId}</Text>
        </View>
      </Card>

      {wordBreakdown && wordBreakdown.length > 0 && (
        <Card style={styles.wordsCard}>
          <Text style={styles.sectionTitle}>Word by Word</Text>
          {wordBreakdown.map((word, i) => (
            <View key={i} style={[styles.wordRow, i < wordBreakdown.length - 1 && styles.wordBorder]}>
              <Text style={styles.wordArabic}>{word.arabic}</Text>
              <Text style={styles.wordTranslit}>{word.transliteration}</Text>
              <Text style={styles.wordMeaning}>{word.meaning}</Text>
            </View>
          ))}
        </Card>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  ayahCard: { alignItems: 'center' },
  arabic: {
    fontSize: 30,
    fontFamily: 'serif',
    textAlign: 'right',
    color: '#1A1A1A',
    lineHeight: 48,
    width: '100%',
    writingDirection: 'rtl',
  },
  transliteration: {
    fontSize: 15,
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  divider: { height: 1, backgroundColor: '#EEE', width: '100%', marginVertical: 12 },
  translation: { fontSize: 17, color: '#2C3E50', lineHeight: 26, textAlign: 'center', fontWeight: '500' },
  sourceGroup: { width: '100%', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  sourceLabel: { fontSize: 11, color: '#7F8C8D', textTransform: 'uppercase', letterSpacing: 0.6, textAlign: 'center' },
  sourceValue: { fontSize: 12, color: '#566573', marginTop: 2, marginBottom: 8, textAlign: 'center' },
  wordsCard: {},
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1B4F72', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  wordBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  wordArabic: { fontSize: 22, fontFamily: 'serif', color: '#1B4F72', width: 80, textAlign: 'right' },
  wordTranslit: { fontSize: 13, color: '#888', flex: 1, marginHorizontal: 10, fontStyle: 'italic' },
  wordMeaning: { fontSize: 14, color: '#2C3E50', fontWeight: '600', flex: 1, textAlign: 'right' },
});

export default QuranAyahBlock;
