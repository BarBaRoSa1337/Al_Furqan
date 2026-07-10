import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, BackHandler, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getContentRepository } from '../../lib/content/repository';
import StepRenderer from '../../components/lesson/StepRenderer';
import ProgressBar from '../../components/ui/ProgressBar';
import Button from '../../components/ui/Button';
import { getAppProgress } from '../../lib/progress/storage';
import { isLevelAccessible } from '../../lib/progress/lessonAccess';

export default function LessonPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const repo = getContentRepository();

  const level = repo.getLevelById(id as string);
  const path = level ? repo.getCurrentLearningPath() : undefined;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [canProceed, setCanProceed] = useState(true);
  const [accessResolved, setAccessResolved] = useState(false);
  const [correctQuestionIds, setCorrectQuestionIds] = useState<string[]>([]);

  const step = level?.steps[currentStepIndex];
  const isLast = level ? currentStepIndex === level.steps.length - 1 : false;

  // Handle Android back button
  useEffect(() => {
    const onBackPress = () => {
      Alert.alert('Quit Lesson?', 'Your progress in this lesson will be lost.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Quit', style: 'destructive', onPress: () => router.back() },
      ]);
      return true;
    };
    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [router]);

  useEffect(() => {
    const questionIds = step?.blocks
      .filter(block => block.type === 'question')
      .map(block => block.id) ?? [];

    if (questionIds.length === 0) {
      setCanProceed(true);
      return;
    }

    setCanProceed(questionIds.every(questionId => correctQuestionIds.includes(questionId)));
  }, [step, correctQuestionIds]);

  useEffect(() => {
    setCorrectQuestionIds([]);
  }, [currentStepIndex]);

  useEffect(() => {
    let isCancelled = false;

    async function resolveAccess() {
      if (!level) {
        if (!isCancelled) setAccessResolved(true);
        return;
      }

      const progress = await getAppProgress();
      const levels = path ? repo.getLevelsForLearningPath(path.id) : [];
      const accessible = isLevelAccessible(levels, progress.completedLevelIds, level.id);

      if (isCancelled) {
        return;
      }

      if (!accessible) {
        router.replace('/roadmap');
        return;
      }

      setAccessResolved(true);
    }

    setAccessResolved(false);
    resolveAccess();

    return () => {
      isCancelled = true;
    };
  }, [level, path, repo, router]);

  if (!level) {
    return (
      <View style={styles.center}>
        <Text>Level not found.</Text>
        <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: 20 }} />
      </View>
    );
  }

  if (!accessResolved) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color="#1B4F72" />
          <Text style={styles.loadingText}>Loading level...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!step) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text>Step not found.</Text>
          <Button title="Back to Roadmap" onPress={() => router.replace('/roadmap')} style={{ marginTop: 20 }} />
        </View>
      </SafeAreaView>
    );
  }

  const handleQuestionAnswer = (blockId: string, correct: boolean) => {
    if (correct) {
      setCorrectQuestionIds(prev => prev.includes(blockId) ? prev : [...prev, blockId]);
    }
  };

  const handleNext = () => {
    if (isLast) {
      router.replace(`/complete/${level.id}`);
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
        <View style={styles.progressWrap}>
          <ProgressBar
            current={currentStepIndex + 1}
            total={level.steps.length}
            showLabel={false}
            height={6}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <StepRenderer level={level} step={step} onQuestionAnswer={handleQuestionAnswer} />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={isLast ? 'Complete Level' : 'Continue'}
          onPress={handleNext}
          disabled={!canProceed}
          size="lg"
          style={styles.btn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F0E8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#566573', fontSize: 14 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8E8E8', justifyContent: 'center', alignItems: 'center' },
  closeIcon: { fontSize: 18, color: '#666', fontWeight: 'bold' },
  progressWrap: { flex: 1, marginLeft: 20 },
  scroll: { padding: 20, paddingBottom: 40 },
  footer: { padding: 20, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E8E8E8' },
  btn: { width: '100%' },
});
