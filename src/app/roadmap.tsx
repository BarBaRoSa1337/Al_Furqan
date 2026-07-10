import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import Screen from '../components/ui/Screen';
import RoadmapNode, { NodeStatus } from '../components/roadmap/RoadmapNode';
import { getContentRepository } from '../lib/content/repository';
import { getAppProgress } from '../lib/progress/storage';
import { getLevelAccessState } from '../lib/progress/lessonAccess';
import { AppProgress, DEFAULT_PROGRESS } from '../types/progress';

import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

export default function RoadmapScreen() {
  const router = useRouter();
  const repo = getContentRepository();
  const learningPath = repo.getCurrentLearningPath();
  const levels = learningPath ? repo.getLevelsForLearningPath(learningPath.id) : [];

  const [progress, setProgress] = useState<AppProgress>(DEFAULT_PROGRESS);
  const [refreshing, setRefreshing] = useState(false);

  const loadProgress = async () => {
    const p = await getAppProgress();
    setProgress(p);
  };

  useFocusEffect(
    useCallback(() => {
      loadProgress();
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
        <Text>Error: Learning path not found</Text>
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
          <Text style={styles.headerSub}>{levels.length} Levels</Text>
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
  roadmap: { paddingHorizontal: 10 },
});
