import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import PracticeActivityRenderer from '../components/lesson/PracticeActivityRenderer';
import Button from '../components/ui/Button';
import ProgressBar from '../components/ui/ProgressBar';
import { createActivityEvaluationContext } from '../lib/activities/activityContext';
import { evaluateActivity } from '../lib/activities/activityEngine';
import { getContentRepository } from '../lib/content/repository';
import { packageText } from '../lib/content/text';
import { getDueReviewStates, recordReviewAttempt, syncCompletedLevelReviews } from '../lib/progress/storage';
import { DueReviewItem, resolveDueReviewItems } from '../lib/progress/reviewQueue';
import type { RecallRating, ReviewOutcome } from '../types/activities';

export default function ReviewScreen() {
  const router = useRouter();
  const repo = getContentRepository();
  const text = (key: Parameters<typeof packageText>[1]) => packageText(repo, key);
  const [items, setItems] = useState<DueReviewItem[]>([]);
  const [index, setIndex] = useState(0);
  const [passed, setPassed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    const catalog = repo.levels.flatMap(level => {
      const pkg = repo.getPackageForLevel(level.id);
      return pkg ? [{ level, packageRevisionId: pkg.revisionId }] : [];
    });
    void syncCompletedLevelReviews(catalog).then(() => getDueReviewStates()).then(states => {
      if (!cancelled) setItems(resolveDueReviewItems(repo, states));
    }).catch(cause => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : text('roadmap.progressUnavailable'));
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator color="#1B4F72" /></View></SafeAreaView>;
  if (error) return <ReviewState message={error} button={text('review.backToRoadmap')} onPress={() => router.replace('/roadmap')} />;
  if (items.length === 0) return <ReviewState message={text('review.noneDue')} button={text('review.backToRoadmap')} onPress={() => router.replace('/roadmap')} />;
  if (index >= items.length) return <ReviewState message={text('review.complete')} button={text('review.backToRoadmap')} onPress={() => router.replace('/roadmap')} />;

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
      });
      setPassed(evaluation.correct);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : text('roadmap.progressUnavailable'));
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{text('review.title')}</Text>
        <ProgressBar current={index + 1} total={items.length} showLabel={false} height={6} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
    </SafeAreaView>
  );
}

function ReviewState({ message, button, onPress }: { message: string; button: string; onPress: () => void }) {
  return <SafeAreaView style={styles.safe}><View style={styles.center}><Text style={styles.stateText}>{message}</Text><Button title={button} onPress={onPress} style={styles.stateButton} /></View></SafeAreaView>;
}

function toReviewOutcome(answer: unknown, correct: boolean): ReviewOutcome {
  return answer === 'again' || answer === 'hard' || answer === 'remembered'
    ? answer as RecallRating
    : correct ? 'correct' : 'incorrect';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F0E8' },
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, gap: 14 },
  title: { color: '#1B4F72', fontSize: 22, fontWeight: '800' },
  content: { flexGrow: 1, padding: 20 },
  footer: { backgroundColor: '#FFF', borderTopColor: '#E8E8E8', borderTopWidth: 1, padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateText: { color: '#2C3E50', fontSize: 18, lineHeight: 27, textAlign: 'center' },
  stateButton: { marginTop: 20 },
});
