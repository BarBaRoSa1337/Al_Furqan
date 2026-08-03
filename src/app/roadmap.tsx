import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import BottomNavigation from '../components/furqan/BottomNavigation';
import FurqanHeader from '../components/furqan/FurqanHeader';
import { DailyGoalCard, LocationSelector, SupportCard } from '../components/furqan/HomeCards';
import { MoroccanBackdrop } from '../components/furqan/FurqanArtwork';
import SurahRoadmapCard from '../components/roadmap/SurahRoadmapCard';
import Screen from '../components/ui/Screen';
import { useFurqanDashboard } from '../hooks/useFurqanDashboard';
import { getContentRepository } from '../lib/content/repository';
import { hasPracticeSteps } from '../lib/content/lessonSteps';
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

  const openLocation = (mode: 'surah' | 'juz' | 'hizb', number: number) => {
    router.push({ pathname: '/discover', params: { mode, number: String(number) } });
  };

  const activeOrPracticeLevel = dashboard.activeLevel ?? dashboard.latestCompletedLevel;

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

        <View style={styles.sectionGap}>
          <LocationSelector location={dashboard.location} onSelect={openLocation} />
        </View>

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
          <Text style={styles.pathProgress}>{dashboard.authoredSurahs.filter(item => item.levels.every(level => dashboard.progress.completedLevelIds.includes(level.id))).length}/{dashboard.roadmapSurahs.length}</Text>
        </View>

        <View style={styles.roadmap}>
          {dashboard.roadmapSurahs.map(surah => {
            const item = dashboard.authoredSurahs.find(candidate => candidate.surah.id === surah.id)!;
            const completed = item.levels.filter(level => dashboard.progress.completedLevelIds.includes(level.id)).length;
            const next = item.levels.find(level => !dashboard.progress.completedLevelIds.includes(level.id));
            return (
              <SurahRoadmapCard
                completed={completed}
                key={surah.id}
                nextTitle={next?.title}
                onPress={() => openSurah(surah.id)}
                surah={surah}
                total={item.levels.length}
              />
            );
          })}
        </View>

        <View style={styles.supportGrid}>
          <SupportCard
            badge={dashboard.dueReviewCount > 0 ? t('home.ready', { count: dashboard.dueReviewCount }) : t('home.upToDate')}
            description={dashboard.dueReviewCount > 0 ? t('home.reviewDescription') : t('home.noReviews')}
            onPress={() => router.push('/review')}
            title={t('home.reviewDue')}
            variant="quran"
          />
          <SupportCard
            badge={activeOrPracticeLevel ? `${activeOrPracticeLevel.durationMinutes} min` : undefined}
            description={activeOrPracticeLevel?.description ?? t('home.choosePath')}
            onPress={() => {
              if (dashboard.activeLevel) router.push(`/level/${dashboard.activeLevel.id}`);
              else if (dashboard.latestCompletedLevel && hasPracticeSteps(dashboard.latestCompletedLevel)) router.push(`/level/${dashboard.latestCompletedLevel.id}`);
              else router.push('/discover');
            }}
            title={t('home.memorize')}
            variant="lantern"
          />
          <SupportCard
            description={t('home.storiesDescription')}
            onPress={() => router.push({ pathname: '/discover', params: { q: 'stories' } })}
            title={t('home.stories')}
            variant="stories"
            wide
          />
        </View>
        </>}
      </ScrollView>
      <BottomNavigation active="home" reviewCount={dashboard.dueReviewCount} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { alignSelf: 'center', maxWidth: 600, padding: spacing.lg, paddingBottom: spacing.xxl, width: '100%' },
  sectionGap: { marginTop: spacing.md },
  warning: { backgroundColor: colors.warningSoft, borderRadius: 12, color: colors.warning, fontFamily: fonts.medium, lineHeight: 20, marginTop: spacing.md, padding: spacing.md },
  error: { backgroundColor: colors.dangerSoft, borderRadius: 12, color: colors.danger, fontFamily: fonts.medium, lineHeight: 20, marginTop: spacing.md, padding: spacing.md },
  loading: { color: colors.textMuted, fontFamily: fonts.regular, marginTop: spacing.md, textAlign: 'center' },
  pathHeading: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm, marginTop: spacing.xl, paddingHorizontal: spacing.xs },
  pathEyebrow: { color: colors.success, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.7, textTransform: 'uppercase' },
  pathTitle: { color: colors.primary, fontFamily: fonts.bold, fontSize: 20, marginTop: 1 },
  pathProgress: { color: colors.gold, fontFamily: fonts.bold, fontSize: 14 },
  roadmap: { paddingBottom: spacing.lg },
  supportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  localeCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, marginTop: spacing.xl, padding: spacing.lg },
  localeTitle: { color: colors.primary, fontFamily: fonts.bold, fontSize: 20, textAlign: 'center' },
  localeText: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, marginTop: spacing.sm, textAlign: 'center' },
  localeButton: { marginTop: spacing.md },
});
