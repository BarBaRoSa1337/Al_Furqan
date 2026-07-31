import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import BottomNavigation from '../components/furqan/BottomNavigation';
import { CourseArtwork, MoroccanBackdrop } from '../components/furqan/FurqanArtwork';
import PracticeActivityRenderer from '../components/lesson/PracticeActivityRenderer';
import Button from '../components/ui/Button';
import ProgressBar from '../components/ui/ProgressBar';
import Screen from '../components/ui/Screen';
import { useFurqanDashboard } from '../hooks/useFurqanDashboard';
import { createActivityEvaluationContext } from '../lib/activities/activityContext';
import { evaluateActivity } from '../lib/activities/activityEngine';
import { getContentRepository } from '../lib/content/repository';
import { packageText } from '../lib/content/text';
import { getDueReviewStates, recordReviewAttempt, syncCompletedLevelReviews } from '../lib/progress/storage';
import { DueReviewItem, resolveDueReviewItems } from '../lib/progress/reviewQueue';
import { colors, fonts, spacing } from '../theme/tokens';
import type { RecallRating, ReviewOutcome } from '../types/activities';
import { useLocalization } from '../lib/localization/LocalizationProvider';

export default function ReviewScreen() {
  const router = useRouter();
  const dashboard = useFurqanDashboard();
  const { preferences } = useLocalization();
  const lessonLocale = preferences.lessonLocale;
  const repo = getContentRepository();
  const text = (key: Parameters<typeof packageText>[1]) => packageText(repo, key, {}, preferences.interfaceLocale);
  const [items, setItems] = useState<DueReviewItem[]>([]);
  const [index, setIndex] = useState(0);
  const [passed, setPassed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    const catalog = repo.levels.flatMap(level => {
      const pkg = repo.getPackageForLevel(level.id);
      return pkg ? [{ level, packageRevisionId: pkg.revisionId, locale: lessonLocale }] : [];
    });
    void syncCompletedLevelReviews(catalog).then(() => getDueReviewStates(new Date(), lessonLocale)).then(states => {
      if (!cancelled) setItems(resolveDueReviewItems(repo, states));
    }).catch(cause => {
      if (!cancelled) {
        setError(cause instanceof Error ? cause.message : packageText(repo, 'roadmap.progressUnavailable'));
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [lessonLocale, repo]);

  if (loading) {
    return <ReviewShell reviewCount={dashboard.dueReviewCount}><View style={styles.center}><ActivityIndicator color={colors.success} /></View></ReviewShell>;
  }
  if (error) {
    return <ReviewState message={error} button={text('review.backToRoadmap')} onPress={() => router.replace('/roadmap')} reviewCount={dashboard.dueReviewCount} />;
  }
  if (items.length === 0) {
    return <ReviewState message={text('review.noneDue')} button={text('review.backToRoadmap')} onPress={() => router.replace('/roadmap')} reviewCount={0} />;
  }
  if (index >= items.length) {
    return <ReviewState message={text('review.complete')} button={text('review.backToRoadmap')} onPress={() => router.replace('/roadmap')} reviewCount={0} complete />;
  }

  const item = items[index];
  const answerActivity = async (answer: unknown) => {
    const evaluation = evaluateActivity(item.activity, answer, createActivityEvaluationContext(repo));
    const outcome = toReviewOutcome(answer, evaluation.correct);
    try {
      await recordReviewAttempt({
        levelId: item.level.id,
        pathId: item.path.id,
        activityId: item.activity.id,
        answer,
        correct: evaluation.correct,
        evaluationVersion: '2',
        packageRevisionId: item.package.revisionId,
        reviewSchedule: item.activity.reviewSchedule!,
        outcome,
        locale: lessonLocale,
        languageIndependent: item.activity.languageIndependent,
      });
      setPassed(evaluation.correct);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : text('roadmap.progressUnavailable'));
    }
  };

  return (
    <Screen>
      <View style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Keep it fresh</Text>
            <Text accessibilityRole="header" style={styles.title}>{text('review.title')}</Text>
          </View>
          <Text style={styles.count}>{index + 1}/{items.length}</Text>
        </View>
        <View style={styles.progress}><ProgressBar current={index + 1} total={items.length} showLabel={false} height={6} color={colors.success} /></View>
        <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">
          <PracticeActivityRenderer activity={item.activity} onAnswer={answerActivity} />
        </ScrollView>
        <View style={styles.footer}>
          <Button
            title={text('review.next')}
            disabled={!passed}
            onPress={() => { setIndex(current => current + 1); setPassed(false); }}
            size="lg"
          />
        </View>
      </View>
      <BottomNavigation active="reviews" reviewCount={Math.max(items.length - index, 0)} />
    </Screen>
  );
}

function ReviewShell({ children, reviewCount }: { children: React.ReactNode; reviewCount: number }) {
  return <Screen><View style={styles.page}>{children}</View><BottomNavigation active="reviews" reviewCount={reviewCount} /></Screen>;
}

function ReviewState({ message, button, onPress, reviewCount, complete = false }: { message: string; button: string; onPress: () => void; reviewCount: number; complete?: boolean }) {
  return (
    <ReviewShell reviewCount={reviewCount}>
      <MoroccanBackdrop />
      <View style={styles.center}>
        <CourseArtwork variant={complete ? 'lantern' : 'quran'} size={92} />
        <Text style={styles.stateText}>{message}</Text>
        <Button title={button} onPress={onPress} style={styles.stateButton} />
      </View>
    </ReviewShell>
  );
}

function toReviewOutcome(answer: unknown, correct: boolean): ReviewOutcome {
  return answer === 'again' || answer === 'hard' || answer === 'remembered'
    ? answer as RecallRating
    : correct ? 'correct' : 'incorrect';
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  eyebrow: { color: colors.success, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },
  title: { color: colors.primary, fontFamily: fonts.bold, fontSize: 24 },
  count: { color: colors.gold, fontFamily: fonts.bold, fontSize: 14 },
  progress: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  content: { alignSelf: 'center', flexGrow: 1, maxWidth: 640, padding: spacing.lg, width: '100%' },
  footer: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, padding: spacing.lg },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: spacing.xl },
  stateText: { color: colors.text, fontFamily: fonts.medium, fontSize: 18, lineHeight: 27, marginTop: spacing.lg, textAlign: 'center' },
  stateButton: { marginTop: spacing.lg },
});
