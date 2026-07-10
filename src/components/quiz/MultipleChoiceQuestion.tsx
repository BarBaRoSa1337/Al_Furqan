import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export interface MCQOption {
  id: string;
  text: string;
}

interface Props {
  question: string;
  options: MCQOption[];
  correctOptionId: string;
  explanation?: string;
  onResult: (correct: boolean, selectedId: string) => void;
}

const MultipleChoiceQuestion: React.FC<Props> = ({ question, options, correctOptionId, explanation, onResult }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSelect = (id: string) => {
    if (!submitted) setSelectedId(id);
  };

  const handleSubmit = () => {
    if (!selectedId) return;
    setSubmitted(true);
    onResult(selectedId === correctOptionId, selectedId);
  };

  return (
    <View>
      <Text style={styles.question}>{question}</Text>
      {options.map(opt => {
        const sel = selectedId === opt.id;
        const correct = submitted && opt.id === correctOptionId;
        const wrong = submitted && sel && opt.id !== correctOptionId;
        return (
          <TouchableOpacity
            key={opt.id}
            style={[styles.option, sel && !submitted && styles.selected, correct && styles.correct, wrong && styles.wrong]}
            onPress={() => handleSelect(opt.id)}
            disabled={submitted}
          >
            <Text style={[styles.optText, (correct || (sel && !submitted)) && styles.optTextSelected]}>{opt.text}</Text>
          </TouchableOpacity>
        );
      })}
      {!submitted ? (
        <TouchableOpacity
          style={[styles.submit, !selectedId && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={!selectedId}
        >
          <Text style={styles.submitText}>Check Answer</Text>
        </TouchableOpacity>
      ) : (
        explanation ? <Text style={styles.explanation}>{explanation}</Text> : null
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  question: { fontSize: 17, fontWeight: '600', color: '#1A1A1A', marginBottom: 16, lineHeight: 26 },
  option: { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: 'transparent' },
  selected: { borderColor: '#1B4F72', backgroundColor: '#EBF5FB' },
  correct: { borderColor: '#1E8449', backgroundColor: '#D5F5E3' },
  wrong: { borderColor: '#C0392B', backgroundColor: '#FDEDEC' },
  optText: { fontSize: 15, color: '#333' },
  optTextSelected: { fontWeight: '700' },
  submit: { backgroundColor: '#1B4F72', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
  submitDisabled: { backgroundColor: '#AAA' },
  submitText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  explanation: { marginTop: 12, fontSize: 14, color: '#555', lineHeight: 22, backgroundColor: '#F9F9F9', padding: 12, borderRadius: 8 },
});

export default MultipleChoiceQuestion;
