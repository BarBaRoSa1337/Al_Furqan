import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getContentRepository } from '../../lib/content/repository';
import { packageText } from '../../lib/content/text';

export interface MatchPair {
  id: string;
  arabic: string;
  meaning: string;
}

interface Props {
  question: string;
  pairs: MatchPair[];
  onResult: (correct: boolean, score: number) => void | Promise<void>;
}

const MatchQuestion: React.FC<Props> = ({ question, pairs, onResult }) => {
  const repo = getContentRepository();
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [allCorrect, setAllCorrect] = useState(false);
  const [selectedArabic, setSelectedArabic] = useState<string | null>(null);
  const [shuffledMeanings, setShuffledMeanings] = useState(() => shuffleMeanings(pairs));
  const [saving, setSaving] = useState(false);

  const handleArabicPress = (id: string) => {
    if (submitted) return;
    setSelectedArabic(id === selectedArabic ? null : id);
  };

  const handleMeaningPress = (meaning: string) => {
    if (submitted || !selectedArabic) return;
    setSelections(prev => ({ ...prev, [selectedArabic]: meaning }));
    setSelectedArabic(null);
  };

  const handleSubmit = async () => {
    let correct = 0;
    pairs.forEach(p => {
      if (selections[p.id] === p.meaning) correct++;
    });
    const isCorrect = correct === pairs.length;
    setSaving(true);
    try {
      await onResult(isCorrect, correct);
      setAllCorrect(isCorrect);
      setSubmitted(true);
    } catch {
      // Session displays persistence error; keep matches retryable.
    } finally {
      setSaving(false);
    }
  };

  const handleRetry = () => {
    setSelections({});
    setSelectedArabic(null);
    setSubmitted(false);
    setAllCorrect(false);
    setShuffledMeanings(shuffleMeanings(pairs));
  };

  return (
    <View>
      <Text style={styles.question}>{question}</Text>
      <Text style={styles.hint}>{packageText(repo, 'question.matchHint')}</Text>
      <View style={styles.columns}>
        <View style={styles.col}>
          {pairs.map(p => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`${p.arabic}${selections[p.id] ? ` matched with ${selections[p.id]}` : ''}`}
              accessibilityState={{ selected: selectedArabic === p.id, disabled: submitted || saving }}
              key={p.id}
              style={[
                styles.arabicItem,
                selectedArabic === p.id && styles.arabicSelected,
                submitted && (selections[p.id] === p.meaning ? styles.correct : styles.wrong),
              ]}
              onPress={() => handleArabicPress(p.id)}
              disabled={submitted || saving}
            >
              <Text style={styles.arabicText}>{p.arabic}</Text>
              {selections[p.id] ? <Text style={styles.matchedText}>{selections[p.id]}</Text> : null}
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.col}>
          {shuffledMeanings.map((m, i) => {
            const usedByAnotherPair = Object.entries(selections).some(([id, meaning]) => id !== selectedArabic && meaning === m);
            return <TouchableOpacity
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`Meaning: ${m}`}
              accessibilityState={{ disabled: submitted || saving || usedByAnotherPair }}
              style={[styles.meaningItem, selectedArabic ? styles.meaningHint : null, usedByAnotherPair && styles.meaningUsed]}
              onPress={() => handleMeaningPress(m)}
              disabled={submitted || saving || usedByAnotherPair}
            >
              <Text style={styles.meaningText}>{m}</Text>
            </TouchableOpacity>;
          })}
        </View>
      </View>
      {!submitted ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: Object.keys(selections).length < pairs.length || saving, busy: saving }}
          style={[styles.submit, Object.keys(selections).length < pairs.length && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={Object.keys(selections).length < pairs.length || saving}
        >
          <Text style={styles.submitText}>{saving ? packageText(repo, 'question.checking') : packageText(repo, 'question.checkMatches')}</Text>
        </TouchableOpacity>
      ) : !allCorrect ? (
        <TouchableOpacity accessibilityRole="button" style={styles.retry} onPress={handleRetry}>
          <Text style={styles.retryText}>{packageText(repo, 'question.tryAgain')}</Text>
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
  meaningUsed: { opacity: 0.45 },
  meaningText: { fontSize: 13, color: '#333', textAlign: 'center', fontWeight: '600' },
  submit: { backgroundColor: '#1B4F72', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  submitDisabled: { backgroundColor: '#AAA' },
  submitText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  retry: { borderWidth: 1, borderColor: '#1B4F72', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 12 },
  retryText: { color: '#1B4F72', fontWeight: '700', fontSize: 15 },
});

function shuffleMeanings(pairs: MatchPair[]): string[] {
  return [...pairs].sort(() => Math.random() - 0.5).map(pair => pair.meaning);
}

export default MatchQuestion;
