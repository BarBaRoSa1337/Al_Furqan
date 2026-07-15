import React, { useState } from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import { RecallRating } from '../../types/activities';
import type { RecallThenRevealActivity as RecallActivity } from '../../types/activities';
import Card from '../ui/Card';
import { getContentRepository } from '../../lib/content/repository';
import { packageText } from '../../lib/content/text';

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
  return <Card><Text style={styles.title}>{packageText(repo, 'activity.recall')}</Text><Text style={styles.text}>{activity.instruction}</Text>{!revealed ? <Pressable accessibilityRole="button" accessibilityLabel={packageText(repo, 'activity.reveal')} style={styles.button} onPress={() => { setRating(undefined); setRevealed(true); }}><Text style={styles.buttonText}>{packageText(repo, 'activity.reveal')}</Text></Pressable> : <View><View style={styles.reveal}>{ayat.map(ayah => <Text key={ayah.id} style={styles.arabic}>{ayah.arabicText.text}</Text>)}</View><Text style={styles.hint}>{packageText(repo, 'activity.compareAndRate')}</Text><View style={styles.ratings}>{(['again', 'hard', 'remembered'] as const).map(item => <Pressable key={item} accessibilityRole="button" accessibilityLabel={packageText(repo, `activity.${item}`)} accessibilityState={{ selected: rating === item, disabled: submitting || Boolean(rating) }} disabled={submitting || Boolean(rating)} style={[styles.rating, styles[item], rating === item && styles.selected]} onPress={() => { void rate(item); }}><Text style={styles.ratingText}>{packageText(repo, `activity.${item}`)}</Text></Pressable>)}</View></View>}</Card>;
}
const styles = StyleSheet.create({ title: { color: '#1B4F72', fontSize: 18, fontWeight: '700' }, text: { color: '#2C3E50', fontSize: 16, lineHeight: 24, marginVertical: 12 }, button: { backgroundColor: '#1B4F72', borderRadius: 10, padding: 12, alignItems: 'center' }, buttonText: { color: '#FFF', fontWeight: '700' }, reveal: { backgroundColor: '#F5F0E8', borderRadius: 12, padding: 14, marginBottom: 12 }, arabic: { color: '#1A1A1A', fontSize: 26, lineHeight: 42, textAlign: 'right', writingDirection: 'rtl' }, hint: { color: '#566573', fontSize: 14, lineHeight: 20, marginBottom: 12 }, ratings: { flexDirection: 'row', gap: 8 }, rating: { borderRadius: 10, flex: 1, paddingVertical: 10, alignItems: 'center' }, again: { backgroundColor: '#FDEDEC' }, hard: { backgroundColor: '#FCF3CF' }, remembered: { backgroundColor: '#E9F7EF' }, selected: { borderWidth: 2, borderColor: '#1B4F72' }, ratingText: { color: '#1A1A1A', fontSize: 13, fontWeight: '700' } });
