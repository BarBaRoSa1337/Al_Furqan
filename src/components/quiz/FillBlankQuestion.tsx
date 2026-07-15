import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { getContentRepository } from '../../lib/content/repository';
import { packageText } from '../../lib/content/text';

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
  question: { fontSize: 17, fontWeight: '600', color: '#1A1A1A', marginBottom: 10, lineHeight: 26 },
  blank: { fontSize: 15, color: '#555', marginBottom: 14, fontStyle: 'italic' },
  input: { borderWidth: 2, borderColor: '#DDD', borderRadius: 10, padding: 14, fontSize: 15, color: '#1A1A1A', backgroundColor: '#FAFAFA' },
  inputCorrect: { borderColor: '#1E8449', backgroundColor: '#D5F5E3' },
  inputWrong: { borderColor: '#C0392B', backgroundColor: '#FDEDEC' },
  submit: { backgroundColor: '#1B4F72', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 12 },
  submitDisabled: { backgroundColor: '#AAA' },
  submitText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  result: { fontSize: 16, fontWeight: '700', marginTop: 12, marginBottom: 8 },
  resultCorrect: { color: '#1E8449' },
  resultWrong: { color: '#C0392B' },
  explanation: { fontSize: 14, color: '#555', lineHeight: 22, backgroundColor: '#F9F9F9', padding: 12, borderRadius: 8 },
  retry: { borderWidth: 1, borderColor: '#1B4F72', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 12 },
  retryText: { color: '#1B4F72', fontWeight: '700', fontSize: 15 },
});

export default FillBlankQuestion;
