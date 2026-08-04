import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, fonts, shadows, spacing, touch } from '../../theme/tokens';
import type { SurahRoadmapItem } from './surahRoadmapModel';

interface SurahRoadmapNodeProps {
  item: SurahRoadmapItem;
  onPress: (id: string) => void;
  width?: number;
}

const STATE_LABELS: Record<SurahRoadmapItem['state'], string> = {
  completed: 'completed',
  current: 'current',
  available: 'available',
  future: 'future in the suggested path, open',
};

export default function SurahRoadmapNode({ item, onPress, width = 154 }: SurahRoadmapNodeProps) {
  const [focused, setFocused] = useState(false);
  const accessibilityLabel = `${item.transliteratedName}, ${item.englishName}, ${item.ayahCount} ayat, ${item.revelationType}, ${STATE_LABELS[item.state]}, ${item.completedLessons} of ${item.totalLessons} lessons complete`;
  return (
    <Pressable
      accessibilityHint="Opens this Surah learning path"
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected: item.state === 'current' }}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onPress={() => onPress(item.id)}
      style={({ pressed }) => [
        styles.node,
        { width },
        styles[item.state],
        pressed && styles.pressed,
        focused && styles.focused,
      ]}
    >
      <ProgressBadge item={item} />
      <Text style={[styles.arabic, item.state === 'future' && styles.mutedText]}>{item.arabicName}</Text>
      <Text numberOfLines={1} style={[styles.name, item.state === 'future' && styles.mutedText]}>{item.transliteratedName}</Text>
      {item.englishName !== item.transliteratedName ? (
        <Text numberOfLines={1} style={[styles.meaning, item.state === 'future' && styles.mutedText]}>{item.englishName}</Text>
      ) : null}
      <View style={styles.rule} />
      <Text style={[styles.meta, item.state === 'future' && styles.mutedText]}>{item.ayahCount} ayat · {item.revelationType}</Text>
    </Pressable>
  );
}

function ProgressBadge({ item }: { item: SurahRoadmapItem }) {
  const size = 38;
  const strokeWidth = 3;
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const count = Math.max(item.totalLessons, 1);
  const gap = Math.min(4, circumference / count / 3);
  const segment = Math.max(1, circumference / count - gap);
  const activeColor = item.state === 'current' ? colors.gold : colors.success;
  return (
    <View style={[styles.badge, styles[`${item.state}Badge`]]}>
      <Svg accessibilityElementsHidden height={size} style={StyleSheet.absoluteFill} width={size}>
        {Array.from({ length: count }, (_, index) => (
          <Circle
            cx={size / 2}
            cy={size / 2}
            fill="none"
            key={index}
            origin={`${size / 2}, ${size / 2}`}
            r={radius}
            rotation={-90 + index * (360 / count)}
            stroke={index < item.completedLessons ? activeColor : colors.borderStrong}
            strokeDasharray={`${segment} ${circumference - segment}`}
            strokeLinecap="round"
            strokeWidth={strokeWidth}
          />
        ))}
      </Svg>
      {item.state === 'completed' ? (
        <Ionicons color={colors.surface} name="checkmark" size={18} />
      ) : (
        <Text style={[styles.badgeText, item.state === 'future' && styles.mutedText]}>{item.completedLessons}/{item.totalLessons}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  node: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 34,
    borderWidth: 1,
    boxShadow: shadows.card,
    justifyContent: 'center',
    minHeight: 172,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.xl,
    position: 'relative',
  },
  completed: { backgroundColor: '#FBF9F1', borderColor: colors.success },
  current: { borderColor: colors.gold, borderWidth: 2, boxShadow: shadows.raised, transform: [{ translateY: -2 }] },
  available: { borderColor: colors.borderStrong },
  future: { backgroundColor: colors.surfaceWarm, borderColor: colors.border, boxShadow: 'none' },
  pressed: { opacity: 0.76, transform: [{ scale: 0.975 }] },
  focused: { borderColor: colors.success, borderWidth: 3 },
  badge: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    height: 38,
    justifyContent: 'center',
    left: '50%',
    marginLeft: -19,
    position: 'absolute',
    top: -19,
    width: 38,
  },
  completedBadge: { backgroundColor: colors.success },
  currentBadge: { backgroundColor: colors.goldSoft },
  availableBadge: { backgroundColor: colors.surface },
  futureBadge: { backgroundColor: colors.surfaceWarm },
  badgeText: { color: colors.primary, fontFamily: fonts.bold, fontSize: 9 },
  arabic: {
    color: colors.primary,
    fontFamily: fonts.arabicMedium,
    fontSize: 30,
    lineHeight: 42,
    minHeight: touch.minimum,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  name: { color: colors.primary, fontFamily: fonts.bold, fontSize: 15, lineHeight: 19, maxWidth: '100%', textAlign: 'center' },
  meaning: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 10, lineHeight: 13, maxWidth: '100%', textAlign: 'center' },
  rule: { backgroundColor: colors.goldSoft, height: 1, marginVertical: spacing.sm, width: 42 },
  meta: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 10, textAlign: 'center' },
  mutedText: { color: colors.textMuted },
});
