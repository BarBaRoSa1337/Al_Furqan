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
  onResult: (correct: boolean, selectedId: string) => void | Promise<void>;
}

const MultipleChoiceQuestion: React.FC<Props> = ({ question, options, correctOptionId, explanation, onResult }) => {
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
      setSubmitted(true);
    } catch {
      // Session displays persistence error; keep answer retryable.
    } finally {
      setSaving(false);
    }
  };

  const handleRetry = () => {
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
          <TouchableOpacity
            accessibilityRole="radio"
            accessibilityLabel={opt.text}
            accessibilityState={{ selected: sel, disabled: submitted || saving }}
            key={opt.id}
            style={[styles.option, sel && !submitted && styles.selected, correct && styles.correct, wrong && styles.wrong]}
            onPress={() => handleSelect(opt.id)}
            disabled={submitted || saving}
          >
            <Text style={[styles.optText, (correct || (sel && !submitted)) && styles.optTextSelected]}>{opt.text}</Text>
          </TouchableOpacity>
        );
      })}
      {!submitted ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Check answer"
          accessibilityState={{ disabled: !selectedId || saving, busy: saving }}
          style={[styles.submit, !selectedId && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={!selectedId || saving}
        >
          <Text style={styles.submitText}>{saving ? 'Saving...' : 'Check Answer'}</Text>
        </TouchableOpacity>
      ) : (
        <View>
          {explanation ? <Text style={styles.explanation}>{explanation}</Text> : null}
          {selectedId !== correctOptionId ? (
            <TouchableOpacity accessibilityRole="button" style={styles.retry} onPress={handleRetry}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          ) : null}
        </View>
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
  retry: { borderWidth: 1, borderColor: '#1B4F72', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 12 },
  retryText: { color: '#1B4F72', fontWeight: '700', fontSize: 15 },
});

export default MultipleChoiceQuestion;
