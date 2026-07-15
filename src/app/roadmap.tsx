import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Screen from '../components/ui/Screen';
import ProgressBar from '../components/ui/ProgressBar';
import RoadmapNode, { NodeStatus } from '../components/roadmap/RoadmapNode';
import { getContentRepository } from '../lib/content/repository';
import { getAppProgress, getDueReviewStates, getProgressRecoveryWarning, syncCompletedLevelReviews } from '../lib/progress/storage';
import { resolveDueReviewItems } from '../lib/progress/reviewQueue';
import { getLevelAccessState } from '../lib/progress/lessonAccess';
import { AppProgress, DEFAULT_PROGRESS } from '../types/progress';
import { packageText } from '../lib/content/text';

import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

export default function RoadmapScreen() {
  const router = useRouter();
  const repo = getContentRepository();
  const learningPath = repo.getCurrentLearningPath();
  const levels = learningPath ? repo.getLevelsForLearningPath(learningPath.id) : [];
  const text = (key: Parameters<typeof packageText>[1], values?: Record<string, string | number>) => packageText(repo, key, values);

  const [progress, setProgress] = useState<AppProgress>(DEFAULT_PROGRESS);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [dueReviewCount, setDueReviewCount] = useState(0);

  const loadProgress = async () => {
    try {
      await syncCompletedLevelReviews(levels.flatMap(level => {
        const pkg = repo.getPackageForLevel(level.id);
        return pkg ? [{ level, packageRevisionId: pkg.revisionId }] : [];
      }));
      const [p, reviewStates] = await Promise.all([getAppProgress(), getDueReviewStates()]);
      setProgress(p);
      setDueReviewCount(resolveDueReviewItems(repo, reviewStates).length);
      setWarning(getProgressRecoveryWarning()?.message ?? null);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : text('roadmap.progressUnavailable'));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void loadProgress();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProgress();
    setRefreshing(false);
  };

  if (!learningPath) {
    return (
      <Screen style={styles.center}>
        <Text>{text('app.errorLearningPathNotFound')}</Text>
      </Screen>
    );
  }

  const handlePress = (levelId: string) => {
    router.push(`/lesson/${levelId}`);
  };

  return (
    <Screen backgroundColor="#F5F0E8">
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{learningPath.title}</Text>
          <Text style={styles.headerSub}>{text('roadmap.levels', { count: levels.length })}</Text>
        </View>
        <View style={styles.stats}>
          <View style={styles.statBadge}>
            <Text style={styles.statIcon}>🔥</Text>
            <Text style={styles.statText}>{progress.streak.currentStreak}</Text>
          </View>
          <View style={[styles.statBadge, { backgroundColor: '#D4EFDF' }]}>
            <Text style={styles.statIcon}>⭐</Text>
            <Text style={[styles.statText, { color: '#1E8449' }]}>{progress.xp}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.description}>{learningPath.description}</Text>
        <ProgressBar current={progress.completedLevelIds.filter(id => learningPath.levelIds.includes(id)).length} total={levels.length} label={text('roadmap.pathProgress')} />
        <View style={styles.reviewCard}>
          <View style={styles.reviewCopy}>
            <Text style={styles.reviewTitle}>{text('review.title')}</Text>
            <Text style={styles.reviewDue}>{text('review.due', { count: dueReviewCount })}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: dueReviewCount === 0 }} disabled={dueReviewCount === 0} onPress={() => router.push('/review')} style={[styles.reviewButton, dueReviewCount === 0 && styles.reviewButtonDisabled]}>
            <Text style={styles.reviewButtonText}>{text('review.start')}</Text>
          </Pressable>
        </View>
        {warning ? <Text style={styles.warning}>{warning}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <Text style={styles.loading}>{text('roadmap.loadingProgress')}</Text> : null}

        <View style={styles.roadmap}>
          {levels.map((level, idx) => {
            const status = getLevelAccessState(
              levels,
              progress.completedLevelIds,
              level.id
            ) as NodeStatus;

            return (
              <RoadmapNode
                key={level.id}
                id={level.id}
                title={level.title}
                description={level.description}
                status={status}
                index={idx}
                onPress={handlePress}
                isLast={idx === levels.length - 1}
              />
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1B4F72' },
  headerSub: { fontSize: 13, color: '#666', marginTop: 2 },
  stats: { flexDirection: 'row', gap: 8 },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDEBD0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
  },
  statIcon: { fontSize: 14, marginRight: 4 },
  statText: { fontSize: 14, fontWeight: '700', color: '#D35400' },
  scroll: { padding: 20, paddingBottom: 60 },
  description: { fontSize: 15, color: '#444', lineHeight: 22, marginBottom: 24, fontStyle: 'italic', textAlign: 'center' },
  warning: { backgroundColor: '#FCF3CF', color: '#7D6608', borderRadius: 10, padding: 12, marginTop: 16, lineHeight: 20 },
  error: { backgroundColor: '#FDEDEC', color: '#922B21', borderRadius: 10, padding: 12, marginTop: 16, lineHeight: 20 },
  loading: { color: '#5D6D7E', textAlign: 'center', marginTop: 16 },
  roadmap: { paddingHorizontal: 10 },
  reviewCard: { alignItems: 'center', backgroundColor: '#FFF', borderColor: '#D5DBDB', borderRadius: 14, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, padding: 14 },
  reviewCopy: { flex: 1, marginRight: 12 },
  reviewTitle: { color: '#1B4F72', fontSize: 16, fontWeight: '800' },
  reviewDue: { color: '#566573', fontSize: 13, marginTop: 3 },
  reviewButton: { backgroundColor: '#1B4F72', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  reviewButtonDisabled: { opacity: 0.4 },
  reviewButtonText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
});
