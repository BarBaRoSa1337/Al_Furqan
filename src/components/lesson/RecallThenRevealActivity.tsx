import React, { useState } from 'react';
import { View, Pressable, StyleSheet, Text, LayoutAnimation } from 'react-native';
import { RecallRating } from '../../types/activities';
import type { RecallThenRevealActivity as RecallActivity } from '../../types/activities';
import Card from '../ui/Card';
import { getContentRepository } from '../../lib/content/repository';
import { packageText } from '../../lib/content/text';
import { colors } from '../../theme/tokens';

export default function RecallThenRevealActivity({ activity, onAnswer }: { activity: RecallActivity; onAnswer: (answer: RecallRating, correct: boolean) => void | Promise<void> }) {
  const [revealed, setRevealed] = useState(false);
  const [rating, setRating] = useState<RecallRating>();
  const [submitting, setSubmitting] = useState(false);
  const repo = getContentRepository();
  const rate = async (nextRating: RecallRating) => {
    if (submitting || rating) return;
    setSubmitting(true);
    try {
      await onAnswer(nextRating, nextRating !== 'again');
      if (nextRating === 'again') setRevealed(false);
      else setRating(nextRating);
    } finally {
      setSubmitting(false);
    }
  };
  const ayat = repo.getAyatByRefs(activity.ayahRefs);
  return <Card><Text style={styles.title}>{packageText(repo, 'activity.recall')}</Text><Text style={styles.text}>{activity.instruction}</Text>{!revealed ? <Pressable accessibilityRole="button" accessibilityLabel={packageText(repo, 'activity.reveal')} style={styles.button} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setRating(undefined); setRevealed(true); }}><Text style={styles.buttonText}>{packageText(repo, 'activity.reveal')}</Text></Pressable> : <View><View style={styles.reveal}>{ayat.map(ayah => <Text key={ayah.id} style={styles.arabic}>{ayah.arabicText.text}</Text>)}</View><Text style={styles.hint}>{packageText(repo, 'activity.compareAndRate')}</Text><View style={styles.ratings}>{(['again', 'hard', 'remembered'] as const).map(item => <Pressable key={item} accessibilityRole="button" accessibilityLabel={packageText(repo, `activity.${item}`)} accessibilityState={{ selected: rating === item, disabled: submitting || Boolean(rating) }} disabled={submitting || Boolean(rating)} style={[styles.rating, styles[item], rating === item && styles.selected]} onPress={() => { void rate(item); }}><Text style={styles.ratingText}>{packageText(repo, `activity.${item}`)}</Text></Pressable>)}</View></View>}</Card>;
}
const styles = StyleSheet.create({ title: { color: colors.primary, fontSize: 18, fontWeight: '700' }, text: { color: colors.text, fontSize: 16, lineHeight: 24, marginVertical: 12 }, button: { backgroundColor: colors.primary, borderRadius: 10, padding: 12, alignItems: 'center' }, buttonText: { color: colors.surface, fontWeight: '700' }, reveal: { backgroundColor: colors.background, borderRadius: 12, padding: 14, marginBottom: 12 }, arabic: { color: colors.text, fontSize: 26, lineHeight: 42, textAlign: 'right', writingDirection: 'rtl' }, hint: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 12 }, ratings: { flexDirection: 'row', gap: 8 }, rating: { borderRadius: 10, flex: 1, paddingVertical: 10, alignItems: 'center' }, again: { backgroundColor: colors.dangerSoft }, hard: { backgroundColor: colors.warningSoft }, remembered: { backgroundColor: colors.successSoft }, selected: { borderWidth: 2, borderColor: colors.primary }, ratingText: { color: colors.text, fontSize: 13, fontWeight: '700' } });
