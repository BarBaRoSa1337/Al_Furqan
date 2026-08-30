import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, shadows, spacing } from '../../theme/tokens';
import { ZelligeSeal } from '../furqan/FurqanArtwork';
import { useLocalization } from '../../lib/localization/LocalizationProvider';

export type NodeStatus = 'completed' | 'active' | 'available' | 'locked';

interface RoadmapNodeProps {
  id: string;
  title: string;
  description?: string;
  status: NodeStatus;
  index: number;
  durationMinutes: number;
  ayahLabel: string;
  onPress: (id: string) => void;
  isLast?: boolean;
  completedActionLabel?: string;
}

export default function RoadmapNode({
  id,
  title,
  description,
  status,
  index,
  durationMinutes,
  ayahLabel,
  onPress,
  isLast = false,
  completedActionLabel = 'Practice',
}: RoadmapNodeProps) {
  const { t } = useLocalization();
  const locked = status === 'locked';
  const completed = status === 'completed';
  const active = status === 'active';
  const icon = completed ? 'checkmark' : active ? 'play' : 'ellipse';

  return (
    <View style={[styles.wrapper, active && styles.activeWrapper]}>
      {!isLast ? <View style={[styles.connector, locked && styles.connectorLocked]} /> : null}
      <View style={styles.markerColumn}>
        <ZelligeSeal size={active ? 78 : 54} tone={completed ? 'completed' : active ? 'active' : 'locked'}>
          <Ionicons name={icon} size={active ? 29 : 19} color={active || completed ? colors.surface : colors.textMuted} />
        </ZelligeSeal>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${t(`roadmap.status.${status}`)}, ${t('levelEntry.minutes', { count: durationMinutes })}`}
        accessibilityState={{ disabled: locked, selected: active }}
        disabled={locked}
        onPress={() => onPress(id)}
        style={({ pressed }) => [
          styles.card,
          active && styles.activeCard,
          completed && styles.completedCard,
          locked && styles.lockedCard,
          pressed && !locked && styles.pressed,
        ]}
      >
        <View style={styles.cardCopy}>
          <View style={styles.titleRow}>
            <Text style={[styles.circleLabel, locked && styles.lockedText]}>{t('roadmap.circle', { count: index + 1 })}</Text>
            <View style={[styles.statusPill, completed && styles.completedPill, active && styles.activePill, locked && styles.lockedPill]}>
              <Text style={[styles.statusText, completed && styles.completedStatus, active && styles.activeStatus]}>
                {t(`roadmap.status.${status}`)}
              </Text>
            </View>
          </View>
          <Text style={[styles.title, active && styles.activeTitle, locked && styles.lockedText]}>{title}</Text>
          {description && active ? <Text style={styles.description} numberOfLines={2}>{description}</Text> : null}
          <View style={styles.metaRow}>
            <Ionicons name="book-outline" size={12} color={locked ? colors.locked : colors.textMuted} />
            <Text style={[styles.meta, locked && styles.lockedText]}>{ayahLabel}</Text>
            <View style={styles.metaDot} />
            <Ionicons name="time-outline" size={12} color={locked ? colors.locked : colors.textMuted} />
            <Text style={[styles.meta, locked && styles.lockedText]}>{t('levelEntry.minutes', { count: durationMinutes })}</Text>
          </View>
          {completed ? <Text style={styles.practiceLabel}>{completedActionLabel}</Text> : null}
        </View>
        {!locked ? <Ionicons name="chevron-forward" size={18} color={active ? colors.success : colors.textMuted} /> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', flexDirection: 'row', minHeight: 88, position: 'relative' },
  activeWrapper: { minHeight: 122 },
  connector: { borderColor: colors.gold, borderLeftWidth: 2, borderStyle: 'dashed', bottom: -8, left: 37, position: 'absolute', top: 54, width: 1, zIndex: 0 },
  connectorLocked: { borderColor: colors.borderStrong },
  markerColumn: { alignItems: 'center', justifyContent: 'center', width: 76, zIndex: 2 },
  card: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, boxShadow: shadows.card, flex: 1, flexDirection: 'row', marginVertical: spacing.xs, minHeight: 72, padding: spacing.md },
  activeCard: { borderColor: colors.gold, borderWidth: 1.5, boxShadow: shadows.raised, minHeight: 104 },
  completedCard: { backgroundColor: '#FCFAF4' },
  lockedCard: { backgroundColor: colors.surfaceWarm, boxShadow: 'none' },
  pressed: { opacity: 0.74, transform: [{ scale: 0.992 }] },
  cardCopy: { flex: 1, minWidth: 0 },
  titleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  circleLabel: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' },
  statusPill: { backgroundColor: colors.surfaceMuted, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  completedPill: { backgroundColor: colors.successSoft },
  activePill: { backgroundColor: colors.success },
  lockedPill: { backgroundColor: colors.surfaceMuted },
  statusText: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 8, textTransform: 'uppercase' },
  completedStatus: { color: colors.success },
  activeStatus: { color: colors.surface },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, marginTop: 1 },
  activeTitle: { color: colors.primary, fontSize: 17, lineHeight: 22 },
  description: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 15, marginTop: 2 },
  metaRow: { alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: spacing.xs },
  meta: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 10 },
  metaDot: { backgroundColor: colors.borderStrong, borderRadius: 2, height: 3, marginHorizontal: 2, width: 3 },
  lockedText: { color: colors.locked },
  practiceLabel: { color: colors.success, fontFamily: fonts.bold, fontSize: 9, marginTop: 3, textTransform: 'uppercase' },
});
