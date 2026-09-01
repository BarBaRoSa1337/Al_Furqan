import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Polygon } from 'react-native-svg';
import { colors } from '../../theme/tokens';
import type { RoadmapState } from './surahRoadmapModel';

interface IslamicNodeFrameProps {
  children: React.ReactNode;
  size: number;
  state: RoadmapState;
}

const POINTS = '50,2 61,13 76,8 82,24 98,30 87,43 98,57 82,65 85,82 68,84 57,98 45,87 30,96 24,80 7,74 17,59 3,46 18,36 14,19 32,18';

export default function IslamicNodeFrame({ children, size, state }: IslamicNodeFrameProps) {
  const palette = statePalette(state);
  return (
    <View style={[styles.shell, { height: size, width: size }]}>
      <Svg accessibilityElementsHidden height={size} style={StyleSheet.absoluteFill} viewBox="0 0 100 100" width={size}>
        <Polygon fill={palette.outerFill} points={POINTS} stroke={palette.accent} strokeWidth={state === 'current' ? 2.8 : 1.7} />
        <Circle cx="50" cy="50" fill={palette.innerFill} r="36" stroke={palette.innerStroke} strokeWidth="1.8" />
        <Circle cx="50" cy="50" fill="none" opacity="0.65" r="31" stroke={palette.detail} strokeDasharray="2 3" strokeWidth="1" />
      </Svg>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

export function roadmapForeground(state: RoadmapState): string {
  return state === 'completed' ? colors.surface : state === 'current' ? colors.primary : colors.textMuted;
}

function statePalette(state: RoadmapState) {
  if (state === 'completed') return { outerFill: colors.success, innerFill: colors.success, accent: colors.success, innerStroke: colors.goldSoft, detail: colors.goldSoft };
  if (state === 'current') return { outerFill: colors.surface, innerFill: colors.surface, accent: colors.gold, innerStroke: colors.success, detail: colors.gold };
  return { outerFill: colors.surfaceWarm, innerFill: colors.surfaceWarm, accent: colors.borderStrong, innerStroke: colors.border, detail: colors.borderStrong };
}

const styles = StyleSheet.create({
  shell: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  content: { alignItems: 'center', bottom: 0, justifyContent: 'center', left: 0, position: 'absolute', right: 0, top: 0 },
});
