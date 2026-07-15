import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import {
  AyahRecord,
  AudioBlock,
  ContentRepository,
  ContextBlock,
  LevelBlock,
  MediaBlock,
  QuranPassageBlock,
  SummaryLevelBlock,
  TafsirEntry,
  TranslationBlock,
  WordMeaning,
  WordMeaningBlock,
} from '../../types/content';
import { getContentRepository } from '../../lib/content/repository';
import Card from '../ui/Card';
import LevelQuestionBlock from './LevelQuestionBlock';
import PracticeActivityRenderer from './PracticeActivityRenderer';
import { packageText } from '../../lib/content/text';

interface LevelBlockRendererProps {
  block: LevelBlock;
  onQuestionAnswer?: (blockId: string, selectedAnswer: unknown, correct: boolean) => void | Promise<void>;
  onActivityAnswer?: (activityId: string, answer: unknown, correct: boolean) => void | Promise<void>;
}

const DEFAULT_TRANSLATION_LOCALE = 'en';

export default function LevelBlockRenderer({ block, onQuestionAnswer, onActivityAnswer }: LevelBlockRendererProps) {
  const repo = getContentRepository();

  switch (block.type) {
    case 'quran_passage':
      return <CanonicalPassageBlock block={block} repo={repo} />;
    case 'translation':
      return <CanonicalTranslationBlock block={block} repo={repo} />;
    case 'word_meaning':
      return <SelectedWordMeaningBlock block={block} repo={repo} />;
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
      return words.length > 0 ? <WordExplorerBlock words={words} repo={repo} /> : null;
    }
    case 'audio':
      return <CanonicalAudioBlock block={block} repo={repo} />;
    case 'media':
      return <CanonicalMediaBlock block={block} repo={repo} />;
    case 'question':
      return <LevelQuestionBlock block={block} onAnswer={onQuestionAnswer} />;
    case 'activity':
      return <PracticeActivityRenderer activity={block.activity} onAnswer={(answer, correct) => onActivityAnswer?.(block.activity.id, answer, correct) ?? Promise.resolve()} />;
    case 'summary':
      return <CanonicalSummaryBlock block={block} />;
    default:
      return <Card><Text style={styles.unsupported}>{packageText(repo, 'content.unsupported')}</Text></Card>;
  }
}

function CanonicalPassageBlock({ block, repo }: { block: QuranPassageBlock; repo: ContentRepository }) {
  const ayat = repo.getAyatByRefs(block.ayahRefs);
  return <Card variant="ayah" style={styles.ayahCard}>{ayat.map(ayah => <View key={ayah.id} style={styles.passageAyah}><Text style={styles.arabic}>{ayah.arabicText.text}</Text>{block.showTransliteration && ayah.transliteration ? <Text style={styles.transliteration}>{ayah.transliteration}</Text> : null}</View>)}</Card>;
}

function CanonicalTranslationBlock({ block, repo }: { block: TranslationBlock; repo: ContentRepository }) {
  const entries = repo.getAyatByRefs(block.ayahRefs).flatMap(ayah => {
    const selected = ayah.translations.filter(entry => entry.locale === block.locale && (!block.translationEntryIds || block.translationEntryIds.includes(entry.id)));
    return selected.map(entry => ({ ayah, entry, source: repo.getSourceById(entry.sourceId) }));
  });
  return <Card><Text style={styles.wordTitle}>{packageText(repo, 'content.translation')}</Text>{entries.length > 0 ? entries.map(({ ayah, entry, source }) => <View key={entry.id} style={styles.translationEntry}><Text style={styles.translation}>{entry.text}</Text><Text style={styles.source}>{packageText(repo, 'content.source')}: {source?.name ?? packageText(repo, 'content.sourceUnavailable')} ({ayah.ref.surahNumber}:{ayah.ref.ayahNumber})</Text></View>) : <Text style={styles.translation}>{packageText(repo, 'content.translationUnavailable')}</Text>}</Card>;
}

function SelectedWordMeaningBlock({ block, repo }: { block: WordMeaningBlock; repo: ContentRepository }) {
  const selectedIds = new Set(block.wordMeaningIds);
  const words = repo.ayat.flatMap(ayah => ayah.wordMeanings ?? []).filter(word => selectedIds.has(word.id));
  return words.length > 0 ? <WordExplorerBlock words={words} repo={repo} /> : null;
}

function CanonicalAudioBlock({ block, repo }: { block: AudioBlock; repo: ContentRepository }) {
  const tracks = block.ayahRefs.flatMap(ref => {
    const track = repo.getRecitationTrackByAyah(ref, block.reciterId);
    return track ? [track] : [];
  });
  return <Card><Text style={styles.wordTitle}>{packageText(repo, 'content.listen')}</Text>{tracks.length === block.ayahRefs.length ? tracks.map(track => <Text key={track.id} style={styles.sourceValue}>{repo.getReciterById(track.reciterId)?.displayName ?? packageText(repo, 'content.sourceUnavailable')}</Text>) : <Text style={styles.translation}>{packageText(repo, 'content.audioUnavailable')}</Text>}</Card>;
}

