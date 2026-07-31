import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Level, LevelStep } from '../../types/content';
import { colors, fonts, radii, spacing } from '../../theme/tokens';
import Button from '../ui/Button';
import ProgressBar from '../ui/ProgressBar';
import StepRenderer from './StepRenderer';

interface DailyLearningLoopProps {
  level: Level;
  step: LevelStep;
  stepRenderKey?: string;
  currentStepIndex: number;
  totalSteps?: number;
  canProceed: boolean;
  needsCheck?: boolean;
  feedback?: { correct: boolean } | null;
  reviewRoundLabel?: string;
  isLastStep: boolean;
  busy: boolean;
  continueLabel: string;
  checkLabel: string;
  completeLabel: string;
  correctFeedbackLabel?: string;
  retryFeedbackLabel?: string;
  exitLabel: string;
  warning?: string;
  error?: string;
  onExit: () => void;
  onAdvance: () => void | Promise<void>;
  onQuestionAnswer?: (blockId: string, selectedAnswer: unknown, correct: boolean) => void | Promise<void>;
  onActivityAnswer?: (activityId: string, answer: unknown, correct: boolean) => void | Promise<void>;
}

export default function DailyLearningLoop({
  level,
  step,
  stepRenderKey,
  currentStepIndex,
  totalSteps,
  canProceed,
  needsCheck = false,
  feedback,
  reviewRoundLabel,
  isLastStep,
  busy,
  continueLabel,
  checkLabel,
  completeLabel,
  correctFeedbackLabel = 'Correct. Keep this in mind.',
  retryFeedbackLabel = 'We will revisit this shortly.',
  exitLabel,
  warning,
  error,
  onExit,
  onAdvance,
  onQuestionAnswer,
  onActivityAnswer,
}: DailyLearningLoopProps) {
  const scrollRef = useRef<ScrollView>(null);
  const resolvedTotalSteps = totalSteps ?? level.steps.length;

  useEffect(() => {
    scrollToStepTop(scrollRef.current);
  }, [step.id]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={exitLabel}
          onPress={onExit}
          hitSlop={8}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
        >
          <Ionicons name="close" size={22} color={colors.textMuted} />
        </Pressable>
        <View style={styles.progressWrap}>
          <View style={styles.progressMeta}>
            <Text numberOfLines={1} style={styles.levelTitle}>{level.title}</Text>
            <Text style={styles.stepCount}>{reviewRoundLabel ?? `${currentStepIndex + 1} / ${resolvedTotalSteps}`}</Text>
          </View>
          <ProgressBar
            current={currentStepIndex + 1}
            total={resolvedTotalSteps}
            showLabel={false}
            height={7}
            accessibilityLabel={`${level.title}: ${currentStepIndex + 1} / ${resolvedTotalSteps}`}
          />
        </View>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {warning ? <Text style={styles.warning}>{warning}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {feedback ? <View accessibilityLiveRegion="polite" style={[styles.feedback, feedback.correct ? styles.feedbackCorrect : styles.feedbackIncorrect]}>
          <Ionicons name={feedback.correct ? 'checkmark-circle' : 'refresh-circle'} size={22} color={feedback.correct ? colors.success : colors.danger} />
          <Text style={[styles.feedbackText, { color: feedback.correct ? colors.success : colors.danger }]}>
            {feedback.correct ? correctFeedbackLabel : retryFeedbackLabel}
          </Text>
        </View> : null}
        <StepRenderer key={stepRenderKey ?? step.id} step={step} onQuestionAnswer={onQuestionAnswer} onActivityAnswer={onActivityAnswer} />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={needsCheck ? checkLabel : isLastStep && !feedback ? completeLabel : continueLabel}
          onPress={() => { void onAdvance(); }}
          disabled={!canProceed || busy}
          loading={busy}
          size="lg"
          style={styles.continueButton}
        />
      </View>
    </SafeAreaView>
  );
}

export function scrollToStepTop(scrollView: Pick<ScrollView, 'scrollTo'> | null): void {
  scrollView?.scrollTo({ y: 0, animated: false });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: { opacity: 0.7 },
  progressWrap: { flex: 1, marginLeft: spacing.lg },
  progressMeta: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  levelTitle: { color: colors.text, flex: 1, fontFamily: fonts.bold, fontSize: 13, fontWeight: '800', marginRight: spacing.sm },
  stepCount: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 12, fontWeight: '700' },
  scroll: { alignSelf: 'center', maxWidth: 720, padding: spacing.lg, paddingBottom: 40, width: '100%' },
  warning: {
    backgroundColor: colors.warningSoft,
    color: colors.warning,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  error: {
    backgroundColor: colors.dangerSoft,
    color: colors.danger,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  feedback: { alignItems: 'center', borderRadius: radii.md, flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, padding: spacing.md },
  feedbackCorrect: { backgroundColor: colors.successSoft },
  feedbackIncorrect: { backgroundColor: colors.dangerSoft },
  feedbackText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, lineHeight: 21 },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  continueButton: { alignSelf: 'center', maxWidth: 680, width: '100%' },
});
