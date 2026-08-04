import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import BottomNavigation from '../components/furqan/BottomNavigation';
import FurqanHeader from '../components/furqan/FurqanHeader';
import { DailyGoalCard } from '../components/furqan/HomeCards';
import { MoroccanBackdrop } from '../components/furqan/FurqanArtwork';
import SurahRoadmap from '../components/roadmap/SurahRoadmap';
import { buildSurahRoadmapItems } from '../components/roadmap/surahRoadmapModel';
import Screen from '../components/ui/Screen';
import { useFurqanDashboard } from '../hooks/useFurqanDashboard';
import { getContentRepository } from '../lib/content/repository';
import { colors, fonts, spacing } from '../theme/tokens';
import { useLocalization } from '../lib/localization/LocalizationProvider';
import { availableLessonLocales, isLessonLocaleAvailable } from '../lib/content/publication';
import Button from '../components/ui/Button';

export default function RoadmapScreen() {
  const router = useRouter();
  const repo = getContentRepository();
  const dashboard = useFurqanDashboard();
  const { preferences, setLessonLocale, t } = useLocalization();
  const [refreshing, setRefreshing] = useState(false);
  const contentPackage = repo.getActivePackage();
  const lessonLocaleAvailable = Boolean(contentPackage && isLessonLocaleAvailable(contentPackage, preferences.lessonLocale));
  const localeAlternatives = contentPackage ? availableLessonLocales(contentPackage) : [];

  const openPrimaryAction = () => {
    if (!lessonLocaleAvailable) {
      router.push('/profile');
      return;
    }
    router.push(dashboard.primaryAction.href);
  };

  const openSurah = (surahId: string) => router.push(`/surah/${surahId}`);

  const roadmapItems = buildSurahRoadmapItems(
    dashboard.authoredSurahs,
    dashboard.progress.completedLevelIds,
    dashboard.activeLevel?.id,
  );

  return (
    <Screen>
      <MoroccanBackdrop />
      <FurqanHeader streak={dashboard.progress.streak.currentStreak} xp={dashboard.progress.xp} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.success} onRefresh={async () => {
          setRefreshing(true);
          await dashboard.refresh();
          setRefreshing(false);
        }} />}
        showsVerticalScrollIndicator={false}
      >
        <DailyGoalCard
          actionKind={lessonLocaleAvailable ? dashboard.primaryAction.kind : 'explore'}
          complete={dashboard.dailyGoalComplete}
          onPress={openPrimaryAction}
        />

        {dashboard.warning ? <Text style={styles.warning}>{dashboard.warning}</Text> : null}
        {dashboard.error ? <Text style={styles.error}>{dashboard.error}</Text> : null}
        {dashboard.loading ? <Text style={styles.loading}>{t('home.loadingPath')}</Text> : null}

        {!lessonLocaleAvailable ? (
          <View style={styles.localeCard}>
            <Text accessibilityRole="header" style={styles.localeTitle}>{t('lesson.localeUnavailableTitle', { language: t(`locale.${preferences.lessonLocale}`) })}</Text>
            <Text style={styles.localeText}>{t('lesson.localeUnavailableBody')}</Text>
            {localeAlternatives.length === 0 ? <Text style={styles.localeText}>{t('lesson.noPublishedAlternative')}</Text> : localeAlternatives.map(locale => (
              <Button key={locale} title={t('lesson.switchLanguage', { language: t(`locale.${locale}`) })} onPress={() => { void setLessonLocale(locale); }} style={styles.localeButton} />
            ))}
          </View>
        ) : <>
        <View style={styles.pathHeading}>
          <View>
            <Text style={styles.pathEyebrow}>{t('home.learningPath')}</Text>
            <Text style={styles.pathTitle}>{dashboard.path?.title ?? t('home.quranPath')}</Text>
          </View>
          <Text accessibilityLabel={`${roadmapItems.filter(item => item.state === 'completed').length} of ${roadmapItems.length} Surahs complete`} style={styles.pathProgress}>
            {roadmapItems.filter(item => item.state === 'completed').length}/{roadmapItems.length}
          </Text>
        </View>

        <SurahRoadmap items={roadmapItems} onSelectSurah={openSurah} />
        </>}
      </ScrollView>
      <BottomNavigation active="home" reviewCount={dashboard.dueReviewCount} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { alignSelf: 'center', maxWidth: 980, padding: spacing.lg, paddingBottom: spacing.xxl, width: '100%' },
  warning: { backgroundColor: colors.warningSoft, borderRadius: 12, color: colors.warning, fontFamily: fonts.medium, lineHeight: 20, marginTop: spacing.md, padding: spacing.md },
  error: { backgroundColor: colors.dangerSoft, borderRadius: 12, color: colors.danger, fontFamily: fonts.medium, lineHeight: 20, marginTop: spacing.md, padding: spacing.md },
  loading: { color: colors.textMuted, fontFamily: fonts.regular, marginTop: spacing.md, textAlign: 'center' },
  pathHeading: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm, marginTop: spacing.xl, paddingHorizontal: spacing.xs },
  pathEyebrow: { color: colors.success, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.7, textTransform: 'uppercase' },
  pathTitle: { color: colors.primary, fontFamily: fonts.bold, fontSize: 20, marginTop: 1 },
  pathProgress: { color: colors.gold, fontFamily: fonts.bold, fontSize: 14 },
  localeCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, marginTop: spacing.xl, padding: spacing.lg },
  localeTitle: { color: colors.primary, fontFamily: fonts.bold, fontSize: 20, textAlign: 'center' },
  localeText: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, marginTop: spacing.sm, textAlign: 'center' },
  localeButton: { marginTop: spacing.md },
});
