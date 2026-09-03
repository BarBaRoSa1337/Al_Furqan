import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import FurqanHeader from '../components/furqan/FurqanHeader';
import { MoroccanBackdrop } from '../components/furqan/FurqanArtwork';
import SurahRoadmap from '../components/roadmap/SurahRoadmap';
import { buildSurahRoadmapItems, resolveSurahRoadmapName } from '../components/roadmap/surahRoadmapModel';
import Screen from '../components/ui/Screen';
import { useFurqanDashboard } from '../hooks/useFurqanDashboard';
import { getContentRepository } from '../lib/content/repository';
import { colors, fonts, radii, spacing } from '../theme/tokens';
import { useLocalization } from '../lib/localization/LocalizationProvider';
import { availableLessonLocales, isLessonLocaleAvailable } from '../lib/content/publication';
import Button from '../components/ui/Button';

export default function RoadmapScreen() {
  const router = useRouter();
  const repo = getContentRepository();
  const dashboard = useFurqanDashboard();
  const { direction, preferences, setLessonLocale, t } = useLocalization();
  const [refreshing, setRefreshing] = useState(false);
  const contentPackage = repo.getActivePackage();
  const lessonLocaleAvailable = Boolean(contentPackage && isLessonLocaleAvailable(contentPackage, preferences.lessonLocale));
  const localeAlternatives = contentPackage ? availableLessonLocales(contentPackage) : [];
  const roadmapItems = buildSurahRoadmapItems(
    dashboard.authoredSurahs,
    dashboard.progress.completedLevelIds,
    dashboard.activeLevel?.id,
    surah => resolveSurahRoadmapName(surah, preferences.interfaceLocale, (key, locale) => repo.getText(key, locale)),
  );

  const openSurah = useCallback((surahId: string) => router.push(`/surah/${surahId}`), [router]);
  const refresh = useCallback(() => {
    setRefreshing(true);
    void dashboard.refresh().finally(() => setRefreshing(false));
  }, [dashboard]);

  const statusHeader = dashboard.warning || dashboard.error || dashboard.loading || !lessonLocaleAvailable ? (
    <View style={styles.statusArea}>
      {dashboard.warning ? <Text style={styles.warning}>{dashboard.warning}</Text> : null}
      {dashboard.error ? <Text style={styles.error}>{dashboard.error}</Text> : null}
      {dashboard.loading ? <Text style={styles.loading}>{t('home.loadingPath')}</Text> : null}
      {!lessonLocaleAvailable ? (
        <View style={styles.localeCard}>
          <Text accessibilityRole="header" style={styles.localeTitle}>{t('lesson.localeUnavailableTitle', { language: t(`locale.${preferences.lessonLocale}`) })}</Text>
          {localeAlternatives.length === 0 ? <Text style={styles.localeText}>{t('lesson.noPublishedAlternative')}</Text> : localeAlternatives.map(locale => (
            <Button key={locale} title={t('lesson.switchLanguage', { language: t(`locale.${locale}`) })} onPress={() => { void setLessonLocale(locale); }} style={styles.localeButton} />
          ))}
        </View>
      ) : null}
    </View>
  ) : null;

  return (
    <Screen>
      <MoroccanBackdrop />
      <FurqanHeader
        onProfile={() => router.push('/profile')}
        onSearch={() => router.push('/discover')}
        onSettings={() => router.push('/profile?section=settings')}
        streak={dashboard.progress.streak.currentStreak}
        xp={dashboard.progress.xp}
      />
      <SurahRoadmap direction={direction} header={statusHeader} items={lessonLocaleAvailable ? roadmapItems : []} onRefresh={refresh} onSelectSurah={openSurah} refreshing={refreshing} showLocalizedName={preferences.interfaceLocale !== 'ar'} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusArea: { gap: spacing.sm, paddingBottom: spacing.md },
  warning: { backgroundColor: colors.warningSoft, borderRadius: radii.md, color: colors.warning, fontFamily: fonts.medium, lineHeight: 20, padding: spacing.md },
  error: { backgroundColor: colors.dangerSoft, borderRadius: radii.md, color: colors.danger, fontFamily: fonts.medium, lineHeight: 20, padding: spacing.md },
  loading: { color: colors.textMuted, fontFamily: fonts.regular, textAlign: 'center' },
  localeCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, padding: spacing.lg },
  localeTitle: { color: colors.primary, fontFamily: fonts.bold, fontSize: 19, textAlign: 'center' },
  localeText: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, marginTop: spacing.sm, textAlign: 'center' },
  localeButton: { marginTop: spacing.md },
});
