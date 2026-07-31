import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, LayoutAnimation } from 'react-native';
import { getContentRepository } from '../../lib/content/repository';
import { packageText } from '../../lib/content/text';
import { colors, fonts, radii, spacing } from '../../theme/tokens';

interface Props {
  question: string;
  blankText: string;
  correctAnswer: string;
  explanation?: string;
  caseSensitive?: boolean;
  onResult: (correct: boolean, answer: string) => void | Promise<void>;
}

const FillBlankQuestion: React.FC<Props> = ({ question, blankText, correctAnswer, explanation, caseSensitive, onResult }) => {
  const repo = getContentRepository();
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    const userAnswer = caseSensitive ? answer.trim() : answer.trim().toLowerCase();
    const expected = caseSensitive ? correctAnswer : correctAnswer.toLowerCase();
    const isCorrect = userAnswer === expected;
    setSaving(true);
    try {
      await onResult(isCorrect, answer);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCorrect(isCorrect);
      setSubmitted(true);
    } catch {
      // Session displays persistence error; keep answer retryable.
    } finally {
      setSaving(false);
    }
  };

  const displayText = blankText.replace('___', '_____');

  const handleRetry = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAnswer('');
    setSubmitted(false);
    setCorrect(false);
  };

  return (
    <View>
      <Text style={styles.question}>{question}</Text>
      <Text style={styles.blank}>{displayText}</Text>
      <TextInput
        accessibilityLabel={packageText(repo, 'question.fillAnswer')}
        style={[styles.input, submitted && (correct ? styles.inputCorrect : styles.inputWrong)]}
        value={answer}
        onChangeText={setAnswer}
        editable={!submitted && !saving}
        placeholder={packageText(repo, 'question.typeAnswer')}
        placeholderTextColor="#AAA"
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />
      {!submitted ? (
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !answer.trim() || saving, busy: saving }} style={[styles.submit, !answer.trim() && styles.submitDisabled]} onPress={handleSubmit} disabled={!answer.trim() || saving}>
          <Text style={styles.submitText}>{saving ? packageText(repo, 'question.checking') : packageText(repo, 'question.checkAnswer')}</Text>
        </TouchableOpacity>
      ) : (
        <View>
          <Text style={[styles.result, correct ? styles.resultCorrect : styles.resultWrong]}>
            {correct ? packageText(repo, 'question.correct') : packageText(repo, 'question.answerIs', { answer: correctAnswer })}
          </Text>
          {explanation ? <Text style={styles.explanation}>{explanation}</Text> : null}
          {!correct ? (
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
  question: { fontFamily: fonts.medium, fontSize: 17, color: colors.text, marginBottom: spacing.md, lineHeight: 26 },
  blank: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, marginBottom: 14, fontStyle: 'italic' },
  input: { fontFamily: fonts.medium, borderWidth: 2, borderColor: colors.border, borderRadius: radii.sm, padding: 14, fontSize: 15, color: colors.text, backgroundColor: colors.surface },
  inputCorrect: { borderColor: colors.success, backgroundColor: colors.successSoft },
  inputWrong: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  submit: { backgroundColor: colors.primary, borderRadius: radii.sm, padding: 14, alignItems: 'center', marginTop: 12 },
  submitDisabled: { backgroundColor: colors.locked },
  submitText: { color: colors.surface, fontFamily: fonts.bold, fontSize: 15 },
  result: { fontSize: 16, fontFamily: fonts.bold, marginTop: 12, marginBottom: 8 },
  resultCorrect: { color: colors.success },
  resultWrong: { color: colors.danger },
  explanation: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, lineHeight: 22, backgroundColor: colors.surfaceMuted, padding: 12, borderRadius: radii.sm },
  retry: { borderWidth: 1, borderColor: colors.primary, borderRadius: radii.sm, padding: 12, alignItems: 'center', marginTop: 12 },
  retryText: { color: colors.primary, fontFamily: fonts.bold, fontSize: 15 },
});

export default FillBlankQuestion;
