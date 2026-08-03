import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MoroccanBackdrop } from '../../components/furqan/FurqanArtwork';
import RoadmapNode, { type NodeStatus } from '../../components/roadmap/RoadmapNode';
import SurahProgressRing from '../../components/roadmap/SurahProgressRing';
import Screen from '../../components/ui/Screen';
import { getContentRepository } from '../../lib/content/repository';
import { getLevelAccessState } from '../../lib/progress/lessonAccess';
import { getAppProgress, reconcileCurriculumProgress } from '../../lib/progress/storage';
import { colors, fonts, spacing, touch } from '../../theme/tokens';
import type { AppProgress } from '../../types/progress';
import { DEFAULT_PROGRESS } from '../../types/progress';

export default function SurahPathScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const surahId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const repo = getContentRepository();
  const path = repo.getCurrentLearningPath();
  const authored = path && surahId ? repo.listAuthoredSurahs(path.id).find(item => item.surah.id === surahId) : undefined;
  const [progress, setProgress] = useState<AppProgress>(DEFAULT_PROGRESS);

  useFocusEffect(useCallback(() => {
    let active = true;
    void (async () => {
      if (path) await reconcileCurriculumProgress([path]);
      const value = await getAppProgress();
      if (active) setProgress(value);
    })();
    return () => { active = false; };
  }, [path]));

  if (!authored) {
    return <Screen style={styles.center}><Text accessibilityRole="header" style={styles.title}>Surah path not found</Text><Pressable accessibilityRole="button" onPress={() => router.replace('/roadmap')}><Text style={styles.link}>Back to Home</Text></Pressable></Screen>;
  }

  const completed = authored.levels.filter(level => progress.completedLevelIds.includes(level.id)).length;
  const activeIndex = authored.levels.findIndex(level => getLevelAccessState(authored.levels, progress.completedLevelIds, level.id) === 'active');

  return (
    <Screen>
      <MoroccanBackdrop />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityLabel="Back to Home" accessibilityRole="button" hitSlop={8} onPress={() => router.back()} style={styles.back}>
          <Ionicons color={colors.primary} name="arrow-back" size={24} />
        </Pressable>
        <View style={styles.hero}>
          <SurahProgressRing activeIndex={activeIndex < 0 ? completed : activeIndex} completed={completed} size={108} surahNumber={authored.surah.surahNumber} total={authored.levels.length} />
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>SURAH LEARNING PATH</Text>
            <Text accessibilityRole="header" style={styles.title}>{authored.surah.transliteratedName}</Text>
            <Text style={styles.arabic}>{authored.surah.arabicName}</Text>
            <Text style={styles.progress}>{completed} of {authored.levels.length} lessons complete</Text>
          </View>
        </View>
        <View style={styles.roadmap}>
          {authored.curriculum.lessons.map((lesson, index) => {
            const level = authored.levels.find(candidate => candidate.id === lesson.levelId);
            if (!level) return null;
            const status = getLevelAccessState(authored.levels, progress.completedLevelIds, level.id) as NodeStatus;
            const label = lesson.kind === 'introduction'
              ? 'Surah introduction'
              : lesson.kind === 'final_review'
                ? 'Surah checkpoint'
                : lesson.kind === 'segment_review'
                  ? 'Segment checkpoint'
                : level.ayahRefs.length > 1
                  ? `Ayahs ${level.ayahRefs[0].ayahNumber}-${level.ayahRefs.at(-1)?.ayahNumber}`
                  : `Ayah ${level.ayahRefs[0]?.ayahNumber}`;
            return <RoadmapNode ayahLabel={label} description={level.description} durationMinutes={level.durationMinutes} id={level.id} index={index} isLast={index === authored.curriculum.lessons.length - 1} key={level.id} onPress={id => router.push(`/level/${id}`)} status={status} title={level.title} />;
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { alignSelf: 'center', maxWidth: 600, padding: spacing.lg, paddingBottom: spacing.xxl, width: '100%' },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  back: { alignItems: 'center', justifyContent: 'center', minHeight: touch.minimum, width: touch.minimum },
  hero: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.xl, marginTop: spacing.sm },
  heroCopy: { flex: 1 },
  eyebrow: { color: colors.success, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1 },
  title: { color: colors.primary, fontFamily: fonts.bold, fontSize: 28, lineHeight: 34 },
  arabic: { color: colors.primary, fontFamily: fonts.arabic, fontSize: 28, lineHeight: 40, writingDirection: 'rtl' },
  progress: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 13 },
  link: { color: colors.success, fontFamily: fonts.bold, marginTop: spacing.lg },
  roadmap: { paddingBottom: spacing.xl },
});
