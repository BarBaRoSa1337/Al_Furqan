import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
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
  onResult: (correct: boolean, selectedId: string) => unknown | Promise<unknown>;
}

const MultipleChoiceQuestion: React.FC<Props> = ({ question, options, correctOptionId, explanation, onResult }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSelect = async (id: string) => {
    if (submitted || saving) return;
    setSelectedId(id);
    setSaving(true);
    try {
      await onResult(id === correctOptionId, id);
      setSubmitted(true);
    } catch {
      // Session displays persistence error; keep answer retryable.
    } finally {
      setSaving(false);
    }
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
            onPress={() => { void handleSelect(opt.id); }}
            disabled={submitted || saving}
          >
            <Text style={[styles.optText, (correct || (sel && !submitted)) && styles.optTextSelected]}>{opt.text}</Text>
          </Pressable>
        );
      })}
      {submitted ? (
        <View>
          {explanation ? <Text style={styles.explanation}>{explanation}</Text> : null}
        </View>
      ) : null}
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
  explanation: { marginTop: 12, fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, lineHeight: 22, backgroundColor: colors.surfaceMuted, padding: 12, borderRadius: radii.sm },
});

export default MultipleChoiceQuestion;
