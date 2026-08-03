import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, fonts } from '../../theme/tokens';

interface SurahProgressRingProps {
  completed: number;
  total: number;
  activeIndex?: number;
  surahNumber: number;
  size?: number;
}

export default function SurahProgressRing({ completed, total, activeIndex = completed, surahNumber, size = 92 }: SurahProgressRingProps) {
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = Math.min(7, circumference / Math.max(total, 1) / 4);
  const segment = Math.max(1, circumference / Math.max(total, 1) - gap);

  return (
    <View style={{ height: size, width: size }}>
      <Svg accessibilityElementsHidden height={size} width={size} style={StyleSheet.absoluteFill}>
        {Array.from({ length: Math.max(total, 1) }, (_, index) => {
          const color = index < completed ? colors.success : index === activeIndex ? colors.gold : colors.borderStrong;
          return (
            <Circle
              cx={size / 2}
              cy={size / 2}
              fill="none"
              key={index}
              r={radius}
              rotation={-90 + index * (360 / Math.max(total, 1))}
              origin={`${size / 2}, ${size / 2}`}
              stroke={color}
              strokeDasharray={`${segment} ${circumference - segment}`}
              strokeLinecap="round"
              strokeWidth={strokeWidth}
            />
          );
        })}
      </Svg>
      <View style={styles.seal}>
        <Text style={styles.number}>{surahNumber}</Text>
        <Text style={styles.label}>SURAH</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  seal: { alignItems: 'center', backgroundColor: colors.primarySoft, borderColor: colors.goldSoft, borderRadius: 999, borderWidth: 1, bottom: 13, justifyContent: 'center', left: 13, position: 'absolute', right: 13, top: 13 },
  number: { color: colors.primary, fontFamily: fonts.bold, fontSize: 22, lineHeight: 25 },
  label: { color: colors.success, fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1 },
});
