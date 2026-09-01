import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/tokens';
import type { RoadmapState } from './surahRoadmapModel';

interface RoadmapPathProps {
  state: RoadmapState;
  fromX?: number;
  toX?: number;
  showLeaves?: boolean;
}

export default function RoadmapPath({ state, fromX = 50, toX = 50, showLeaves = true }: RoadmapPathProps) {
  const stroke = state === 'completed' ? colors.success : state === 'current' ? colors.gold : colors.borderStrong;
  const middleX = (fromX + toX) / 2;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg accessible={false} height="100%" preserveAspectRatio="none" viewBox="0 0 100 140" width="100%">
        <Path d={`M ${fromX} 0 C ${fromX - 7} 42, ${middleX + 10} 89, ${toX} 140`} fill="none" opacity={state === 'upcoming' ? 0.5 : 0.8} stroke={stroke} strokeLinecap="round" strokeWidth="1.8" />
        {showLeaves ? <>
          <Path d={`M ${middleX} 67 C ${middleX - 13} 55, ${middleX - 20} 61, ${middleX - 17} 69 C ${middleX - 10} 72, ${middleX - 5} 71, ${middleX} 67 Z`} fill={colors.background} stroke={stroke} strokeWidth="1" />
          <Path d={`M ${middleX + 1} 85 C ${middleX + 13} 73, ${middleX + 20} 79, ${middleX + 17} 87 C ${middleX + 10} 91, ${middleX + 5} 89, ${middleX + 1} 85 Z`} fill={colors.background} stroke={stroke} strokeWidth="1" />
        </> : null}
      </Svg>
    </View>
  );
}
