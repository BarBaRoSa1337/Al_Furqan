import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getContentRepository } from '../../lib/content/repository';
import { getAppProgress, markLevelCompleted } from '../../lib/progress/storage';
import { isLevelAccessible } from '../../lib/progress/lessonAccess';
import Screen from '../../components/ui/Screen';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ConfettiCannon from 'react-native-confetti-cannon';

export default function CompleteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const repo = getContentRepository();
  const level = repo.getLevelById(id as string);
  const path = level ? repo.getCurrentLearningPath() : undefined;

  const [saving, setSaving] = useState(true);
  const [awardedLessonXp, setAwardedLessonXp] = useState(0);
  const [awardedPackageXp, setAwardedPackageXp] = useState(0);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [accessResolved, setAccessResolved] = useState(false);

  useEffect(() => {
    async function saveProgress() {
      if (!level || !path) {
        setAccessResolved(true);
        setSaving(false);
        return;
      }

      const progress = await getAppProgress();
      const levels = repo.getLevelsForLearningPath(path.id);
      const accessible = isLevelAccessible(levels, progress.completedLevelIds, level.id);

      if (!accessible) {
        router.replace('/roadmap');
        return;
      }

      const result = await markLevelCompleted(
        level.id,
        path.id,
        levels.length
      );
      setAwardedLessonXp(result.awardedLevelXp);
      setAwardedPackageXp(result.awardedLearningPathXp);
      setAlreadyCompleted(result.alreadyCompleted);
      setAccessResolved(true);
      setSaving(false);
    }
    saveProgress();
  }, [level, path, repo, router]);

  if (!level) {
    return (
      <Screen style={styles.center}>
        <Text>Level not found.</Text>
        <Button title="Back to Roadmap" onPress={() => router.replace('/roadmap')} style={{ marginTop: 20 }} />
      </Screen>
    );
  }

  if (!accessResolved || saving) {
    return (
      <Screen backgroundColor="#1B4F72" style={styles.center}>
        <ActivityIndicator color="#FFFFFF" />
        <Text style={styles.loadingText}>Saving progress...</Text>
      </Screen>
    );
  }

  const handleContinue = () => {
    router.replace('/roadmap');
  };

  return (
    <Screen backgroundColor="#1B4F72">
      {!saving && <ConfettiCannon count={100} origin={{ x: -10, y: 0 }} fadeOut={true} />}

      <View style={styles.content}>
        <Text style={styles.title}>Alhamdulillah! 🎉</Text>
        <Text style={styles.subtitle}>You completed {level.title}</Text>

        <Card style={styles.statsCard}>
          <Text style={styles.rewardTitle}>Rewards Earned</Text>
          <View style={styles.rewardRow}>
            <Text style={styles.rewardIcon}>⭐</Text>
            <View style={styles.rewardInfo}>
              <Text style={styles.rewardText}>
                {alreadyCompleted ? 'Already counted earlier' : 'Level Completed'}
              </Text>
              <Text style={styles.rewardXp}>
                +{awardedLessonXp} XP
                {awardedPackageXp > 0 ? `  •  +${awardedPackageXp} package XP` : ''}
              </Text>
            </View>
          </View>
          {alreadyCompleted ? (
            <Text style={styles.repeatNote}>
              This level was already completed. Progress reopened without duplicate XP.
            </Text>
          ) : null}
        </Card>
      </View>

      <View style={styles.footer}>
        <Button
          title="Continue"
          onPress={handleContinue}
          size="lg"
          variant="secondary"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#D6EAF8', fontSize: 14 },
  content: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 36, fontWeight: '800', color: '#FFF', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 18, color: '#D6EAF8', textAlign: 'center', marginBottom: 40 },
  statsCard: { width: '100%', backgroundColor: '#FFF', padding: 24, borderRadius: 20 },
  rewardTitle: { fontSize: 14, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  rewardRow: { flexDirection: 'row', alignItems: 'center' },
  rewardIcon: { fontSize: 32, marginRight: 16 },
  rewardInfo: { flex: 1 },
  rewardText: { fontSize: 16, fontWeight: '700', color: '#333' },
  rewardXp: { fontSize: 15, color: '#1E8449', fontWeight: '700', marginTop: 4 },
  repeatNote: { marginTop: 16, fontSize: 13, color: '#5D6D7E', lineHeight: 20 },
  footer: { padding: 24 },
});
