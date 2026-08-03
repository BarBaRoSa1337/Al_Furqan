import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ConfettiCannon from 'react-native-confetti-cannon';
import { CourseArtwork, MoroccanBackdrop } from '../../components/furqan/FurqanArtwork';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Screen from '../../components/ui/Screen';
import { getContentRepository } from '../../lib/content/repository';
import { getLastCompletionReceipt, getLevelProgress } from '../../lib/progress/storage';
import { CompletionReceipt } from '../../types/progress';
import { packageText } from '../../lib/content/text';
import { hasPracticeSteps } from '../../lib/content/lessonSteps';
import { colors, fonts, radii, spacing } from '../../theme/tokens';

export default function CompleteScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const levelId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const repo = getContentRepository();
  const level = levelId ? repo.getLevelById(levelId) : undefined;
  const nextLevel = level ? repo.getNextLevel(level.id) : undefined;
  const surahHref = level ? `/surah/${level.surahId}` as const : '/roadmap' as const;
  const text = (key: Parameters<typeof packageText>[1], values?: Record<string, string | number>) => packageText(repo, key, values);
  const [receipt, setReceipt] = useState<CompletionReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadCompletion() {
      if (!level) {
        setLoading(false);
        return;
      }
      try {
        const [progress, storedReceipt] = await Promise.all([
          getLevelProgress(level.id),
          getLastCompletionReceipt(level.id),
        ]);
        if (!progress?.completed) {
          router.replace('/roadmap');
          return;
        }
        if (!cancelled) {
          setReceipt(storedReceipt);
          setLoading(false);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Completion could not be loaded.');
          setLoading(false);
        }
      }
    }
    void loadCompletion();
    return () => { cancelled = true; };
  }, [level, router]);

  if (!level) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.errorTitle}>{text('completion.levelNotFound')}</Text>
        <Button title={text('completion.backToRoadmap')} onPress={() => router.replace('/roadmap')} style={styles.stateButton} />
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen backgroundColor={colors.primary} statusBarStyle="light-content" style={styles.center}>
        <ActivityIndicator color={colors.surface} />
        <Text style={styles.loadingText}>{text('completion.loading')}</Text>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.errorTitle}>{text('completion.progressUnavailable')}</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Back to Roadmap" onPress={() => router.replace('/roadmap')} style={styles.stateButton} />
      </Screen>
    );
  }

  const awardedLevelXp = receipt?.awardedLevelXp ?? 0;
  const awardedPathXp = receipt?.awardedLearningPathXp ?? 0;

  return (
    <Screen backgroundColor={colors.primary} statusBarStyle="light-content" edges={['top', 'bottom', 'left', 'right']}>
      <MoroccanBackdrop inverted />
      {receipt && !receipt.alreadyCompleted && !reduceMotion ? (
        <ConfettiCannon
          count={80}
          colors={[colors.gold, colors.success, colors.goldSoft, colors.surface]}
          origin={{ x: -10, y: 0 }}
          fadeOut
        />
      ) : null}
      <View style={styles.content}>
        <CourseArtwork variant="quran" size={112} />
        <Text style={styles.title}>{text('completion.alhamdulillah')}</Text>
        <Text style={styles.subtitle}>{text('completion.completed', { title: level.title })}</Text>
        <Card style={styles.statsCard}>
          <Text style={styles.rewardTitle}>{text('completion.rewardsEarned')}</Text>
          <View style={styles.rewardRow}>
            <View style={styles.rewardIcon}><Text style={styles.rewardIconText}>XP</Text></View>
            <View style={styles.rewardInfo}>
              <Text style={styles.rewardText}>{receipt?.alreadyCompleted ? text('completion.alreadyCounted') : text('completion.levelCompleted')}</Text>
              <Text style={styles.rewardXp}>+{awardedLevelXp} XP{awardedPathXp > 0 ? text('completion.pathXp', { xp: awardedPathXp }) : ''}</Text>
            </View>
          </View>
          {!receipt ? <Text style={styles.repeatNote}>{text('completion.saved')}</Text> : null}
        </Card>
      </View>
      <View style={styles.footer}>
        {nextLevel ? (
          <Button title={text('completion.startNextLevel')} onPress={() => router.replace(`/level/${nextLevel.id}`)} size="lg" variant="success" />
        ) : null}
        {hasPracticeSteps(level) ? (
          <Button title={text('completion.extraPractice')} onPress={() => router.replace(`/practice/${level.id}`)} size="md" variant="secondary" />
        ) : null}
        <Button title={text('completion.backToRoadmap')} onPress={() => router.replace(surahHref)} size="md" variant="ghost" textStyle={styles.roadmapButtonText} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  loadingText: { color: colors.goldSoft, fontFamily: fonts.regular, fontSize: 14, marginTop: spacing.md },
  errorTitle: { color: colors.danger, fontFamily: fonts.bold, fontSize: 20, textAlign: 'center' },
  errorText: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, marginTop: spacing.sm, textAlign: 'center' },
  stateButton: { marginTop: spacing.lg },
  content: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: spacing.xl },
  title: { color: colors.surface, fontFamily: fonts.bold, fontSize: 34, marginBottom: spacing.sm, marginTop: spacing.lg, textAlign: 'center' },
  subtitle: { color: colors.goldSoft, fontFamily: fonts.regular, fontSize: 18, marginBottom: spacing.xxl, textAlign: 'center' },
  statsCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.xl, width: '100%' },
  rewardTitle: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 13, letterSpacing: 1, marginBottom: spacing.lg, textTransform: 'uppercase' },
  rewardRow: { alignItems: 'center', flexDirection: 'row' },
  rewardIcon: { alignItems: 'center', backgroundColor: colors.goldSoft, borderRadius: radii.pill, height: 48, justifyContent: 'center', marginRight: spacing.lg, width: 48 },
  rewardIconText: { color: colors.warning, fontFamily: fonts.bold, fontSize: 13 },
  rewardInfo: { flex: 1 },
  rewardText: { color: colors.text, fontFamily: fonts.bold, fontSize: 16 },
  rewardXp: { color: colors.success, fontFamily: fonts.bold, fontSize: 15, marginTop: spacing.xs },
  repeatNote: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, marginTop: spacing.lg },
  footer: { gap: 10, padding: spacing.xl },
  roadmapButtonText: { color: colors.surface },
});
