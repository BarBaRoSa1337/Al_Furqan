import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { RecallRating } from '../../types/activities';
import Card from '../ui/Card';

export default function RecallThenRevealActivity({ instruction, onAnswer }: { instruction: string; onAnswer: (answer: RecallRating, correct: boolean) => void | Promise<void> }) {
  const [revealed, setRevealed] = useState(false);
  return <Card><Text style={styles.title}>Recall</Text><Text style={styles.text}>{instruction}</Text>{!revealed ? <Pressable accessibilityRole="button" style={styles.button} onPress={() => setRevealed(true)}><Text style={styles.buttonText}>Reveal and rate</Text></Pressable> : <Pressable accessibilityRole="button" style={styles.button} onPress={() => { void onAnswer('remembered', true); }}><Text style={styles.buttonText}>I remembered</Text></Pressable>}</Card>;
}
const styles = StyleSheet.create({ title: { color: '#1B4F72', fontSize: 18, fontWeight: '700' }, text: { color: '#2C3E50', fontSize: 16, lineHeight: 24, marginVertical: 12 }, button: { backgroundColor: '#1B4F72', borderRadius: 10, padding: 12, alignItems: 'center' }, buttonText: { color: '#FFF', fontWeight: '700' } });
