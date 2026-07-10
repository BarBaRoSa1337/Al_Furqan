import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  AyahRecord,
  ContentRepository,
  ContextBlock,
  LevelBlock,
  SummaryLevelBlock,
  TafsirEntry,
  WordMeaning,
} from '../../types/content';
import { getContentRepository } from '../../lib/content/repository';
import Card from '../ui/Card';
import LevelQuestionBlock from './LevelQuestionBlock';

interface LevelBlockRendererProps {
  block: LevelBlock;
  onQuestionAnswer?: (blockId: string, selectedAnswer: string | number, correct: boolean) => void;
}

const DEFAULT_TRANSLATION_LOCALE = 'en';

export default function LevelBlockRenderer({ block, onQuestionAnswer }: LevelBlockRendererProps) {
  const repo = getContentRepository();

  switch (block.type) {
    case 'ayah_ref': {
      const ayah = repo.getAyahByRef(block.ayahRef);
      return ayah ? <CanonicalAyahBlock ayah={ayah} locale={block.translationLocale} repo={repo} /> : null;
    }
    case 'tafsir_ref': {
      const ayah = repo.getAyahByRef(block.ayahRef);
      const entry = ayah?.tafsirEntries.find(tafsir => tafsir.id === block.tafsirEntryId);
      return entry ? <CanonicalTafsirBlock entry={entry} repo={repo} /> : null;
    }
    case 'context':
      return <CanonicalContextBlock block={block} repo={repo} />;
    case 'word_explorer': {
      const words = block.ayahRefs.flatMap(ref => repo.getAyahByRef(ref)?.wordMeanings ?? []);
      return words.length > 0 ? <WordExplorerBlock words={words} /> : null;
    }
    case 'question':
      return <LevelQuestionBlock block={block} onAnswer={onQuestionAnswer} />;
    case 'summary':
      return <CanonicalSummaryBlock block={block} />;
    default:
      return null;
  }
}

function CanonicalAyahBlock({ ayah, locale, repo }: { ayah: AyahRecord; locale?: string; repo: ContentRepository }) {
  const translation = ayah.translations.find(entry => entry.locale === (locale ?? DEFAULT_TRANSLATION_LOCALE)) ?? ayah.translations[0];
  const arabicSource = repo.getSourceById(ayah.arabicText.sourceId);
  const translationSource = translation ? repo.getSourceById(translation.sourceId) : undefined;

  return (
    <Card variant="ayah" style={styles.ayahCard}>
      <Text style={styles.arabic}>{ayah.arabicText.text}</Text>
      {ayah.transliteration ? <Text style={styles.transliteration}>{ayah.transliteration}</Text> : null}
      <View style={styles.divider} />
      <Text style={styles.translation}>{translation?.text ?? 'Translation unavailable.'}</Text>
      <View style={styles.sourceGroup}>
        <Text style={styles.sourceLabel}>Arabic source</Text>
        <Text style={styles.sourceValue}>{arabicSource?.name ?? ayah.arabicText.sourceId}</Text>
        <Text style={styles.sourceLabel}>Translation source</Text>
        <Text style={styles.sourceValue}>{translationSource?.name ?? translation?.sourceId ?? 'Unavailable'}</Text>
      </View>
    </Card>
  );
}

function CanonicalTafsirBlock({ entry, repo }: { entry: TafsirEntry; repo: ContentRepository }) {
  const [expanded, setExpanded] = useState(true);
  const source = repo.getSourceById(entry.sourceId);

  return (
    <Card variant="tafsir">
      <TouchableOpacity onPress={() => setExpanded(value => !value)} activeOpacity={0.8}>
        <View style={styles.tafsirHeader}>
          <Text style={styles.tafsirLabel}>Tafsir</Text>
          <Text style={styles.toggle}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>
      {expanded ? (
        <View>
          {entry.reviewerStatus !== 'approved' ? <ReviewBadge /> : null}
          <Text style={styles.tafsirText}>{entry.text}</Text>
          {entry.explanation ? (
            <View style={styles.explanationSection}>
              <Text style={styles.explanationLabel}>Explanation</Text>
              <Text style={styles.explanationText}>{entry.explanation}</Text>
            </View>
          ) : null}
          <Text style={styles.source}>Source: {source?.name ?? entry.sourceId} ({entry.reviewerStatus})</Text>
        </View>
      ) : null}
    </Card>
  );
}

