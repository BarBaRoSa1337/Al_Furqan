import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export interface MatchPair {
  id: string;
  arabic: string;
  meaning: string;
}

interface Props {
  question: string;
  pairs: MatchPair[];
  onResult: (correct: boolean, score: number) => void;
}

const MatchQuestion: React.FC<Props> = ({ question, pairs, onResult }) => {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [selectedArabic, setSelectedArabic] = useState<string | null>(null);

  const handleArabicPress = (id: string) => {
    if (submitted) return;
    setSelectedArabic(id === selectedArabic ? null : id);
  };

  const handleMeaningPress = (meaning: string) => {
    if (submitted || !selectedArabic) return;
    setSelections(prev => ({ ...prev, [selectedArabic]: meaning }));
    setSelectedArabic(null);
  };

  const handleSubmit = () => {
    let correct = 0;
    pairs.forEach(p => {
      if (selections[p.id] === p.meaning) correct++;
    });
    setSubmitted(true);
    onResult(correct === pairs.length, correct);
  };

  const shuffledMeanings = [...pairs].sort(() => Math.random() - 0.5).map(p => p.meaning);

  return (
    <View>
      <Text style={styles.question}>{question}</Text>
      <Text style={styles.hint}>Tap an Arabic word, then tap its meaning</Text>
      <View style={styles.columns}>
        <View style={styles.col}>
          {pairs.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.arabicItem,
                selectedArabic === p.id && styles.arabicSelected,
                submitted && (selections[p.id] === p.meaning ? styles.correct : styles.wrong),
              ]}
              onPress={() => handleArabicPress(p.id)}
              disabled={submitted}
            >
              <Text style={styles.arabicText}>{p.arabic}</Text>
              {selections[p.id] ? <Text style={styles.matchedText}>{selections[p.id]}</Text> : null}
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.col}>
          {shuffledMeanings.map((m, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.meaningItem, selectedArabic ? styles.meaningHint : null]}
              onPress={() => handleMeaningPress(m)}
              disabled={submitted}
            >
              <Text style={styles.meaningText}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {!submitted ? (
        <TouchableOpacity
          style={[styles.submit, Object.keys(selections).length < pairs.length && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={Object.keys(selections).length < pairs.length}
        >
          <Text style={styles.submitText}>Check Matches</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  question: { fontSize: 17, fontWeight: '600', color: '#1A1A1A', marginBottom: 6, lineHeight: 26 },
  hint: { fontSize: 13, color: '#888', marginBottom: 14 },
  columns: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  arabicItem: { backgroundColor: '#EBF5FB', borderRadius: 10, padding: 12, marginBottom: 10, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  arabicSelected: { borderColor: '#1B4F72' },
  correct: { borderColor: '#1E8449', backgroundColor: '#D5F5E3' },
  wrong: { borderColor: '#C0392B', backgroundColor: '#FDEDEC' },
  arabicText: { fontSize: 20, fontFamily: 'serif', color: '#1B4F72', textAlign: 'center' },
  matchedText: { fontSize: 11, color: '#555', marginTop: 4 },
  meaningItem: { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 12, marginBottom: 10, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  meaningHint: { borderColor: '#DDD' },
  meaningText: { fontSize: 13, color: '#333', textAlign: 'center', fontWeight: '600' },
  submit: { backgroundColor: '#1B4F72', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  submitDisabled: { backgroundColor: '#AAA' },
  submitText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});

export default MatchQuestion;
