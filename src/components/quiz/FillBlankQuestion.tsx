import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  question: string;
  blankText: string;
  correctAnswer: string;
  explanation?: string;
  caseSensitive?: boolean;
  onResult: (correct: boolean, answer: string) => void;
}

const FillBlankQuestion: React.FC<Props> = ({ question, blankText, correctAnswer, explanation, caseSensitive, onResult }) => {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);

  const handleSubmit = () => {
    if (!answer.trim()) return;
    const userAnswer = caseSensitive ? answer.trim() : answer.trim().toLowerCase();
    const expected = caseSensitive ? correctAnswer : correctAnswer.toLowerCase();
    const isCorrect = userAnswer === expected;
    setCorrect(isCorrect);
    setSubmitted(true);
    onResult(isCorrect, answer);
  };

  const displayText = blankText.replace('___', '_____');

  return (
    <View>
      <Text style={styles.question}>{question}</Text>
      <Text style={styles.blank}>{displayText}</Text>
      <TextInput
        style={[styles.input, submitted && (correct ? styles.inputCorrect : styles.inputWrong)]}
        value={answer}
        onChangeText={setAnswer}
        editable={!submitted}
        placeholder="Type your answer..."
        placeholderTextColor="#AAA"
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />
      {!submitted ? (
        <TouchableOpacity style={[styles.submit, !answer.trim() && styles.submitDisabled]} onPress={handleSubmit} disabled={!answer.trim()}>
          <Text style={styles.submitText}>Check Answer</Text>
        </TouchableOpacity>
      ) : (
        <View>
          <Text style={[styles.result, correct ? styles.resultCorrect : styles.resultWrong]}>
            {correct ? '✅ Correct!' : `❌ The answer is: ${correctAnswer}`}
          </Text>
          {explanation ? <Text style={styles.explanation}>{explanation}</Text> : null}
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
});

export default FillBlankQuestion;
