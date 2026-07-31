import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Screen from '../../components/ui/Screen';
import { CourseArtwork, MoroccanBackdrop } from '../../components/furqan/FurqanArtwork';
import { getContentRepository } from '../../lib/content/repository';
import { hasPracticeSteps } from '../../lib/content/lessonSteps';
import { isLessonLocaleAvailable } from '../../lib/content/publication';
import { getAppProgress, getLevelProgress } from '../../lib/progress/storage';
import { isLevelAccessible } from '../../lib/progress/lessonAccess';
import { type LevelEntryState, resolveLevelEntryState } from '../../lib/progress/levelEntry';
import { useLocalization } from '../../lib/localization/LocalizationProvider';
import { colors, fonts, radii, spacing } from '../../theme/tokens';

type LoadState = 'loading' | 'ready' | 'not_found' | 'locked' | 'locale_unavailable' | 'error';

export default function LevelEntryScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const levelId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const repo = getContentRepository();
  const { direction, preferences, t } = useLocalization();
  const level = levelId ? repo.getLevelById(levelId) : undefined;
  const path = level ? repo.getLearningPathById(level.pathId) : undefined;
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [entryState, setEntryState] = useState<LevelEntryState>('new');
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadState('loading');
      setError(undefined);
      if (!level || !path) {
        if (!cancelled) setLoadState('not_found');
        return;
      }
      const contentPackage = repo.getPackageForLevel(level.id);
      if (!contentPackage || !isLessonLocaleAvailable(contentPackage, preferences.lessonLocale)) {
        if (!cancelled) setLoadState('locale_unavailable');
        return;
      }
      try {
        const [appProgress, levelProgress] = await Promise.all([getAppProgress(), getLevelProgress(level.id)]);
        const levels = repo.getLevelsForLearningPath(path.id);
        if (!isLevelAccessible(levels, appProgress.completedLevelIds, level.id)) {
          if (!cancelled) setLoadState('locked');
          return;
        }
        if (!cancelled) {
          setEntryState(resolveLevelEntryState(levelProgress));
          setLoadState('ready');
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : t('levelEntry.loadError'));
          setLoadState('error');
        }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [level, levelId, path, preferences.lessonLocale, repo, t]);

  if (loadState !== 'ready' || !level) {
    const message = loadState === 'loading'
      ? t('app.loading')
      : loadState === 'locked'
        ? t('levelEntry.locked')
        : loadState === 'locale_unavailable'
          ? t('lesson.localeUnavailableTitle', { language: t(`locale.${preferences.lessonLocale}`) })
          : loadState === 'error'
            ? error ?? t('levelEntry.loadError')
            : t('lesson.levelNotFound');
    return (
      <Screen style={styles.state} edges={['top', 'bottom', 'left', 'right']}>
        {loadState === 'loading' ? <ActivityIndicator color={colors.success} /> : null}
        <Text accessibilityRole="header" style={styles.stateTitle}>{message}</Text>
        {loadState !== 'loading' ? <Button title={t('lesson.backToRoadmap')} onPress={() => router.replace('/roadmap')} style={styles.stateButton} /> : null}
      </Screen>
    );
  }

  const firstRef = level.ayahRefs[0];
  const lastRef = level.ayahRefs.at(-1) ?? firstRef;
  const reference = firstRef && lastRef
    ? firstRef.ayahNumber === lastRef.ayahNumber
      ? t('home.ayah', { ayah: firstRef.ayahNumber })
      : t('levelEntry.ayat', { start: firstRef.ayahNumber, end: lastRef.ayahNumber })
    : t('levelEntry.passage');
  const stateLabel = t(`levelEntry.state.${entryState}`);
  const openLesson = (mode: 'resume' | 'start_over') => router.replace(`/lesson/${level.id}?mode=${mode}`);

  return (
    <Screen style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <MoroccanBackdrop />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('levelEntry.back')} hitSlop={8} onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name={direction === 'rtl' ? 'arrow-forward' : 'arrow-back'} size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('levelEntry.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <CourseArtwork variant="quran" size={104} />
        <Text style={styles.eyebrow}>{stateLabel}</Text>
        <Text accessibilityRole="header" style={styles.title}>{level.title}</Text>
        <Text style={styles.description}>{level.description}</Text>

        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Ionicons name="book-outline" size={20} color={colors.success} />
              <Text style={styles.summaryValue}>{reference}</Text>
              <Text style={styles.summaryLabel}>{t('levelEntry.quran')}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryItem}>
              <Ionicons name="time-outline" size={20} color={colors.gold} />
              <Text style={styles.summaryValue}>{t('levelEntry.minutes', { count: level.durationMinutes })}</Text>
              <Text style={styles.summaryLabel}>{t('levelEntry.session')}</Text>
            </View>
          </View>
        </Card>

        <View style={styles.actions}>
          {entryState === 'new' ? (
            <Button title={t('levelEntry.start')} onPress={() => openLesson('start_over')} size="lg" variant="success" />
          ) : null}
          {entryState === 'in_progress' ? <>
            <Button title={t('levelEntry.continue')} onPress={() => openLesson('resume')} size="lg" variant="success" />
            <Button title={t('levelEntry.startOver')} onPress={() => openLesson('start_over')} size="md" variant="secondary" />
            <Text style={styles.note}>{t('levelEntry.startOverNote')}</Text>
          </> : null}
          {entryState === 'completed' ? <>
            <Button title={t('levelEntry.learnAgain')} onPress={() => openLesson('start_over')} size="lg" variant="success" />
            {hasPracticeSteps(level) ? <Button title={t('levelEntry.extraPractice')} onPress={() => router.replace(`/practice/${level.id}`)} size="md" variant="secondary" /> : null}
            <Text style={styles.note}>{t('levelEntry.replayNote')}</Text>
          </> : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { overflow: 'hidden' },
  header: { alignItems: 'center', flexDirection: 'row', paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  backButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  headerTitle: { color: colors.primary, flex: 1, fontFamily: fonts.bold, fontSize: 16, textAlign: 'center' },
  headerSpacer: { width: 44 },
  content: { alignItems: 'center', alignSelf: 'center', flex: 1, justifyContent: 'center', maxWidth: 560, padding: spacing.xl, width: '100%' },
  eyebrow: { color: colors.success, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.8, marginTop: spacing.md, textTransform: 'uppercase' },
  title: { color: colors.primary, fontFamily: fonts.bold, fontSize: 30, lineHeight: 37, marginTop: spacing.xs, textAlign: 'center' },
  description: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, marginTop: spacing.sm, maxWidth: 420, textAlign: 'center' },
  summaryCard: { borderColor: colors.border, borderWidth: 1, marginTop: spacing.xl, paddingVertical: spacing.lg, width: '100%' },
  summaryRow: { alignItems: 'stretch', flexDirection: 'row' },
  summaryItem: { alignItems: 'center', flex: 1, paddingHorizontal: spacing.sm },
  summaryValue: { color: colors.text, fontFamily: fonts.bold, fontSize: 15, marginTop: spacing.xs, textAlign: 'center' },
  summaryLabel: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 11, marginTop: 1, textAlign: 'center' },
  divider: { backgroundColor: colors.border, width: 1 },
  actions: { gap: spacing.sm, marginTop: spacing.md, width: '100%' },
  note: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, paddingHorizontal: spacing.md, textAlign: 'center' },
  state: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  stateTitle: { color: colors.primary, fontFamily: fonts.bold, fontSize: 20, marginTop: spacing.md, textAlign: 'center' },
  stateButton: { marginTop: spacing.lg },
});
