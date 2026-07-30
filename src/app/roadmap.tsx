import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import BottomNavigation from '../components/furqan/BottomNavigation';
import FurqanHeader from '../components/furqan/FurqanHeader';
import { DailyGoalCard, LocationSelector, SupportCard } from '../components/furqan/HomeCards';
import { MoroccanBackdrop } from '../components/furqan/FurqanArtwork';
import RoadmapNode, { type NodeStatus } from '../components/roadmap/RoadmapNode';
import Screen from '../components/ui/Screen';
import { useFurqanDashboard } from '../hooks/useFurqanDashboard';
import { getContentRepository } from '../lib/content/repository';
import { hasPracticeSteps } from '../lib/content/lessonSteps';
import { getLevelAccessState } from '../lib/progress/lessonAccess';
import { colors, fonts, spacing } from '../theme/tokens';

export default function RoadmapScreen() {
  const router = useRouter();
  const repo = getContentRepository();
  const dashboard = useFurqanDashboard();
  const [refreshing, setRefreshing] = useState(false);

  const openPrimaryAction = () => {
    router.push(dashboard.primaryAction.href);
  };

  const openLevel = (levelId: string, status: NodeStatus) => {
    const level = repo.getLevelById(levelId);
    if (status === 'completed' && level && hasPracticeSteps(level)) {
      router.push(`/practice/${levelId}`);
      return;
    }
    router.push(`/lesson/${levelId}`);
  };

  const openLocation = (query: string) => {
    router.push({ pathname: '/discover', params: { q: query } });
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
          actionKind={dashboard.primaryAction.kind}
          complete={dashboard.dailyGoalComplete}
          onPress={openPrimaryAction}
        />

        <View style={styles.sectionGap}>
          <LocationSelector location={dashboard.location} onSelect={openLocation} />
        </View>

        {dashboard.warning ? <Text style={styles.warning}>{dashboard.warning}</Text> : null}
        {dashboard.error ? <Text style={styles.error}>{dashboard.error}</Text> : null}
        {dashboard.loading ? <Text style={styles.loading}>Loading your path…</Text> : null}

        <View style={styles.pathHeading}>
          <View>
            <Text style={styles.pathEyebrow}>Your learning path</Text>
            <Text style={styles.pathTitle}>{dashboard.path?.title ?? 'Quran path'}</Text>
          </View>
          <Text style={styles.pathProgress}>{dashboard.progress.completedLevelIds.filter(id => dashboard.levels.some(level => level.id === id)).length}/{dashboard.levels.length}</Text>
        </View>

        <View style={styles.roadmap}>
          {dashboard.levels.map((level, index) => {
            const status = getLevelAccessState(dashboard.levels, dashboard.progress.completedLevelIds, level.id) as NodeStatus;
            const firstRef = level.ayahRefs[0];
            const lastRef = level.ayahRefs.at(-1) ?? firstRef;
            const ayahLabel = firstRef && lastRef
              ? firstRef.ayahNumber === lastRef.ayahNumber
                ? `Ayah ${firstRef.ayahNumber}`
                : `Ayat ${firstRef.ayahNumber}-${lastRef.ayahNumber}`
              : 'Quran passage';
            return (
              <RoadmapNode
                ayahLabel={ayahLabel}
                completedActionLabel={hasPracticeSteps(level) ? 'Practice' : 'Completed'}
                description={level.description}
                durationMinutes={level.durationMinutes}
                id={level.id}
                index={index}
                isLast={index === dashboard.levels.length - 1}
                key={level.id}
                onPress={levelId => openLevel(levelId, status)}
                status={status}
                title={level.title}
              />
            );
          })}
        </View>

        <View style={styles.supportGrid}>
          <SupportCard
            badge={dashboard.dueReviewCount > 0 ? `${dashboard.dueReviewCount} ready` : 'Up to date'}
            description={dashboard.dueReviewCount > 0 ? 'Strengthen what you learned while it is fresh.' : 'No activities are due right now.'}
            onPress={() => router.push('/review')}
            title="Review due"
            variant="quran"
          />
          <SupportCard
            badge={activeOrPracticeLevel ? `${activeOrPracticeLevel.durationMinutes} min` : undefined}
            description={activeOrPracticeLevel?.description ?? 'Choose a Quran path to begin memorizing.'}
            onPress={() => {
              if (dashboard.activeLevel) router.push(`/lesson/${dashboard.activeLevel.id}`);
              else if (dashboard.latestCompletedLevel && hasPracticeSteps(dashboard.latestCompletedLevel)) router.push(`/practice/${dashboard.latestCompletedLevel.id}`);
              else router.push('/discover');
            }}
            title="Memorize"
            variant="lantern"
          />
          <SupportCard
            description="Explore source-backed Quran paths, themes, and canonical references."
            onPress={() => router.push({ pathname: '/discover', params: { q: 'stories' } })}
            title="Stories & wisdom"
            variant="stories"
            wide
          />
        </View>
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
});