function CanonicalMediaBlock({ block, repo }: { block: MediaBlock; repo: ContentRepository }) {
  const asset = repo.getActivePackage()?.mediaAssets.find(candidate => candidate.id === block.assetId);
  if (!asset) return null;
  return <Card><Image source={asset.uri} accessibilityLabel={asset.altText} contentFit="contain" style={styles.media} /><Text style={styles.source}>{asset.altText}</Text></Card>;
}

function CanonicalAyahBlock({ ayah, locale, repo }: { ayah: AyahRecord; locale?: string; repo: ContentRepository }) {
  const translation = ayah.translations.find(entry => entry.locale === (locale ?? DEFAULT_TRANSLATION_LOCALE)) ?? ayah.translations[0];
  const arabicSource = repo.getSourceById(ayah.sourceId);
  const translationSource = translation ? repo.getSourceById(translation.sourceId) : undefined;

  return (
    <Card variant="ayah" style={styles.ayahCard}>
      <Text style={styles.arabic}>{ayah.arabicText.text}</Text>
      {ayah.transliteration ? <Text style={styles.transliteration}>{ayah.transliteration}</Text> : null}
      <View style={styles.divider} />
      <Text style={styles.translation}>{translation?.text ?? packageText(repo, 'content.translationUnavailable')}</Text>
      <View style={styles.sourceGroup}>
        <Text style={styles.sourceLabel}>{packageText(repo, 'content.arabicSource')}</Text>
        <Text style={styles.sourceValue}>{arabicSource?.name ?? packageText(repo, 'content.sourceUnavailable')}</Text>
        <Text style={styles.sourceLabel}>{packageText(repo, 'content.translationSource')}</Text>
        <Text style={styles.sourceValue}>{translationSource?.name ?? packageText(repo, 'content.sourceUnavailable')}</Text>
      </View>
    </Card>
  );
}

function CanonicalTafsirBlock({ entry, repo }: { entry: TafsirEntry; repo: ContentRepository }) {
  const [expanded, setExpanded] = useState(true);
  const source = repo.getSourceById(entry.sourceId);

  return (
    <Card variant="tafsir">
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={packageText(repo, 'content.toggleDetails')}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(value => !value)}
        activeOpacity={0.8}
      >
        <View style={styles.tafsirHeader}>
          <Text style={styles.tafsirLabel}>{packageText(repo, 'content.tafsir')}</Text>
          <Text style={styles.toggle}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>
      {expanded ? (
        <View>
          {entry.reviewerStatus !== 'approved' ? <ReviewBadge repo={repo} /> : null}
          <Text style={styles.tafsirText}>{entry.text}</Text>
          {entry.explanation ? (
            <View style={styles.explanationSection}>
            <Text style={styles.explanationLabel}>{packageText(repo, 'content.explanation')}</Text>
              <Text style={styles.explanationText}>{entry.explanation}</Text>
            </View>
          ) : null}
          <Text style={styles.source}>{packageText(repo, 'content.source')}: {source?.name ?? packageText(repo, 'content.sourceUnavailable')} ({entry.reviewerStatus})</Text>
        </View>
      ) : null}
    </Card>
  );
}

function CanonicalContextBlock({ block, repo }: { block: ContextBlock; repo: ContentRepository }) {
  const sources = block.sourceIds.map(id => repo.getSourceById(id)?.name ?? packageText(repo, 'content.sourceUnavailable')).join(', ');
  const label = packageText(repo, `content.context.${block.kind}`);

  return (
    <Card variant="story">
      <Text style={styles.contextLabel}>{label}</Text>
      {block.reviewerStatus !== 'approved' ? <ReviewBadge repo={repo} /> : null}
      <Text style={styles.contextTitle}>{block.title}</Text>
      <Text style={styles.contextText}>{block.text}</Text>
      <Text style={styles.source}>{packageText(repo, 'content.source')}: {sources} ({block.reviewerStatus})</Text>
    </Card>
  );
}

function WordExplorerBlock({ words, repo }: { words: WordMeaning[]; repo: ContentRepository }) {
  return (
    <Card style={styles.wordCard}>
      <Text style={styles.wordTitle}>{packageText(repo, 'content.wordByWord')}</Text>
      {words.map(word => (
        <View key={word.id} style={styles.wordRow}>
          <Text style={styles.wordArabic}>{repo.getWordToken(word.wordTokenId)?.arabicText ?? ''}</Text>
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

function ReviewBadge({ repo }: { repo: ContentRepository }) {
  return (
    <View style={styles.reviewBadge}>
      <Text style={styles.reviewBadgeText}>{packageText(repo, 'content.draftPendingReview')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  unsupported: { color: '#7F8C8D', fontSize: 14, lineHeight: 21 },
  ayahCard: { alignItems: 'center' },
  passageAyah: { width: '100%', paddingVertical: 6 },
  arabic: { fontSize: 30, fontFamily: 'serif', textAlign: 'right', color: '#1A1A1A', lineHeight: 48, width: '100%', writingDirection: 'rtl' },
  transliteration: { fontSize: 15, fontStyle: 'italic', color: '#666', textAlign: 'center', marginTop: 8, lineHeight: 22 },
  divider: { height: 1, backgroundColor: '#EEE', width: '100%', marginVertical: 12 },
  translation: { fontSize: 17, color: '#2C3E50', lineHeight: 26, textAlign: 'center', fontWeight: '500' },
  translationEntry: { marginBottom: 12 },
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
  media: { width: '100%', minHeight: 180 },
});
