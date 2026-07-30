import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import BottomNavigation from '../components/furqan/BottomNavigation';
import { CourseArtwork, MoroccanBackdrop } from '../components/furqan/FurqanArtwork';
import Screen from '../components/ui/Screen';
import { useFurqanDashboard } from '../hooks/useFurqanDashboard';
import { colors, fonts, radii, shadows, spacing } from '../theme/tokens';

export default function ProfileScreen() {
  const dashboard = useFurqanDashboard();
  const completedCount = dashboard.progress.completedLevelIds.length;
  return (
    <Screen>
      <MoroccanBackdrop />
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <View style={styles.intro}>
          <CourseArtwork variant="profile" size={82} />
          <View style={styles.introCopy}>
            <Text accessibilityRole="header" style={styles.title}>Your progress</Text>
            <Text style={styles.subtitle}>A quiet record of your Quran habit.</Text>
          </View>
        </View>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Current path</Text>
          <Text style={styles.heroTitle}>{dashboard.path?.title ?? 'Choose a Quran path'}</Text>
          <Text style={styles.heroText}>{dashboard.activeLevel?.title ?? dashboard.latestCompletedLevel?.title ?? 'Open Explore to begin.'}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${dashboard.levels.length > 0 ? Math.round((completedCount / dashboard.levels.length) * 100) : 0}%` }]} />
          </View>
        </View>
        <View style={styles.stats}>
          <Stat value={dashboard.progress.streak.currentStreak} label="Day streak" accent />
          <Stat value={dashboard.progress.xp} label="Points" />
          <Stat value={completedCount} label="Circles completed" />
          <Stat value={dashboard.reviewItemCount} label="Review items" />
        </View>
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>Habit summary</Text>
          <Detail label="Longest streak" value={`${dashboard.progress.streak.longestStreak} days`} />
          <Detail label="Ready to review" value={String(dashboard.dueReviewCount)} />
          <Detail label="Daily goal" value={dashboard.dailyGoalComplete ? 'Complete' : 'Not yet complete'} />
        </View>
      </ScrollView>
      <BottomNavigation active="profile" reviewCount={dashboard.dueReviewCount} />
    </Screen>
  );
}

function Stat({ value, label, accent = false }: { value: number; label: string; accent?: boolean }) {
  return <View style={[styles.stat, accent && styles.statAccent]}><Text style={[styles.statValue, accent && styles.statValueAccent]}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  content: { alignSelf: 'center', maxWidth: 600, padding: spacing.lg, paddingBottom: spacing.xxl, width: '100%' },
  intro: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  introCopy: { flex: 1 },
  title: { color: colors.primary, fontFamily: fonts.bold, fontSize: 27 },
  subtitle: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  heroCard: { backgroundColor: colors.primary, borderRadius: radii.xl, boxShadow: shadows.raised, padding: spacing.lg },
  heroEyebrow: { color: colors.goldSoft, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.7, textTransform: 'uppercase' },
  heroTitle: { color: colors.surface, fontFamily: fonts.bold, fontSize: 21, marginTop: 3 },
  heroText: { color: '#D8E3DF', fontFamily: fonts.regular, fontSize: 13, marginTop: 2 },
  progressTrack: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: radii.pill, height: 7, marginTop: spacing.md, overflow: 'hidden' },
  progressFill: { backgroundColor: colors.gold, borderRadius: radii.pill, height: 7 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  stat: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, boxShadow: shadows.card, flexBasis: '47%', flexGrow: 1, padding: spacing.lg },
  statAccent: { backgroundColor: colors.successSoft, borderColor: '#B8DACA' },
  statValue: { color: colors.primary, fontFamily: fonts.bold, fontSize: 27 },
  statValueAccent: { color: colors.success },
  statLabel: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 11, marginTop: 2 },
  detailCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, marginTop: spacing.md, padding: spacing.lg },
  detailTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 17, marginBottom: spacing.sm },
  detailRow: { borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md },
  detailLabel: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13 },
  detailValue: { color: colors.primary, fontFamily: fonts.bold, fontSize: 13 },
});
