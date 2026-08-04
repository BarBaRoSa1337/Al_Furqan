import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, shadows, spacing } from '../../theme/tokens';
import { FurqanMark } from './FurqanArtwork';
import { useLocalization } from '../../lib/localization/LocalizationProvider';

export default function FurqanHeader({ streak, xp }: { streak: number; xp: number }) {
  const { t } = useLocalization();
  return (
    <View style={styles.header}>
      <View style={styles.inner}>
        <View style={styles.brand}>
          <FurqanMark size={36} />
          <Text accessibilityRole="header" style={styles.brandName}>الفرقان</Text>
        </View>
        <View style={styles.stats}>
          <Stat icon="flame" value={streak} label={t('header.dayStreak')} color={colors.gold} />
          <View style={styles.statDivider} />
          <Stat icon="star-outline" value={xp} label={t('header.points')} color={colors.gold} />
        </View>
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
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  inner: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-between', maxWidth: 1040, width: '100%' },
  brand: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  brandName: { color: colors.primary, fontFamily: fonts.arabicMedium, fontSize: 31, lineHeight: 42, writingDirection: 'rtl' },
  stats: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, boxShadow: shadows.card, flexDirection: 'row', minHeight: 48, paddingHorizontal: spacing.sm },
  stat: { alignItems: 'center', flexDirection: 'row', gap: 5, paddingHorizontal: spacing.xs },
  statDivider: { backgroundColor: colors.border, height: 27, marginHorizontal: spacing.xs, width: 1 },
  statValue: { color: colors.text, fontFamily: fonts.bold, fontSize: 13, lineHeight: 15 },
  statLabel: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 8, lineHeight: 10 },
});
