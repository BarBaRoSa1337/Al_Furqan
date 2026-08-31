import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Level, LevelStep } from '../../types/content';
import type { ExerciseSubmissionResult } from '../../types/activities';
import { colors, fonts, radii, spacing } from '../../theme/tokens';
import Button from '../ui/Button';
import Card from '../ui/Card';
import ProgressBar from '../ui/ProgressBar';
import StepRenderer from './StepRenderer';

interface DailyLearningLoopProps {
  level: Level;
  step: LevelStep;
  stepRenderKey?: string;
  currentStepIndex: number;
  totalSteps?: number;
  canProceed: boolean;
  hasInteraction?: boolean;
  feedback?: { correct: boolean } | null;
  reviewRoundLabel?: string;
  isLastStep: boolean;
  busy: boolean;
  continueLabel: string;
  /** Legacy prop retained while schema-v1 lesson callers migrate. */
  checkLabel?: string;
  completeLabel: string;
  correctFeedbackLabel?: string;
  retryFeedbackLabel?: string;
  exitLabel: string;
  warning?: string;
  error?: string;
  onExit: () => void;
  onAdvance: () => void | Promise<void>;
  onQuestionAnswer?: (blockId: string, selectedAnswer: unknown, correct: boolean) => Promise<ExerciseSubmissionResult>;
  onActivityAnswer?: (activityId: string, answer: unknown, correct: boolean) => Promise<ExerciseSubmissionResult>;
}

export default function DailyLearningLoop({
  level,
  step,
  stepRenderKey,
  currentStepIndex,
  totalSteps,
  canProceed,
  hasInteraction = false,
  feedback,
  reviewRoundLabel,
  isLastStep,
  busy,
  continueLabel,
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
  const progress = normalizeLessonProgress(currentStepIndex, totalSteps ?? level.steps.length);

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
            <Text style={styles.stepCount}>{reviewRoundLabel ?? `${progress.current}/${progress.total}`}</Text>
          </View>
          <ProgressBar
            current={progress.current}
            total={progress.total}
            showLabel={false}
            height={7}
            accessibilityLabel={`${level.title}: ${progress.current} / ${progress.total}`}
          />
        </View>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {warning ? <Card elevated={false} style={styles.warningCard}><Text style={styles.warning}>{warning}</Text></Card> : null}
        {error ? <Card elevated={false} style={styles.errorCard}><Text style={styles.error}>{error}</Text></Card> : null}
        {/* Feedback banner removed; activities now provide instant inline feedback */}
        <StepRenderer key={stepRenderKey ?? step.id} step={step} onQuestionAnswer={onQuestionAnswer} onActivityAnswer={onActivityAnswer} />
      </ScrollView>

      {!hasInteraction ? <View style={styles.footer}>
        <Button
          title={isLastStep ? completeLabel : continueLabel}
          onPress={() => { void onAdvance(); }}
          disabled={!canProceed || busy}
          loading={busy}
          size="lg"
          style={styles.continueButton}
        />
      </View> : null}
    </SafeAreaView>
  );
}

export function scrollToStepTop(scrollView: Pick<ScrollView, 'scrollTo'> | null): void {
  scrollView?.scrollTo({ y: 0, animated: false });
}

export function normalizeLessonProgress(stepIndex: number, totalSteps: number): { current: number; total: number } {
  const total = Number.isFinite(totalSteps) ? Math.max(1, Math.floor(totalSteps)) : 1;
  const safeIndex = Number.isFinite(stepIndex) ? Math.floor(stepIndex) : 0;
  return { current: Math.min(total, Math.max(1, safeIndex + 1)), total };
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
  progressWrap: { flex: 1, marginStart: spacing.lg },
  progressMeta: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  levelTitle: { color: colors.text, flex: 1, fontFamily: fonts.bold, fontSize: 13, fontWeight: '800', marginEnd: spacing.sm },
  stepCount: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 12, fontWeight: '700', writingDirection: 'ltr' },
  scroll: { alignSelf: 'center', maxWidth: 720, padding: spacing.lg, paddingBottom: 40, width: '100%' },
  warningCard: { backgroundColor: colors.warningSoft, borderColor: colors.goldSoft, borderWidth: 1 },
  warning: {
    color: colors.warning,
    fontFamily: fonts.regular,
    lineHeight: 20,
  },
  errorCard: { backgroundColor: colors.dangerSoft, borderColor: colors.danger, borderWidth: 1 },
  error: {
    color: colors.danger,
    fontFamily: fonts.regular,
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
