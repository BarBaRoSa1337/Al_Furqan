import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/tokens';
import type { RoadmapState } from './surahRoadmapModel';
import { roadmapControlX } from './roadmapGeometry';

interface RoadmapPathProps {
  state: RoadmapState;
  fromX: number;
  toX: number;
  width?: number;
  height?: number;
  index?: number;
  /** Legacy call-site compatibility. Decoration was removed from roadmap paths. */
  showLeaves?: boolean;
}

export default function RoadmapPath({ state, fromX, toX, width = 100, height = 140, index = 0 }: RoadmapPathProps) {
  const stroke = state === 'completed' ? colors.success : state === 'current' ? colors.gold : colors.borderStrong;
  const controlX = roadmapControlX(fromX, toX, index, width);
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg accessible={false} height="100%" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`} width="100%">
        <Path d={`M ${fromX} 0 C ${controlX} ${height * 0.34}, ${controlX} ${height * 0.66}, ${toX} ${height}`} fill="none" opacity={state === 'upcoming' ? 0.46 : 0.76} stroke={stroke} strokeLinecap="round" strokeWidth="1.6" />
      </Svg>
    </View>
  );
}
