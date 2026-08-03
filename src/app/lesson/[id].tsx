import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, BackHandler, StyleSheet, Text, View, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DailyLearningLoop from '../../components/lesson/DailyLearningLoop';
import Button from '../../components/ui/Button';
import { type LevelStartMode, useLevelSession } from '../../hooks/useLevelSession';
import { getContentRepository } from '../../lib/content/repository';
import { packageText } from '../../lib/content/text';
import { colors } from '../../theme/tokens';
import { useLocalization } from '../../lib/localization/LocalizationProvider';
import { availableLessonLocales } from '../../lib/content/publication';

export default function LessonPlayerScreen() {
  const params = useLocalSearchParams<{ id?: string | string[]; mode?: string | string[] }>();
  const levelId = Array.isArray(params.id) ? params.id[0] : params.id;
  const rawMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const startMode: LevelStartMode = rawMode === 'start_over' ? 'start_over' : 'resume';
  const router = useRouter();
  const session = useLevelSession(levelId, startMode);
  const { preferences, setLessonLocale, t } = useLocalization();
  const repo = getContentRepository();
  const text = (key: Parameters<typeof packageText>[1], values?: Record<string, string | number>) => packageText(repo, key, values, preferences.interfaceLocale);

  const confirmExit = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`${text('lesson.leaveLevel')}\n\n${text('lesson.leaveMessage')}`);
      if (confirmed) {
        void (async () => {
          await session.abandonSession();
          router.back();
        })();
      }
      return;
    }

    Alert.alert(text('lesson.leaveLevel'), text('lesson.leaveMessage'), [
      { text: text('lesson.keepLearning'), style: 'cancel' },
      {
        text: text('lesson.leave'),
        style: 'destructive',
        onPress: async () => {
          await session.abandonSession();
          router.back();
        },
      },
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

  useEffect(() => {
    if (session.completionReceipt && session.level) router.replace(`/complete/${session.level.id}`);
  }, [router, session.completionReceipt, session.level]);

  if (session.status === 'loading' || session.status === 'locked') {
    return <LoadingState label={text('lesson.loadingLevel')} />;
  }

  if (session.status === 'locale_unavailable' && session.level) {
    const contentPackage = repo.getPackageForLevel(session.level.id);
    const alternatives = contentPackage ? availableLessonLocales(contentPackage) : [];
    const language = t(`locale.${preferences.lessonLocale}`);
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text accessibilityRole="header" style={styles.errorTitle}>{t('lesson.localeUnavailableTitle', { language })}</Text>
          <Text style={styles.errorText}>{t('lesson.localeUnavailableBody')}</Text>
          {alternatives.length === 0 ? <Text style={styles.errorText}>{t('lesson.noPublishedAlternative')}</Text> : alternatives.map(locale => (
            <Button
              key={locale}
              title={t('lesson.switchLanguage', { language: t(`locale.${locale}`) })}
              onPress={() => { void setLessonLocale(locale); }}
              style={styles.stateButton}
            />
          ))}
          <Button title={text('lesson.backToRoadmap')} onPress={() => router.replace('/roadmap')} variant="secondary" style={styles.stateButton} />
        </View>
      </SafeAreaView>
    );
  }

  if (session.status === 'not_found' || !session.level || !session.path || !session.step) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>{text('lesson.levelNotFound')}</Text>
          <Button title={text('lesson.backToRoadmap')} onPress={() => router.replace('/roadmap')} style={styles.stateButton} />
        </View>
      </SafeAreaView>
    );
  }

  if (session.status === 'error') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>{text('lesson.progressUnavailable')}</Text>
          <Text style={styles.errorText}>{session.error}</Text>
          <Button title={text('lesson.backToRoadmap')} onPress={() => router.replace('/roadmap')} style={styles.stateButton} />
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
    <DailyLearningLoop
      level={activeLevel}
      step={session.step}
      stepRenderKey={session.stepRenderKey}
      currentStepIndex={session.displayStepIndex}
      totalSteps={session.totalCoreSteps}
      canProceed={session.canProceed}
      hasInteraction={session.hasInteraction}
      feedback={session.feedback}
      reviewRoundLabel={session.retryCount > 0 ? text('lesson.reviewRound', { count: session.retryCount }) : undefined}
      isLastStep={session.isLastStep}
      busy={session.busy}
      continueLabel={text('lesson.continue')}
      completeLabel={text('lesson.completeLevel')}
      correctFeedbackLabel={text('lesson.correctFeedback')}
      retryFeedbackLabel={text('lesson.retryFeedback')}
      exitLabel={text('lesson.leave')}
      warning={session.warning?.message}
      error={session.error ?? undefined}
      onExit={confirmExit}
      onAdvance={handleAdvance}
      onQuestionAnswer={session.answerQuestion}
      onActivityAnswer={session.answerActivity}
    />
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>{label}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: colors.textMuted, fontSize: 14 },
  errorTitle: { color: colors.danger, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  errorText: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  stateButton: { marginTop: 20 },
});
