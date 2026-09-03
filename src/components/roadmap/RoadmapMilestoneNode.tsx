import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalization } from '../../lib/localization/LocalizationProvider';
import { colors, fonts, radii, spacing, touch } from '../../theme/tokens';
import type { RoadmapMilestoneKind } from './ayahRoadmapModel';
import type { RoadmapState } from './surahRoadmapModel';

interface RoadmapMilestoneNodeProps { kind: RoadmapMilestoneKind; state: RoadmapState; targetLevelId: string; onPress: (levelId: string) => void; }

const RoadmapMilestoneNode = memo(function RoadmapMilestoneNode({ kind, state, targetLevelId, onPress }: RoadmapMilestoneNodeProps) {
  const { t } = useLocalization();
  const label = t(`roadmap.milestone.${kind}`);
  const statusKey = state === 'current' ? 'active' : state === 'completed' ? 'completed' : 'available';
  const handlePress = useCallback(() => onPress(targetLevelId), [onPress, targetLevelId]);
  return (
    <Pressable accessibilityLabel={`${label}, ${t(`roadmap.status.${statusKey}`)}`} accessibilityRole="button" accessibilityState={{ selected: state === 'current' }} onPress={handlePress} style={({ pressed }) => [styles.touch, pressed && styles.pressed]}>
      <View style={[styles.marker, styles[kind], styles[`${state}Marker`]]}>
        <Text numberOfLines={2} style={[styles.label, styles[`${state}Label`]]}>{label}</Text>
      </View>
    </Pressable>
  );
});

export default RoadmapMilestoneNode;

const styles = StyleSheet.create({
  touch: { alignItems: 'center', justifyContent: 'center', minHeight: touch.minimum, minWidth: 176 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  marker: { alignItems: 'center', backgroundColor: colors.surfaceWarm, borderColor: colors.borderStrong, borderWidth: 1, justifyContent: 'center', minHeight: 38, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  intro: { borderRadius: radii.pill },
  context: { borderLeftWidth: 4, borderRadius: radii.sm },
  checkpoint: { borderRadius: radii.md, transform: [{ rotate: '-1deg' }] },
  final_review: { borderColor: colors.gold, borderRadius: radii.pill, borderWidth: 2, minHeight: 44 },
  completedMarker: { backgroundColor: colors.success, borderColor: colors.success },
  currentMarker: { backgroundColor: colors.surface, borderColor: colors.gold, borderWidth: 2 },
  upcomingMarker: { backgroundColor: colors.surfaceWarm },
  label: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, textAlign: 'center' },
  completedLabel: { color: colors.surface },
  currentLabel: { color: colors.primary },
  upcomingLabel: { color: colors.textMuted },
});
