import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, touch } from '../../theme/tokens';
import { useLocalization } from '../../lib/localization/LocalizationProvider';
import IslamicNodeFrame, { roadmapForeground } from './IslamicNodeFrame';
import type { RoadmapState } from './surahRoadmapModel';

interface AyahRoadmapNodeProps {
  ayahNumber: number;
  state: RoadmapState;
  targetLevelId: string;
  onPress: (levelId: string) => void;
  selected?: boolean;
}

const AyahRoadmapNode = memo(function AyahRoadmapNode({ ayahNumber, state, targetLevelId, onPress, selected = false }: AyahRoadmapNodeProps) {
  const { t } = useLocalization();
  const handlePress = useCallback(() => onPress(targetLevelId), [onPress, targetLevelId]);
  const statusKey = state === 'current' ? 'active' : state === 'upcoming' ? 'available' : 'completed';
  return (
    <Pressable
      accessibilityLabel={`${t('home.ayah', { ayah: ayahNumber })}, ${t(`roadmap.status.${statusKey}`)}`}
      accessibilityRole="button"
      accessibilityState={{ selected: selected || state === 'current' }}
      disabled={!targetLevelId}
      onPress={handlePress}
      style={({ pressed }) => [styles.pressable, selected && styles.selected, pressed && styles.pressed]}
    >
      <IslamicNodeFrame size={68} state={state}>
        <Text style={[styles.number, { color: roadmapForeground(state) }]}>{ayahNumber}</Text>
      </IslamicNodeFrame>
    </Pressable>
  );
});

export default AyahRoadmapNode;

const styles = StyleSheet.create({
  pressable: { alignItems: 'center', justifyContent: 'center', minHeight: touch.minimum, minWidth: touch.minimum },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  selected: { backgroundColor: colors.goldSoft, borderRadius: 999 },
  number: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, textAlign: 'center' },
});
