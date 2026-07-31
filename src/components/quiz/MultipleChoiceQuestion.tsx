import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable, LayoutAnimation } from 'react-native';
import { getContentRepository } from '../../lib/content/repository';
import { packageText } from '../../lib/content/text';
import { colors, fonts, radii, spacing } from '../../theme/tokens';

export interface MCQOption {
  id: string;
  text: string;
}

interface Props {
  question: string;
  options: MCQOption[];
  correctOptionId: string;
  explanation?: string;
  onResult: (correct: boolean, selectedId: string) => void | Promise<void>;
}

const MultipleChoiceQuestion: React.FC<Props> = ({ question, options, correctOptionId, explanation, onResult }) => {
  const repo = getContentRepository();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSelect = (id: string) => {
    if (!submitted) setSelectedId(id);
  };

  const handleSubmit = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await onResult(selectedId === correctOptionId, selectedId);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSubmitted(true);
    } catch {
      // Session displays persistence error; keep answer retryable.
    } finally {
      setSaving(false);
    }
  };

  const handleRetry = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedId(null);
    setSubmitted(false);
  };

  return (
    <View>
      <Text style={styles.question}>{question}</Text>
      {options.map(opt => {
        const sel = selectedId === opt.id;
        const correct = submitted && opt.id === correctOptionId;
        const wrong = submitted && sel && opt.id !== correctOptionId;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel={opt.text}
            accessibilityState={{ selected: sel, disabled: submitted || saving }}
            key={opt.id}
            style={({ pressed }) => [
              styles.option,
              sel && !submitted && styles.selected,
              correct && styles.correct,
              wrong && styles.wrong,
              pressed && !submitted && !saving && styles.pressed
            ]}
            onPress={() => handleSelect(opt.id)}
            disabled={submitted || saving}
          >
            <Text style={[styles.optText, (correct || (sel && !submitted)) && styles.optTextSelected]}>{opt.text}</Text>
          </Pressable>
        );
      })}
      {!submitted ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={packageText(repo, 'question.checkAnswer')}
          accessibilityState={{ disabled: !selectedId || saving, busy: saving }}
          style={[styles.submit, !selectedId && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={!selectedId || saving}
        >
          <Text style={styles.submitText}>{saving ? packageText(repo, 'question.checking') : packageText(repo, 'question.checkAnswer')}</Text>
        </TouchableOpacity>
      ) : (
        <View>
          {explanation ? <Text style={styles.explanation}>{explanation}</Text> : null}
          {selectedId !== correctOptionId ? (
            <TouchableOpacity accessibilityRole="button" style={styles.retry} onPress={handleRetry}>
              <Text style={styles.retryText}>{packageText(repo, 'question.tryAgain')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  question: { fontFamily: fonts.medium, fontSize: 17, color: colors.text, marginBottom: spacing.lg, lineHeight: 26 },
  option: { backgroundColor: colors.surface, borderRadius: radii.sm, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: 'transparent' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  selected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  correct: { borderColor: colors.success, backgroundColor: colors.successSoft },
  wrong: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  optText: { fontFamily: fonts.regular, fontSize: 15, color: colors.text },
  optTextSelected: { fontFamily: fonts.bold },
  submit: { backgroundColor: colors.primary, borderRadius: radii.sm, padding: 14, alignItems: 'center', marginTop: 4 },
  submitDisabled: { backgroundColor: colors.locked },
  submitText: { color: colors.surface, fontFamily: fonts.bold, fontSize: 15 },
  explanation: { marginTop: 12, fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, lineHeight: 22, backgroundColor: colors.surfaceMuted, padding: 12, borderRadius: radii.sm },
  retry: { borderWidth: 1, borderColor: colors.primary, borderRadius: radii.sm, padding: 12, alignItems: 'center', marginTop: 12 },
  retryText: { color: colors.primary, fontFamily: fonts.bold, fontSize: 15 },
});

export default MultipleChoiceQuestion;
