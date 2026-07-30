import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, spacing } from '../../theme/tokens';
import { FurqanMark } from './FurqanArtwork';

export default function FurqanHeader({ streak, xp }: { streak: number; xp: number }) {
  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <FurqanMark />
        <Text accessibilityRole="header" style={styles.brandName}>Furqan</Text>
      </View>
      <View style={styles.stats}>
        <Stat icon="flame" value={streak} label="Day streak" color={colors.gold} />
        <Stat icon="sparkles" value={xp} label="Points" color={colors.success} />
      </View>
    </View>
  );
}

function Stat({ icon, value, label, color }: { icon: keyof typeof Ionicons.glyphMap; value: number; label: string; color: string }) {
  return (
    <View accessibilityLabel={`${value} ${label}`} style={styles.stat}>
      <Ionicons name={icon} size={16} color={color} />
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  brand: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  brandName: { color: colors.primary, fontFamily: fonts.bold, fontSize: 24, letterSpacing: -0.5 },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', gap: 5, minHeight: 42, paddingHorizontal: spacing.sm },
  statValue: { color: colors.text, fontFamily: fonts.bold, fontSize: 12, lineHeight: 14 },
  statLabel: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 8, lineHeight: 10, textTransform: 'uppercase' },
});
