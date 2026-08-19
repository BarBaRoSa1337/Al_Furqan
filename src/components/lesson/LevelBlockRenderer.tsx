import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import {
  AyahRecord,
  AudioBlock,
  ContentSource,
  ContentRepository,
  ContextBlock,
  LevelBlock,
  MediaBlock,
  QuranPassageBlock,
  SourceLockedBlock,
  SurahOverviewBlock,
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
import WisdomCard from './WisdomCard';
import AyahAudioPlayer from './AyahAudioPlayer';
import { colors, fonts, radii, spacing, touch } from '../../theme/tokens';
import { getCurrentLearnerPreferences } from '../../lib/localization/preferencesState';
import type { ExerciseSubmissionResult } from '../../types/activities';
import { isBlockEligibleForProduction } from '../../lib/content/contentEligibility';
import { isPreviewContentMode } from '../../lib/content/contentMode';

interface LevelBlockRendererProps {
  block: LevelBlock;
  onQuestionAnswer?: (blockId: string, selectedAnswer: unknown, correct: boolean) => Promise<ExerciseSubmissionResult>;
  onActivityAnswer?: (activityId: string, answer: unknown, correct: boolean) => Promise<ExerciseSubmissionResult>;
}

export default function LevelBlockRenderer({ block, onQuestionAnswer, onActivityAnswer }: LevelBlockRendererProps) {
  const repo = getContentRepository();
  const preferences = getCurrentLearnerPreferences();
  const contentPackage = repo.getPackageForBlock(block.id);
  if (!isPreviewContentMode() && contentPackage && !isBlockEligibleForProduction(block, contentPackage)) return null;

  switch (block.type) {
    case 'surah_overview':
      return <CanonicalSurahOverviewBlock block={block} repo={repo} />;
    case 'quran_passage':
      return <CanonicalPassageBlock block={block} repo={repo} showTransliteration={preferences.transliterationPreference === 'show'} />;
    case 'translation':
      return <CanonicalTranslationBlock block={block} repo={repo} />;
    case 'word_meaning':
      return <SelectedWordMeaningBlock block={block} repo={repo} />;
    case 'ayah_ref': {
      const ayah = repo.getAyahByRef(block.ayahRef);
      return ayah ? <CanonicalAyahBlock ayah={ayah} locale={block.translationLocale ?? preferences.lessonLocale} repo={repo} showTransliteration={preferences.transliterationPreference === 'show'} /> : null;
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
    case 'source_locked':
      return <SourceLockedCard block={block} repo={repo} />;
    case 'media':
      return <CanonicalMediaBlock block={block} repo={repo} />;
    case 'question':
      return <LevelQuestionBlock block={block} onAnswer={onQuestionAnswer} />;
    case 'activity':
      return <PracticeActivityRenderer activity={block.activity} onAnswer={(answer, correct) => onActivityAnswer?.(block.activity.id, answer, correct) ?? Promise.resolve({ correct: false })} />;
    case 'summary':
      return <WisdomCard block={block} repo={repo} />;
    default:
      return <Card><Text style={styles.unsupported}>{packageText(repo, 'content.unsupported')}</Text></Card>;
  }
}

function CanonicalSurahOverviewBlock({ block, repo }: { block: SurahOverviewBlock; repo: ContentRepository }) {
  const surah = repo.getSurahById(block.surahId);
  if (!surah) return null;
  const source = repo.getSourceById(surah.sourceMetadata.quranTextSourceId);
  return (
    <Card variant="ayah" style={styles.overviewCard}>
      <Text style={styles.overviewEyebrow}>Surah {surah.surahNumber}</Text>
      <Text style={styles.overviewArabic}>{surah.arabicName}</Text>
      <Text accessibilityRole="header" style={styles.overviewTitle}>{surah.transliteratedName}</Text>
      <Text style={styles.overviewMeta}>{surah.englishName} · {surah.ayahCount} ayat · {surah.revelationPlace === 'makkah' ? 'Makkan' : 'Madinan'}</Text>
      <SourceAttribution source={source} unavailable={packageText(repo, 'content.sourceUnavailable')} />
    </Card>
  );
}

function CanonicalPassageBlock({ block, repo, showTransliteration }: { block: QuranPassageBlock; repo: ContentRepository; showTransliteration: boolean }) {
  const ayat = repo.getAyatByRefs(block.ayahRefs);
  return (
    <Card variant="mushaf" style={styles.mushafAyahCard}>
      {ayat.map((ayah, index) => (
        <View key={ayah.id} style={styles.passageAyah}>
          <Text style={styles.arabic}>{ayah.arabicText.text}</Text>
          {showTransliteration && block.showTransliteration && ayah.transliteration ? (
            <Text style={styles.transliteration}>{ayah.transliteration}</Text>
          ) : null}
          {index < ayat.length - 1 ? <View style={styles.divider} /> : null}
        </View>
      ))}
    </Card>
  );
}

function CanonicalTranslationBlock({ block, repo }: { block: TranslationBlock; repo: ContentRepository }) {
  const entries = repo.getAyatByRefs(block.ayahRefs).flatMap(ayah => {
    const selected = ayah.translations.filter(entry => entry.locale === block.locale && (!block.translationEntryIds || block.translationEntryIds.includes(entry.id)));
    return selected.map(entry => ({ ayah, entry, source: repo.getSourceById(entry.sourceId) }));
  });
  return <Card variant="mushaf"><Text style={styles.wordTitle}>{packageText(repo, 'content.translation')}</Text>{entries.length > 0 ? entries.map(({ ayah, entry, source }) => <View key={entry.id} style={styles.translationEntry}><Text style={[styles.translation, entry.locale === 'ar' ? styles.rtlText : styles.ltrText]}>{entry.text}</Text>{entry.footnotes ? <Text style={[styles.footnotes, entry.locale === 'ar' ? styles.rtlText : styles.ltrText]}>{entry.footnotes}</Text> : null}<Text style={styles.source}>{packageText(repo, 'content.source')}: {source?.name ?? packageText(repo, 'content.sourceUnavailable')} ({ayah.ref.surahNumber}:{ayah.ref.ayahNumber})</Text></View>) : <Text style={styles.translation}>{packageText(repo, 'content.translationUnavailable')}</Text>}</Card>;
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
  if (tracks.length !== block.ayahRefs.length) {
    return <Card><Text style={styles.sourceValue}>{packageText(repo, 'content.audioUnavailable')}</Text></Card>;
  }
  const reciter = repo.getReciterById(tracks[0].reciterId);
  const contentPackage = repo.getPackageForBlock(block.id);
  return reciter && contentPackage
    ? <AyahAudioPlayer contentPackage={contentPackage} reciter={reciter} tracks={tracks} />
    : null;
}

function CanonicalMediaBlock({ block, repo }: { block: MediaBlock; repo: ContentRepository }) {
  const asset = repo.getPackageForBlock(block.id)?.mediaAssets.find(candidate => candidate.id === block.assetId);
  if (!asset) return null;
  return <Card><Image source={asset.uri} accessibilityLabel={asset.altText} contentFit="contain" style={styles.media} /><Text style={styles.source}>{asset.altText}</Text></Card>;
}

function SourceLockedCard({ block, repo }: { block: SourceLockedBlock; repo: ContentRepository }) {
  const source = repo.getSourceById(block.sourceId);
  const capability = packageText(repo, `content.capability.${block.capability}`);
  const reason = packageText(repo, `content.sourceLock.${block.reason}`);
  return (
    <Card style={styles.lockedCard}>
      <Text accessibilityRole="header" style={styles.lockedTitle}>{packageText(repo, 'content.sourceLocked', { capability })}</Text>
      <Text accessibilityLiveRegion="polite" style={styles.lockedText}>{reason}</Text>
      <Text style={styles.lockedAlternative}>{packageText(repo, 'content.sourceLockedAlternative')}</Text>
      <SourceAttribution source={source} unavailable={packageText(repo, 'content.sourceUnavailable')} />
    </Card>
  );
}

function CanonicalAyahBlock({ ayah, locale, repo, showTransliteration }: { ayah: AyahRecord; locale: string; repo: ContentRepository; showTransliteration: boolean }) {
  const translation = ayah.translations.find(entry => entry.locale === locale) ?? ayah.translations[0];
  const arabicSource = repo.getSourceById(ayah.sourceId);
  const translationSource = translation ? repo.getSourceById(translation.sourceId) : undefined;

  return (
    <Card variant="mushaf" style={styles.mushafAyahCard}>
      <Text style={styles.arabic}>{ayah.arabicText.text}</Text>
      {showTransliteration && ayah.transliteration ? <Text style={styles.transliteration}>{ayah.transliteration}</Text> : null}
      <View style={styles.divider} />
      <Text style={[styles.translation, locale === 'ar' ? styles.rtlText : styles.ltrText]}>{translation?.text ?? packageText(repo, 'content.translationUnavailable')}</Text>
      {translation?.footnotes ? <Text style={[styles.footnotes, locale === 'ar' ? styles.rtlText : styles.ltrText]}>{translation.footnotes}</Text> : null}
      <View style={styles.sourceGroup}>
        <Text style={styles.sourceLabel}>{packageText(repo, 'content.arabicSource')}</Text>
        <SourceAttribution source={arabicSource} unavailable={packageText(repo, 'content.sourceUnavailable')} />
        <Text style={styles.sourceLabel}>{packageText(repo, 'content.translationSource')}</Text>
        <SourceAttribution source={translationSource} unavailable={packageText(repo, 'content.sourceUnavailable')} />
      </View>
    </Card>
  );
}

function SourceAttribution({ source, unavailable }: { source?: ContentSource; unavailable: string }) {
  if (!source) return <Text style={styles.sourceValue}>{unavailable}</Text>;
  const label = source.attributionText ?? source.name;
  return (
    <View style={styles.attribution}>
      <Text style={styles.sourceValue}>{label} · v{source.version}</Text>
      {source.sourceUrl ? (
        <Pressable accessibilityRole="link" accessibilityLabel={`${source.name} source`} onPress={() => { void Linking.openURL(source.sourceUrl!); }}>
          <Text style={styles.sourceLink}>{source.sourceUrl}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function CanonicalTafsirBlock({ entry, repo }: { entry: TafsirEntry; repo: ContentRepository }) {
  const [expanded, setExpanded] = useState(true);
  const source = repo.getSourceById(entry.sourceId);

  return (
    <Card variant="tafsir">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={packageText(repo, 'content.toggleDetails')}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(value => !value)}
        style={({ pressed }) => [styles.tafsirControl, pressed && styles.pressed]}
      >
        <View style={styles.tafsirHeader}>
          <Text style={styles.tafsirLabel}>{packageText(repo, 'content.tafsir')}</Text>
          <Text style={styles.toggle}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </Pressable>
      {expanded ? (
        <View>
          <Text style={styles.tafsirText}>{entry.text}</Text>
          {entry.explanation ? (
            <View style={styles.explanationSection}>
            <Text style={styles.explanationLabel}>{packageText(repo, 'content.explanation')}</Text>
              <Text style={styles.explanationText}>{entry.explanation}</Text>
            </View>
          ) : null}
          <Text style={styles.source}>{packageText(repo, 'content.source')}: {source?.name ?? packageText(repo, 'content.sourceUnavailable')}</Text>
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
      <Text style={styles.contextTitle}>{block.title}</Text>
      <Text style={styles.contextText}>{block.text}</Text>
      <Text style={styles.source}>{packageText(repo, 'content.source')}: {sources}</Text>
    </Card>
  );
}

function WordExplorerBlock({ words, repo }: { words: WordMeaning[]; repo: ContentRepository }) {
  return (
    <Card style={styles.wordCard}>
      <Text style={styles.wordTitle}>{packageText(repo, 'content.wordByWord')}</Text>
      {words.map(word => (
        <View key={word.id} style={styles.wordRow}>
          <Text style={styles.wordArabic}>{resolveWordMeaningArabic(word, repo)}</Text>
          <View style={styles.wordMeaning}>
            <Text style={styles.wordTransliteration}>{word.transliteration}</Text>
            <Text style={styles.wordText}>{word.meaning}</Text>
          </View>
        </View>
      ))}
    </Card>
  );
}

export function resolveWordMeaningArabic(word: WordMeaning, repo: Pick<ContentRepository, 'getWordToken'>): string {
  return word.wordTokenId ? repo.getWordToken(word.wordTokenId)?.arabicText ?? '' : '';
}

const styles = StyleSheet.create({
  overviewCard: { alignItems: 'center', paddingVertical: spacing.xl },
  overviewEyebrow: { color: colors.success, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  overviewArabic: { color: colors.primary, fontFamily: fonts.arabic, fontSize: 42, lineHeight: 64, marginTop: spacing.sm, writingDirection: 'rtl' },
  overviewTitle: { color: colors.primary, fontFamily: fonts.bold, fontSize: 26 },
  overviewMeta: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, marginBottom: spacing.md, marginTop: spacing.xs },
  unsupported: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
  ayahCard: { alignItems: 'center' },
  mushafAyahCard: { alignItems: 'center', marginVertical: spacing.xs },
  passageAyah: { paddingVertical: spacing.sm, width: '100%' },
  arabic: { color: colors.primary, fontFamily: fonts.arabic, fontSize: 30, lineHeight: 52, textAlign: 'center', width: '100%', writingDirection: 'rtl' },
  transliteration: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 15, fontStyle: 'italic', lineHeight: 22, marginTop: 10, textAlign: 'center' },
  divider: { backgroundColor: colors.mushafBorderInner, height: 1, marginVertical: 14, width: '100%' },
  translation: { color: colors.text, fontFamily: fonts.regular, fontSize: 16, fontWeight: '500', lineHeight: 25, textAlign: 'center' },
  translationEntry: { marginBottom: 12 },
  footnotes: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, marginTop: spacing.xs },
  ltrText: { textAlign: 'left', writingDirection: 'ltr' },
  rtlText: { textAlign: 'right', writingDirection: 'rtl' },
  sourceGroup: { borderTopColor: colors.border, borderTopWidth: 1, marginTop: spacing.md, paddingTop: spacing.md, width: '100%' },
  attribution: { alignItems: 'center', marginTop: 2 },
  sourceLabel: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.6, textAlign: 'center', textTransform: 'uppercase' },
  sourceValue: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 12, marginBottom: spacing.sm, marginTop: 2, textAlign: 'center' },
  sourceLink: { color: colors.primary, fontFamily: fonts.medium, fontSize: 11, marginBottom: spacing.sm, textAlign: 'center', textDecorationLine: 'underline' },
  tafsirControl: { justifyContent: 'center', minHeight: touch.minimum },
  tafsirHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  tafsirLabel: { color: colors.warning, fontFamily: fonts.bold, fontSize: 16 },
  toggle: { color: colors.textMuted, fontSize: 12 },
  tafsirText: { color: colors.text, fontFamily: fonts.regular, fontSize: 16, lineHeight: 26 },
  explanationSection: { backgroundColor: colors.goldSoft, borderRadius: radii.md, marginTop: spacing.md, padding: spacing.md },
  explanationLabel: { color: colors.warning, fontFamily: fonts.bold, fontSize: 12, marginBottom: spacing.xs, textTransform: 'uppercase' },
  explanationText: { color: colors.text, fontFamily: fonts.regular, fontSize: 14, lineHeight: 22 },
  source: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 11, marginTop: spacing.md },
  contextLabel: { color: colors.success, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.6, marginBottom: spacing.sm, textTransform: 'uppercase' },
  contextTitle: { color: colors.primary, fontFamily: fonts.bold, fontSize: 18, marginBottom: 10 },
  contextText: { color: colors.text, fontFamily: fonts.regular, fontSize: 16, lineHeight: 26 },
  wordCard: { marginBottom: 16 },
  wordTitle: { color: colors.primary, fontFamily: fonts.bold, fontSize: 14, fontWeight: '700', letterSpacing: 0.8, marginBottom: 12, textTransform: 'uppercase' },
  wordRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', paddingVertical: 10 },
  wordArabic: { color: colors.primary, fontFamily: fonts.arabic, fontSize: 24, textAlign: 'right', width: 90 },
  wordMeaning: { flex: 1, marginLeft: 14 },
  wordTransliteration: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, fontStyle: 'italic', marginBottom: 2 },
  wordText: { color: colors.text, fontFamily: fonts.medium, fontSize: 14 },
  media: { width: '100%', minHeight: 180 },
  pressed: { opacity: 0.68 },
  lockedCard: { borderColor: colors.border, borderWidth: 1 },
  lockedTitle: { color: colors.primary, fontFamily: fonts.bold, fontSize: 17, marginBottom: spacing.sm },
  lockedText: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
  lockedAlternative: { color: colors.success, fontFamily: fonts.bold, fontSize: 13, marginTop: spacing.md },
});
