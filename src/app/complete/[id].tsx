import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ConfettiCannon from 'react-native-confetti-cannon';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Screen from '../../components/ui/Screen';
import { getContentRepository } from '../../lib/content/repository';
import { getLastCompletionReceipt, getLevelProgress } from '../../lib/progress/storage';
import { CompletionReceipt } from '../../types/progress';
import { packageText } from '../../lib/content/text';

export default function CompleteScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const levelId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const repo = getContentRepository();
  const level = levelId ? repo.getLevelById(levelId) : undefined;
  const nextLevel = level ? repo.getNextLevel(level.id) : undefined;
  const text = (key: Parameters<typeof packageText>[1], values?: Record<string, string | number>) => packageText(repo, key, values);
  const [receipt, setReceipt] = useState<CompletionReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, [levelId, router]);

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
      <Screen backgroundColor="#1B4F72" statusBarStyle="light-content" style={styles.center}>
        <ActivityIndicator color="#FFFFFF" />
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
    <Screen backgroundColor="#1B4F72" statusBarStyle="light-content" edges={['top', 'bottom', 'left', 'right']}>
      {receipt && !receipt.alreadyCompleted ? <ConfettiCannon count={100} origin={{ x: -10, y: 0 }} fadeOut /> : null}
      <View style={styles.content}>
        <Text style={styles.title}>{text('completion.alhamdulillah')}</Text>
        <Text style={styles.subtitle}>{text('completion.completed', { title: level.title })}</Text>
        <Card style={styles.statsCard}>
          <Text style={styles.rewardTitle}>{text('completion.rewardsEarned')}</Text>
          <View style={styles.rewardRow}>
            <Text style={styles.rewardIcon}>★</Text>
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
          <Button title={text('completion.startNextLevel')} onPress={() => router.replace(`/lesson/${nextLevel.id}`)} size="lg" variant="secondary" />
        ) : null}
        <Button title={text('completion.backToRoadmap')} onPress={() => router.replace('/roadmap')} size="md" variant="ghost" textStyle={styles.roadmapButtonText} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#D6EAF8', fontSize: 14 },
  errorTitle: { color: '#7B241C', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  errorText: { color: '#5D6D7E', fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  stateButton: { marginTop: 20 },
  content: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 36, fontWeight: '800', color: '#FFFFFF', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 18, color: '#D6EAF8', textAlign: 'center', marginBottom: 40 },
  statsCard: { width: '100%', backgroundColor: '#FFFFFF', padding: 24, borderRadius: 20 },
  rewardTitle: { fontSize: 14, fontWeight: '700', color: '#68737D', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  rewardRow: { flexDirection: 'row', alignItems: 'center' },
  rewardIcon: { fontSize: 32, marginRight: 16, color: '#D4AC0D' },
  rewardInfo: { flex: 1 },
  rewardText: { fontSize: 16, fontWeight: '700', color: '#273746' },
  rewardXp: { fontSize: 15, color: '#1E8449', fontWeight: '700', marginTop: 4 },
  repeatNote: { marginTop: 16, fontSize: 13, color: '#5D6D7E', lineHeight: 20 },
  footer: { padding: 24, gap: 10 },
  roadmapButtonText: { color: '#FFFFFF' },
});
