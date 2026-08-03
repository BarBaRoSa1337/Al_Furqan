import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SurahRecord } from '../../types/content';
import { colors, fonts, radii, shadows, spacing } from '../../theme/tokens';
import SurahProgressRing from './SurahProgressRing';

interface SurahRoadmapCardProps {
  surah: SurahRecord;
  completed: number;
  total: number;
  nextTitle?: string;
  pending?: boolean;
  onPress: () => void;
}

export default function SurahRoadmapCard({ surah, completed, total, nextTitle, pending = false, onPress }: SurahRoadmapCardProps) {
  const complete = total > 0 && completed === total;
  const accessibilityLabel = pending
    ? `${surah.transliteratedName}, content unavailable`
    : `${surah.transliteratedName}, ${completed} of ${total} lessons complete${nextTitle ? `, next ${nextTitle}` : ''}`;
  return (
    <Pressable
      accessibilityHint={pending ? 'Opens the Surah information' : 'Opens this Surah learning path'}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <SurahProgressRing completed={completed} total={total} surahNumber={surah.surahNumber} />
      <View style={styles.copy}>
        <Text style={[styles.eyebrow, pending && styles.pendingEyebrow]}>{pending ? 'SURAH PATH' : complete ? 'SURAH COMPLETE' : 'THEMATIC SURAH PATH'}</Text>
        <Text style={styles.title}>{surah.transliteratedName}</Text>
        <Text style={styles.arabic}>{surah.arabicName}</Text>
        <Text style={styles.meta}>{surah.ayahCount} ayat · {surah.revelationPlace === 'makkah' ? 'Makkan' : 'Madinan'}</Text>
        <Text numberOfLines={1} style={[styles.next, pending && styles.pendingNext]}>{pending ? 'Explore canonical references' : complete ? 'Review the Surah' : `Next: ${nextTitle ?? 'Begin'}`}</Text>
      </View>
      <Ionicons color={colors.success} name="chevron-forward" size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.goldSoft, borderRadius: radii.lg, borderWidth: 1, boxShadow: shadows.raised, flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md, minHeight: 132, padding: spacing.lg },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  copy: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.success, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.8 },
  title: { color: colors.primary, fontFamily: fonts.bold, fontSize: 20, lineHeight: 24, marginTop: 2 },
  arabic: { color: colors.primary, fontFamily: fonts.arabic, fontSize: 22, lineHeight: 30, position: 'absolute', right: 0, top: 18, writingDirection: 'rtl' },
  meta: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 12, marginTop: spacing.xs },
  next: { color: colors.gold, fontFamily: fonts.medium, fontSize: 12, marginTop: spacing.sm },
  pendingEyebrow: { color: colors.textMuted },
  pendingNext: { color: colors.textMuted },
});
