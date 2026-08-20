import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LevelStep } from '../../types/content';
import { getContentRepository } from '../../lib/content/repository';
import { getCurrentLearnerPreferences } from '../../lib/localization/preferencesState';
import { colors, fonts, spacing, radii } from '../../theme/tokens';
import Card from '../ui/Card';
import AyahAudioPlayer from './AyahAudioPlayer';
import { resolveWordMeaningArabic } from './LevelBlockRenderer';
import { packageText } from '../../lib/content/text';
import { isPreviewContentMode } from '../../lib/content/contentMode';

export default function UnifiedAyahStudyRenderer({ step }: { step: LevelStep }) {
  const repo = getContentRepository();
  const preferences = getCurrentLearnerPreferences();
  
  const ayahBlock = step.blocks.find(b => b.type === 'ayah_ref') as any;
  const audioBlock = step.blocks.find(b => b.type === 'audio') as any;
  const wordBlock = step.blocks.find(b => b.type === 'word_explorer') as any;
  const tafsirBlock = step.blocks.find(b => b.type === 'tafsir_ref') as any;

  if (!ayahBlock) return null;
  const ayah = repo.getAyahByRef(ayahBlock.ayahRef);
  if (!ayah) return null;

  const locale = ayahBlock.translationLocale ?? preferences.lessonLocale;
  const translation = ayah.translations.find((e: any) => e.locale === locale) ?? ayah.translations[0];
  const showTransliteration = preferences.transliterationPreference === 'show';
  const words = wordBlock ? wordBlock.ayahRefs.flatMap((ref: any) => repo.getAyahByRef(ref)?.wordMeanings ?? []) : [];
  const tafsirEntry = tafsirBlock ? ayah.tafsirEntries.find((t: any) => t.id === tafsirBlock.tafsirEntryId) : null;

  const [activeTab, setActiveTab] = useState<'study' | 'words' | 'tafsir'>('study');

  return (
    <View style={styles.container}>
      <Text style={styles.stepTitle}>{step.title}</Text>
      
      {/* Tab Navigation */}
      <View style={styles.tabs}>
        <Pressable onPress={() => setActiveTab('study')} style={[styles.tab, activeTab === 'study' && styles.activeTab]}>
          <Text style={[styles.tabText, activeTab === 'study' && styles.activeTabText]}>Ayah</Text>
        </Pressable>
        {words.length > 0 && (
          <Pressable onPress={() => setActiveTab('words')} style={[styles.tab, activeTab === 'words' && styles.activeTab]}>
            <Text style={[styles.tabText, activeTab === 'words' && styles.activeTabText]}>Words</Text>
          </Pressable>
        )}
        {tafsirEntry && (
          <Pressable onPress={() => setActiveTab('tafsir')} style={[styles.tab, activeTab === 'tafsir' && styles.activeTab]}>
            <Text style={[styles.tabText, activeTab === 'tafsir' && styles.activeTabText]}>Tafsir</Text>
          </Pressable>
        )}
      </View>

      {/* Study Tab */}
      {activeTab === 'study' && (
        <Card style={styles.quranPaperCard}>
          {isPreviewContentMode() ? (
            <View style={styles.draftBadge}><Text style={styles.draftBadgeText}>DRAFT</Text></View>
          ) : null}
          <Text style={styles.arabic}>{ayah.arabicText.text}</Text>
          
          {audioBlock && (
            <View style={styles.inlinePlayer}>
              
              {(() => {
                const tracks = audioBlock.ayahRefs.flatMap((ref: any) => {
                  const track = repo.getRecitationTrackByAyah(ref, audioBlock.reciterId);
                  return track ? [track] : [];
                });
                const reciter = tracks.length > 0 ? repo.getReciterById(tracks[0].reciterId) : null;
                const contentPackage = repo.getPackageForBlock(step.id);
                if (!reciter || !contentPackage || tracks.length !== audioBlock.ayahRefs.length) return null;
                return <AyahAudioPlayer tracks={tracks} reciter={reciter} contentPackage={contentPackage} />;
              })()}

            </View>
          )}

          <View style={styles.divider} />
          
          {showTransliteration && ayah.transliteration ? (
            <Text style={styles.transliteration}>{ayah.transliteration}</Text>
          ) : null}
          
          <Text style={[styles.translation, locale === 'ar' ? styles.rtlText : styles.ltrText]}>
            {translation?.text ?? packageText(repo, 'content.translationUnavailable')}
          </Text>
        </Card>
      )}

      {/* Words Tab */}
      {activeTab === 'words' && words.length > 0 && (
        <Card style={styles.quranPaperCard}>
          {words.map((word: any) => (
            <View key={word.id} style={styles.wordRow}>
              <Text style={styles.wordArabic}>{resolveWordMeaningArabic(word, repo as any)}</Text>
              <View style={styles.wordMeaning}>
                <Text style={styles.wordTransliteration}>{word.transliteration}</Text>
                <Text style={styles.wordText}>{word.meaning}</Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* Tafsir Tab */}
      {activeTab === 'tafsir' && tafsirEntry && (
        <Card style={styles.quranPaperCard}>
          <Text style={styles.tafsirText}>{tafsirEntry.text}</Text>
          {tafsirEntry.explanation ? (
            <View style={styles.explanationSection}>
              <Text style={styles.explanationText}>{tafsirEntry.explanation}</Text>
            </View>
          ) : null}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  stepTitle: { fontSize: 18, fontFamily: fonts.bold, color: colors.primary, marginBottom: 12 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  activeTab: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 13 },
  activeTabText: { color: colors.surface },
  quranPaperCard: { backgroundColor: '#FDFBF7', borderRadius: radii.md, padding: spacing.xl, borderWidth: 1, borderColor: '#EBE5D9', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, position: 'relative' },
  draftBadge: { position: 'absolute', top: -10, right: 10, backgroundColor: colors.warning, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radii.sm, zIndex: 10 },
  draftBadgeText: { color: colors.surface, fontFamily: fonts.bold, fontSize: 10, textTransform: 'uppercase' },
  arabic: { color: colors.primary, fontFamily: fonts.arabic, fontSize: 34, lineHeight: 60, textAlign: 'center', writingDirection: 'rtl', marginBottom: spacing.md },
  inlinePlayer: { width: '100%', marginBottom: spacing.md },
  divider: { backgroundColor: '#EBE5D9', height: 1, marginVertical: spacing.md, width: '100%' },
  transliteration: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 16, fontStyle: 'italic', lineHeight: 24, textAlign: 'center', marginBottom: spacing.sm },
  translation: { color: colors.text, fontFamily: fonts.regular, fontSize: 17, lineHeight: 26, textAlign: 'center' },
  ltrText: { textAlign: 'left', writingDirection: 'ltr' },
  rtlText: { textAlign: 'right', writingDirection: 'rtl' },
  wordRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: '#EBE5D9' },
  wordArabic: { fontFamily: fonts.arabic, fontSize: 24, color: colors.primary, width: '40%', textAlign: 'right', paddingRight: spacing.md },
  wordMeaning: { width: '60%', paddingLeft: spacing.md },
  wordTransliteration: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, fontStyle: 'italic', marginBottom: 2 },
  wordText: { fontFamily: fonts.medium, fontSize: 16, color: colors.text },
  tafsirText: { fontFamily: fonts.regular, fontSize: 16, color: colors.text, lineHeight: 24 },
  explanationSection: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: '#EBE5D9' },
  explanationText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, lineHeight: 22 },
});
