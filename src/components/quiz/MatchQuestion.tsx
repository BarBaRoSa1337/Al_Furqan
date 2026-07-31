import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Animated } from 'react-native';
import { getContentRepository } from '../../lib/content/repository';
import { packageText } from '../../lib/content/text';
import { colors, fonts, radii, spacing } from '../../theme/tokens';

export interface MatchPair {
  id: string;
  arabic: string;
  meaning: string;
}

interface Props {
  question: string;
  pairs: MatchPair[];
  onResult: (correct: boolean, selections: Record<string, string>) => void | Promise<void>;
}

const MatchQuestion: React.FC<Props> = ({ question, pairs, onResult }) => {
  const repo = getContentRepository();
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [selectedArabic, setSelectedArabic] = useState<string | null>(null);
  const [shuffledMeanings] = useState(() => derangeMeanings(pairs));
  const [incorrectPair, setIncorrectPair] = useState<{ promptId: string; choiceId: string }>();
  const [saving, setSaving] = useState(false);
  const [shakeAnim] = useState(new Animated.Value(0));

  const handleArabicPress = (id: string) => {
    if (selections[id] || saving) return;
    setSelectedArabic(id === selectedArabic ? null : id);
    setIncorrectPair(undefined);
  };

  const handleMeaningPress = async (choiceId: string) => {
    if (!selectedArabic || saving) return;
    if (choiceId !== selectedArabic) {
      setIncorrectPair({ promptId: selectedArabic, choiceId });
      shakeAnim.setValue(0);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
      ]).start();
      return;
    }
    const nextSelections = { ...selections, [selectedArabic]: choiceId };
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelections(nextSelections);
    setSelectedArabic(null);
    setIncorrectPair(undefined);
    if (Object.keys(nextSelections).length === pairs.length) {
      setSaving(true);
      try {
        await onResult(true, nextSelections);
      } catch {
        // Keep the completed mapping visible so the session can surface and retry persistence.
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <View>
      <Text style={styles.question}>{question}</Text>
      <Text style={styles.hint}>{packageText(repo, 'question.matchHint')}</Text>
      <View style={styles.columns}>
        <View style={styles.col}>
          {pairs.map(p => {
            const isWrong = incorrectPair?.promptId === p.id;
            return (
              <Animated.View key={p.id} style={isWrong ? { transform: [{ translateX: shakeAnim }] } : undefined}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`${p.arabic}${selections[p.id] ? ` matched with ${pairs.find(choice => choice.id === selections[p.id])?.meaning ?? ''}` : ''}`}
                  accessibilityState={{ selected: selectedArabic === p.id || Boolean(selections[p.id]), disabled: Boolean(selections[p.id]) || saving }}
                  style={[
                    styles.arabicItem,
                    selectedArabic === p.id && styles.arabicSelected,
                    selections[p.id] && styles.correct,
                    isWrong && styles.wrong,
                  ]}
                  onPress={() => handleArabicPress(p.id)}
                  disabled={Boolean(selections[p.id]) || saving}
                >
                  <Text style={styles.arabicText}>{p.arabic}</Text>
                  {selections[p.id] ? <Text style={styles.matchedText}>{pairs.find(choice => choice.id === selections[p.id])?.meaning}</Text> : null}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
        <View style={styles.col}>
          {shuffledMeanings.map(choice => {
            const usedByAnotherPair = Object.entries(selections).some(([id, choiceId]) => id !== selectedArabic && choiceId === choice.id);
            const isWrong = incorrectPair?.choiceId === choice.id;
            return (
              <Animated.View key={choice.id} style={isWrong ? { transform: [{ translateX: shakeAnim }] } : undefined}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Meaning: ${choice.meaning}`}
                  accessibilityState={{ selected: usedByAnotherPair, disabled: saving || usedByAnotherPair }}
                  style={[styles.meaningItem, selectedArabic ? styles.meaningHint : null, usedByAnotherPair && styles.correct, isWrong && styles.wrong]}
                  onPress={() => { void handleMeaningPress(choice.id); }}
                  disabled={saving || usedByAnotherPair}
                >
                  <Text style={styles.meaningText}>{choice.meaning}</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  question: { color: colors.text, fontFamily: fonts.medium, fontSize: 17, marginBottom: spacing.xs, lineHeight: 26 },
  hint: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, marginBottom: spacing.md },
  columns: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  arabicItem: { alignItems: 'center', backgroundColor: colors.primarySoft, borderColor: 'transparent', borderRadius: radii.sm, borderWidth: 2, marginBottom: 10, minHeight: 48, padding: spacing.md },
  arabicSelected: { borderColor: colors.primary },
  correct: { borderColor: colors.success, backgroundColor: colors.successSoft },
  wrong: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  arabicText: { color: colors.primary, fontFamily: fonts.arabic, fontSize: 22, textAlign: 'center' },
  matchedText: { color: colors.success, fontFamily: fonts.medium, fontSize: 11, marginTop: spacing.xs },
  meaningItem: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderColor: 'transparent', borderRadius: radii.sm, borderWidth: 2, marginBottom: 10, minHeight: 48, padding: spacing.md },
  meaningHint: { borderColor: colors.border },
  meaningText: { color: colors.text, fontFamily: fonts.medium, fontSize: 13, textAlign: 'center' },
});

function derangeMeanings(pairs: MatchPair[]): MatchPair[] {
  if (pairs.length < 2) return [...pairs];
  const offset = 1 + Math.floor(Math.random() * (pairs.length - 1));
  return pairs.map((_, index) => pairs[(index + offset) % pairs.length]);
}

export default MatchQuestion;
