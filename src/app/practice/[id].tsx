import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DailyLearningLoop from '../../components/lesson/DailyLearningLoop';
import Button from '../../components/ui/Button';
import Screen from '../../components/ui/Screen';
import { usePracticeSession } from '../../hooks/usePracticeSession';
import { getContentRepository } from '../../lib/content/repository';
import { packageText } from '../../lib/content/text';
import { colors } from '../../theme/tokens';
import { useLocalization } from '../../lib/localization/LocalizationProvider';

export default function PracticeScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const levelId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const session = usePracticeSession(levelId);
  const { preferences, t } = useLocalization();
  const repo = getContentRepository();
  const text = (key: Parameters<typeof packageText>[1], values?: Record<string, string | number>) => packageText(repo, key, values, preferences.interfaceLocale);

  useEffect(() => {
    if (session.status === 'locked') router.replace('/roadmap');
  }, [router, session.status]);

  useEffect(() => {
    if (session.finished && session.level) router.replace(`/complete/${session.level.id}`);
  }, [router, session.finished, session.level]);

  if (session.status === 'loading' || session.status === 'locked') {
    return <Screen style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.loading}>{text('practice.title')}</Text></Screen>;
  }
  if (session.status === 'locale_unavailable') {
    return <State title={t('lesson.localeUnavailableTitle', { language: t(`locale.${preferences.lessonLocale}`) })} action={text('practice.back')} onPress={() => router.replace('/roadmap')} />;
  }
  if (session.status === 'not_found' || !session.level || !session.step) {
    return <State title={text('practice.title')} action={text('practice.back')} onPress={() => router.replace('/roadmap')} />;
  }
  if (session.status === 'error') {
    return <State title={session.error ?? text('lesson.progressUnavailable')} action={text('practice.back')} onPress={() => router.replace(`/complete/${session.level!.id}`)} />;
  }

  const activeLevel = session.level;
  const finish = async () => {
    const advanced = await session.advance();
    if (advanced) router.replace(`/complete/${activeLevel.id}`);
  };

  return <DailyLearningLoop
    level={activeLevel}
    step={session.step}
    stepRenderKey={session.stepRenderKey}
    currentStepIndex={session.displayStepIndex}
    totalSteps={session.totalSteps}
    canProceed={session.canProceed}
    hasInteraction={session.hasInteraction}
    feedback={session.feedback}
    reviewRoundLabel={session.retryCount > 0 ? text('lesson.reviewRound', { count: session.retryCount }) : undefined}
    isLastStep={session.isLastStep}
    busy={session.busy}
    continueLabel={text('lesson.continue')}
    completeLabel={text('practice.complete')}
    correctFeedbackLabel={text('lesson.correctFeedback')}
    retryFeedbackLabel={text('lesson.retryFeedback')}
    exitLabel={text('practice.back')}
    error={session.error ?? undefined}
    onExit={() => router.replace(`/complete/${activeLevel.id}`)}
    onAdvance={finish}
    onQuestionAnswer={session.answerQuestion}
    onActivityAnswer={session.answerActivity}
  />;
}

function State({ title, action, onPress }: { title: string; action: string; onPress: () => void }) {
  return <Screen style={styles.center}><Text style={styles.title}>{title}</Text><Button title={action} onPress={onPress} style={styles.button} /></Screen>;
}

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center', padding: 24 }, loading: { color: colors.textMuted, marginTop: 12 }, title: { color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' }, button: { marginTop: 20 } });