function CanonicalContextBlock({ block, repo }: { block: ContextBlock; repo: ContentRepository }) {
  const sources = block.sourceIds.map(id => repo.getSourceById(id)?.name ?? id).join(', ');
  const label = block.kind.replace(/_/g, ' ');

  return (
    <Card variant="story">
      <Text style={styles.contextLabel}>{label}</Text>
      {block.reviewerStatus !== 'approved' ? <ReviewBadge /> : null}
      <Text style={styles.contextTitle}>{block.title}</Text>
      <Text style={styles.contextText}>{block.text}</Text>
      <Text style={styles.source}>Source: {sources} ({block.reviewerStatus})</Text>
    </Card>
  );
}

function WordExplorerBlock({ words }: { words: WordMeaning[] }) {
  return (
    <Card style={styles.wordCard}>
      <Text style={styles.wordTitle}>Word by Word</Text>
      {words.map((word, index) => (
        <View key={`${word.arabic}-${index}`} style={styles.wordRow}>
          <Text style={styles.wordArabic}>{word.arabic}</Text>
          <View style={styles.wordMeaning}>
            <Text style={styles.wordTransliteration}>{word.transliteration}</Text>
            <Text style={styles.wordText}>{word.meaning}</Text>
          </View>
        </View>
      ))}
    </Card>
  );
}

function CanonicalSummaryBlock({ block }: { block: SummaryLevelBlock }) {
  return (
    <Card style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>{block.title}</Text>
      {block.points.map((point, index) => (
        <View key={`${block.id}-${index}`} style={styles.summaryPoint}>
          <Text style={styles.summaryBullet}>•</Text>
          <Text style={styles.summaryText}>{point}</Text>
        </View>
      ))}
    </Card>
  );
}

function ReviewBadge() {
  return (
    <View style={styles.reviewBadge}>
      <Text style={styles.reviewBadgeText}>Draft religious explanation pending review</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ayahCard: { alignItems: 'center' },
  arabic: { fontSize: 30, fontFamily: 'serif', textAlign: 'right', color: '#1A1A1A', lineHeight: 48, width: '100%', writingDirection: 'rtl' },
  transliteration: { fontSize: 15, fontStyle: 'italic', color: '#666', textAlign: 'center', marginTop: 8, lineHeight: 22 },
  divider: { height: 1, backgroundColor: '#EEE', width: '100%', marginVertical: 12 },
  translation: { fontSize: 17, color: '#2C3E50', lineHeight: 26, textAlign: 'center', fontWeight: '500' },
  sourceGroup: { width: '100%', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  sourceLabel: { fontSize: 11, color: '#7F8C8D', textTransform: 'uppercase', letterSpacing: 0.6, textAlign: 'center' },
  sourceValue: { fontSize: 12, color: '#566573', marginTop: 2, marginBottom: 8, textAlign: 'center' },
  tafsirHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tafsirLabel: { fontSize: 16, fontWeight: '700', color: '#7D6608' },
  toggle: { fontSize: 12, color: '#999' },
  tafsirText: { fontSize: 16, color: '#2C3E50', lineHeight: 26 },
  explanationSection: { marginTop: 12, padding: 12, backgroundColor: '#FFFDE7', borderRadius: 10 },
  explanationLabel: { fontSize: 12, fontWeight: '700', color: '#7D6608', textTransform: 'uppercase', marginBottom: 4 },
  explanationText: { fontSize: 14, color: '#444', lineHeight: 22 },
  reviewBadge: { backgroundColor: '#FCF3CF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  reviewBadgeText: { fontSize: 12, fontWeight: '700', color: '#9A7D0A', textAlign: 'center' },
  source: { fontSize: 11, color: '#AAA', marginTop: 12 },
  contextLabel: { fontSize: 12, fontWeight: '700', color: '#1E5631', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  contextTitle: { fontSize: 18, fontWeight: '700', color: '#1E5631', marginBottom: 10 },
  contextText: { fontSize: 16, color: '#2C3E50', lineHeight: 26 },
  wordCard: { marginBottom: 16 },
  wordTitle: { fontSize: 14, fontWeight: '700', color: '#1B4F72', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  wordRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  wordArabic: { width: 90, fontSize: 22, fontFamily: 'serif', textAlign: 'right', color: '#1B4F72' },
  wordMeaning: { flex: 1, marginLeft: 14 },
  wordTransliteration: { fontSize: 13, color: '#7F8C8D', fontStyle: 'italic', marginBottom: 2 },
  wordText: { fontSize: 14, color: '#2C3E50', fontWeight: '600' },
  summaryCard: { backgroundColor: '#EBF5FB' },
  summaryTitle: { fontSize: 18, fontWeight: '700', color: '#1B4F72', marginBottom: 16 },
  summaryPoint: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  summaryBullet: { fontSize: 18, color: '#1B4F72', marginRight: 10, lineHeight: 24 },
  summaryText: { fontSize: 15, color: '#2C3E50', lineHeight: 24, flex: 1 },
});
