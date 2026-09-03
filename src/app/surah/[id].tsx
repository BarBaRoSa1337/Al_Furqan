import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MoroccanBackdrop } from '../../components/furqan/FurqanArtwork';
import AyahRoadmap from '../../components/roadmap/AyahRoadmap';
import { buildAyahRoadmapModel } from '../../components/roadmap/ayahRoadmapModel';
import Screen from '../../components/ui/Screen';
import { getContentRepository } from '../../lib/content/repository';
import { getAppProgress, reconcileCurriculumProgress } from '../../lib/progress/storage';
import { colors, fonts, spacing, touch } from '../../theme/tokens';
import type { AppProgress } from '../../types/progress';
import { DEFAULT_PROGRESS } from '../../types/progress';
import { useLocalization } from '../../lib/localization/LocalizationProvider';

export default function SurahPathScreen() {
  const params = useLocalSearchParams<{ id?: string | string[]; ayah?: string | string[] }>();
  const surahId = Array.isArray(params.id) ? params.id[0] : params.id;
  const focusRaw = Array.isArray(params.ayah) ? params.ayah[0] : params.ayah;
  const focusAyah = Number.isInteger(Number(focusRaw)) ? Number(focusRaw) : undefined;
  const router = useRouter();
  const { direction, t } = useLocalization();
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

  const roadmap = useMemo(() => authored ? buildAyahRoadmapModel(authored, progress.completedLevelIds) : undefined, [authored, progress.completedLevelIds]);
  const openLevel = useCallback((levelId: string) => {
    if (levelId) router.push(`/level/${levelId}`);
  }, [router]);

  if (!authored || !roadmap) {
    return <Screen style={styles.center}><Text accessibilityRole="header" style={styles.notFound}>{t('surah.notFound')}</Text><Pressable accessibilityRole="button" onPress={() => router.replace('/roadmap')}><Text style={styles.link}>{t('surah.backHome')}</Text></Pressable></Screen>;
  }

  const header = (
    <View style={styles.headerArea}>
      <View style={styles.topRow}>
        <Pressable accessibilityLabel={t('surah.backHome')} accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Ionicons color={colors.primary} name={direction === 'rtl' ? 'arrow-forward' : 'arrow-back'} size={23} />
        </Pressable>
        <Pressable
          accessibilityLabel={`${authored.surah.arabicName}, ${authored.surah.transliteratedName}`}
          accessibilityRole={roadmap.header.targetLevelId ? 'button' : undefined}
          disabled={!roadmap.header.targetLevelId}
          onPress={() => roadmap.header.targetLevelId && openLevel(roadmap.header.targetLevelId)}
          style={({ pressed }) => [styles.identity, pressed && styles.pressed]}
        >
          <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={styles.arabic}>{authored.surah.arabicName}</Text>
          <Text numberOfLines={2} style={styles.english}>{authored.surah.transliteratedName}</Text>
        </Pressable>
        <View style={styles.topSpacer} />
      </View>
    </View>
  );

  return (
    <Screen>
      <MoroccanBackdrop />
      <AyahRoadmap focusAyah={focusAyah} header={header} items={roadmap.items} onSelectLevel={openLevel} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  notFound: { color: colors.primary, fontFamily: fonts.bold, fontSize: 22, textAlign: 'center' },
  link: { color: colors.success, fontFamily: fonts.bold, marginTop: spacing.lg },
  headerArea: { paddingBottom: spacing.md },
  topRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.xs },
  back: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, height: touch.minimum, justifyContent: 'center', width: touch.minimum },
  topSpacer: { width: touch.minimum },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  identity: { alignItems: 'center', flex: 1, gap: 1, minHeight: touch.minimum, paddingHorizontal: spacing.sm },
  arabic: { color: colors.primary, fontFamily: fonts.arabicMedium, fontSize: 25, lineHeight: 34, maxWidth: 210, textAlign: 'center', writingDirection: 'rtl' },
  english: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 16, lineHeight: 20, maxWidth: 230, textAlign: 'center', writingDirection: 'ltr' },
});
