import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, shadows, spacing, touch } from '../../theme/tokens';
import type { QuranLocationSummary } from '../../lib/progress/dashboard';
import { CourseArtwork, ZelligeSeal } from './FurqanArtwork';
import { useLocalization } from '../../lib/localization/LocalizationProvider';

export function DailyGoalCard({
  complete,
  actionKind,
  onPress,
}: {
  complete: boolean;
  actionKind: 'review' | 'lesson' | 'practice' | 'explore';
  onPress: () => void;
}) {
  const { t } = useLocalization();
  const actionLabel = actionKind === 'review' ? t('home.reviewNow') : actionKind === 'explore' ? t('home.explore') : actionKind === 'practice' ? t('home.practice') : t('home.continue');
  return (
    <View style={styles.goalCard}>
      <View style={styles.goalRing}>
        <View style={styles.goalRingInner}>
          <Text style={styles.goalValue}>{complete ? '1/1' : '0/1'}</Text>
          <Text style={styles.goalUnit}>{t('home.session')}</Text>
        </View>
      </View>
      <View style={styles.goalCopy}>
        <Text style={styles.goalTitle}>{t('home.dailyGoal')}</Text>
        <Text style={styles.goalText}>{complete ? t('home.sessionComplete') : actionKind === 'review' ? t('home.reviewFirst') : t('home.sessionPending')}</Text>
        <View style={styles.goalProgress}><View style={[styles.goalProgressFill, complete && styles.goalProgressComplete]} /></View>
        <Text style={styles.goalEncouragement}>{complete ? t('home.savedToday') : t('home.littleDaily')}</Text>
      </View>
      <View style={styles.goalActionColumn}>
        <CourseArtwork variant="quran" size={50} />
        <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.goalButton, pressed && styles.pressed]}>
          <Text style={styles.goalButtonText}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.surface} />
        </Pressable>
      </View>
    </View>
  );
}

export function LocationSelector({
  location,
  onSelect,
}: {
  location?: QuranLocationSummary;
  onSelect: (mode: 'surah' | 'juz' | 'hizb', number: number) => void;
}) {
  const { t } = useLocalization();
  const items = [
    { label: t('home.juz'), mode: 'juz' as const, value: location?.juzNumber, icon: 'book-outline' as const },
    { label: t('home.hizb'), mode: 'hizb' as const, value: location?.hizbNumber, icon: 'options-outline' as const },
    { label: t('home.surah'), mode: 'surah' as const, value: location?.surahNumber, icon: 'business-outline' as const },
  ];
  return (
    <View style={styles.selectorShell}>
      <View style={styles.selectorTabs}>
        {items.map(item => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.value ? `${item.label} ${item.value}` : `${item.label} unavailable`}
            accessibilityState={{ disabled: !item.value }}
            disabled={!item.value}
            key={item.label}
            onPress={() => item.value && onSelect(item.mode, item.value)}
            style={({ pressed }) => [styles.selectorItem, pressed && styles.pressed, !item.value && styles.disabled]}
          >
            <Ionicons name={item.icon} size={17} color={colors.primary} />
            <Text style={styles.selectorLabel}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.location}>
        <View style={styles.locationCopy}>
          <Text style={styles.locationEyebrow}>{t('home.currentLocation')}</Text>
          <Text style={styles.locationTitle}>{location ? `${location.surahName} · ${t('home.ayah', { ayah: location.ayahLabel })}` : t('home.locationUnavailable')}</Text>
          <Text style={styles.locationMeta}>{location?.pageNumber ? t('home.pageRub', { page: location.pageNumber, rub: location.rubNumber ?? '-' }) : t('home.openExplore')}</Text>
        </View>
        <ZelligeSeal size={48} tone="gold"><Ionicons name="navigate-outline" size={19} color={colors.surface} /></ZelligeSeal>
      </View>
    </View>
  );
}

export function SupportCard({
  variant,
  title,
  description,
  onPress,
  badge,
  wide = false,
}: {
  variant: 'quran' | 'lantern' | 'stories';
  title: string;
  description: string;
  onPress: () => void;
  badge?: string;
  wide?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.supportCard, wide && styles.supportWide, pressed && styles.pressed]}>
      <CourseArtwork variant={variant} size={wide ? 68 : 58} />
      <View style={styles.supportCopy}>
        <Text style={styles.supportTitle}>{title}</Text>
        <Text style={styles.supportText} numberOfLines={wide ? 2 : 3}>{description}</Text>
        {badge ? <Text style={styles.supportBadge}>{badge}</Text> : null}
      </View>
      <View style={styles.supportArrow}><Ionicons name="chevron-forward" size={16} color={colors.primary} /></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  goalCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl, borderWidth: 1, boxShadow: shadows.raised, flexDirection: 'row', gap: 10, padding: 14 },
  goalRing: { alignItems: 'center', borderColor: colors.goldSoft, borderRadius: 38, borderWidth: 6, height: 76, justifyContent: 'center', width: 76 },
  goalRingInner: { alignItems: 'center', borderColor: colors.success, borderRadius: 31, borderTopWidth: 4, borderWidth: 2, height: 62, justifyContent: 'center', width: 62 },
  goalValue: { color: colors.primary, fontFamily: fonts.bold, fontSize: 19, lineHeight: 22 },
  goalUnit: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 9, textTransform: 'uppercase' },
  goalCopy: { flex: 1, minWidth: 0 },
  goalTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 17 },
  goalText: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, marginTop: 2 },
  goalProgress: { backgroundColor: colors.surfaceMuted, borderRadius: radii.pill, height: 5, marginTop: spacing.sm, overflow: 'hidden' },
  goalProgressFill: { backgroundColor: colors.gold, borderRadius: radii.pill, height: 5, width: '45%' },
  goalProgressComplete: { backgroundColor: colors.success, width: '100%' },
  goalEncouragement: { color: colors.success, fontFamily: fonts.medium, fontSize: 9, marginTop: 3 },
  goalActionColumn: { alignItems: 'center', gap: spacing.xs },
  goalButton: { alignItems: 'center', backgroundColor: colors.success, borderRadius: radii.pill, flexDirection: 'row', justifyContent: 'center', minHeight: touch.minimum, paddingHorizontal: 10 },
  goalButtonText: { color: colors.surface, fontFamily: fonts.bold, fontSize: 12 },
  selectorShell: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden' },
  selectorTabs: { borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row' },
  selectorItem: { alignItems: 'center', borderRightColor: colors.border, borderRightWidth: 1, flex: 1, flexDirection: 'row', gap: 5, justifyContent: 'center', minHeight: touch.minimum },
  selectorLabel: { color: colors.text, fontFamily: fonts.medium, fontSize: 12 },
  location: { alignItems: 'center', flexDirection: 'row', padding: spacing.md },
  locationCopy: { flex: 1 },
  locationEyebrow: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.5, textTransform: 'uppercase' },
  locationTitle: { color: colors.primary, fontFamily: fonts.bold, fontSize: 15, marginTop: 1 },
  locationMeta: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 11, marginTop: 1 },
  supportCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, boxShadow: shadows.card, flex: 1, flexDirection: 'row', gap: spacing.sm, minWidth: 155, padding: spacing.md },
  supportWide: { flexBasis: '100%' },
  supportCopy: { flex: 1, minWidth: 0 },
  supportTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 14 },
  supportText: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 10, lineHeight: 14, marginTop: 1 },
  supportBadge: { color: colors.success, fontFamily: fonts.bold, fontSize: 9, marginTop: 4 },
  supportArrow: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radii.pill, height: 28, justifyContent: 'center', width: 28 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.4 },
});
