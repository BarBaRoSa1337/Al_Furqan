import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, BackHandler, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import StepRenderer from '../../components/lesson/StepRenderer';
import Button from '../../components/ui/Button';
import ProgressBar from '../../components/ui/ProgressBar';
import { useLevelSession } from '../../hooks/useLevelSession';

export default function LessonPlayerScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const levelId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const session = useLevelSession(levelId);

  const confirmExit = () => {
    Alert.alert('Leave level?', 'Completed steps are saved. You can continue later.', [
      { text: 'Keep Learning', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmExit();
      return true;
    });
    return () => subscription.remove();
  }, [router]);

  useEffect(() => {
    if (session.status === 'locked') router.replace('/roadmap');
  }, [router, session.status]);

  if (session.status === 'loading' || session.status === 'locked') {
    return <LoadingState label="Loading level..." />;
  }

  if (session.status === 'not_found' || !session.level || !session.path || !session.step) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Level not found.</Text>
          <Button title="Back to Roadmap" onPress={() => router.replace('/roadmap')} style={styles.stateButton} />
        </View>
      </SafeAreaView>
    );
  }

  if (session.status === 'error') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Progress unavailable</Text>
          <Text style={styles.errorText}>{session.error}</Text>
          <Button title="Back to Roadmap" onPress={() => router.replace('/roadmap')} style={styles.stateButton} />
        </View>
      </SafeAreaView>
    );
  }

  const activeLevel = session.level;

  const handleAdvance = async () => {
    const receipt = await session.advance();
    if (receipt) router.replace(`/complete/${activeLevel.id}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Leave level"
          onPress={confirmExit}
          style={styles.closeButton}
        >
          <Text style={styles.closeIcon}>×</Text>
        </TouchableOpacity>
        <View style={styles.progressWrap}>
          <ProgressBar current={session.currentStepIndex + 1} total={activeLevel.steps.length} showLabel={false} height={6} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {session.warning ? <Text style={styles.warning}>{session.warning.message}</Text> : null}
        {session.error ? <Text style={styles.errorBanner}>{session.error}</Text> : null}
        <StepRenderer step={session.step} onQuestionAnswer={session.answerQuestion} onActivityAnswer={session.answerActivity} />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={session.isLastStep ? 'Complete Level' : 'Continue'}
          onPress={() => { void handleAdvance(); }}
          disabled={!session.canProceed || session.busy}
          loading={session.busy}
          size="lg"
          style={styles.continueButton}
        />
      </View>
    </SafeAreaView>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <ActivityIndicator color="#1B4F72" />
        <Text style={styles.loadingText}>{label}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F0E8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#566573', fontSize: 14 },
  errorTitle: { color: '#7B241C', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  errorText: { color: '#5D6D7E', fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  stateButton: { marginTop: 20 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 },
  closeButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8E8E8', justifyContent: 'center', alignItems: 'center' },
  closeIcon: { fontSize: 24, color: '#566573', fontWeight: '700', lineHeight: 28 },
  progressWrap: { flex: 1, marginLeft: 20 },
  scroll: { padding: 20, paddingBottom: 40 },
  warning: { backgroundColor: '#FCF3CF', color: '#7D6608', borderRadius: 10, padding: 12, marginBottom: 16, lineHeight: 20 },
  errorBanner: { backgroundColor: '#FDEDEC', color: '#922B21', borderRadius: 10, padding: 12, marginBottom: 16, lineHeight: 20 },
  footer: { padding: 20, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E8E8E8' },
  continueButton: { width: '100%' },
});
