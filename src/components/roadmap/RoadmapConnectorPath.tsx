import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../../theme/tokens';
import type { SurahRoadmapState } from './surahRoadmapModel';

interface RoadmapConnectorPathProps {
  width: number;
  height: number;
  fromX: number;
  toX: number;
  tone: SurahRoadmapState;
  decorative?: boolean;
}

export default function RoadmapConnectorPath({ width, height, fromX, toX, tone, decorative = true }: RoadmapConnectorPathProps) {
  const stroke = tone === 'completed' ? colors.success : tone === 'current' ? colors.gold : colors.borderStrong;
  const startY = 96;
  const endY = height + 88;
  const middleY = (startY + endY) / 2;
  const middleX = (fromX + toX) / 2;
  const direction = toX > fromX ? 1 : -1;
  const path = [
    `M ${fromX} ${startY}`,
    `C ${fromX + direction * 7} ${startY + 64}, ${middleX - direction * 48} ${middleY - 32}, ${middleX} ${middleY}`,
    `C ${middleX + direction * 48} ${middleY + 32}, ${toX - direction * 7} ${endY - 64}, ${toX} ${endY}`,
  ].join(' ');
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={[styles.shell, { height: height + 110, width }]}>
      <Svg accessible={false} height={height + 110} width={width}>
        <Path d={path} fill="none" opacity={tone === 'future' ? 0.46 : 0.76} stroke={stroke} strokeLinecap="round" strokeWidth={2.25} />
        {decorative ? <>
          <Circle cx={middleX - 7} cy={middleY} fill={colors.background} r={3.5} stroke={stroke} strokeWidth={1.2} />
          <Circle cx={middleX + 3} cy={middleY} fill={stroke} opacity={0.55} r={2} />
          <Path d={`M ${middleX + 11} ${middleY + 4}c8-8 14-6 16-4-7 6-12 7-16 4z`} fill={colors.background} stroke={stroke} strokeWidth={1.1} />
        </> : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { left: 0, position: 'absolute', top: 0 },
});
