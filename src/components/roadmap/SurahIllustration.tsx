import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon } from 'react-native-svg';
import { colors } from '../../theme/tokens';
import type { SurahIllustrationKey } from './surahRoadmapModel';

interface SurahIllustrationProps {
  illustrationKey: SurahIllustrationKey;
  size?: number;
  muted?: boolean;
}

export default function SurahIllustration({ illustrationKey, size = 72, muted = false }: SurahIllustrationProps) {
  const stroke = muted ? colors.borderStrong : colors.gold;
  const secondary = muted ? colors.locked : colors.primary;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.shell, muted && styles.muted, { height: size, width: size }]}
    >
      <Svg accessible={false} height={size} viewBox="0 0 80 80" width={size}>
        <G fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}>
          {illustration(illustrationKey, secondary)}
        </G>
      </Svg>
    </View>
  );
}

function illustration(key: SurahIllustrationKey, secondary: string): React.ReactNode {
  switch (key) {
    case 'elephant':
      return <>
        <Path d="M17 46c0-13 9-22 23-22 12 0 21 7 21 19v13" />
        <Path d="M59 35c7 1 9 6 7 12-1 4-4 8-8 11" />
        <Path d="M65 47c3 6 2 11-2 14" />
        <Path d="M23 44v18M34 48v14M51 47v15M60 44v18" />
        <Path d="M18 35c-6 0-9 4-9 9 3-2 6-2 9-1" />
        <Circle cx="56" cy="32" fill={secondary} r="1.3" stroke="none" />
        <Path d="M39 26c2 5 7 8 12 8" />
        <Line x1="13" x2="68" y1="64" y2="64" />
      </>;
    case 'caravan':
      return <>
        <Path d="M11 56c7-12 15-17 25-17 8 0 12 4 17 4 6 0 10-3 15-9" />
        <Path d="M23 46c0-7 4-12 11-12 5 0 9 4 9 10" />
        <Path d="M27 35c-2-5 0-9 4-12 0 4 2 7 6 9" />
        <Path d="M24 45v14M39 45v14M52 45v14" />
        <Path d="M58 35c2-5 5-7 9-6-1 4-4 7-8 9" />
        <Circle cx="33" cy="37" fill={secondary} r="1" stroke="none" />
        <Path d="M9 61h61" />
        <Path d="M12 31c5-4 10-5 16-4" stroke={secondary} />
      </>;
    case 'kindness':
      return <>
        <Path d="M13 46c8-3 14-2 20 2l7 4c4 2 8 1 11-2l12-11c3-3 7-2 8 1L54 59c-4 4-10 5-15 3L23 56H13" />
        <Path d="M33 49l10 1c4 0 6 2 6 5-5 2-10 2-15 0" />
        <Path d="M24 31h25l-3 13H27z" />
        <Path d="M29 31c2-6 5-9 8-9s6 3 8 9" />
        <Circle cx="37" cy="25" fill={secondary} r="1.4" stroke="none" />
      </>;
    case 'water':
      return <>
        <Path d="M40 13c7 12 13 20 13 29 0 8-6 14-13 14s-13-6-13-14c0-9 6-17 13-29z" />
        <Path d="M31 43c3 4 7 6 12 5" stroke={secondary} />
        <Path d="M9 62c7-4 13-4 20 0s13 4 20 0 13-4 22 0" />
        <Path d="M15 69c6-3 11-3 17 0s11 3 17 0 11-3 17 0" />
      </>;
    case 'arches':
      return <>
        <Path d="M11 63V38c0-10 8-18 18-18s18 8 18 18v25" />
        <Path d="M33 63V42c0-10 8-18 18-18s18 8 18 18v21" />
        <Path d="M18 63V40c0-6 5-11 11-11s11 5 11 11v23" />
        <Path d="M40 63V44c0-6 5-11 11-11s11 5 11 11v19" />
        <Line stroke={secondary} x1="8" x2="72" y1="64" y2="64" />
      </>;
    case 'gateway':
      return <>
        <Path d="M19 64V31h42v33" />
        <Path d="M25 31V21h30v10" />
        <Path d="M32 64V45c0-7 4-12 8-12s8 5 8 12v19" />
        <Path d="M14 64h52" />
        <Path d="M15 48c-5-10-2-18 7-24M16 40l-6-4M18 33l-5-6" stroke={secondary} />
        <Path d="M65 48c5-10 2-18-7-24M64 40l6-4M62 33l5-6" stroke={secondary} />
      </>;
    case 'fibre':
      return <>
        <Path d="M26 10c4 10 7 19 7 28s-3 20-9 31" />
        <Path d="M54 10c-4 10-7 19-7 28s3 20 9 31" />
        <Path d="M30 18l20 10M31 29l17 10M32 41l17 10M29 54l24 10" />
        <Path d="M21 17c8-5 14-5 19 0M59 17c-8-5-14-5-19 0" stroke={secondary} />
        <Path d="M23 65c10-6 23-6 34 0" />
      </>;
    case 'medallion':
      return <>
        <Polygon points="40,9 48,22 63,17 58,32 71,40 58,48 63,63 48,58 40,71 32,58 17,63 22,48 9,40 22,32 17,17 32,22" />
        <Circle cx="40" cy="40" r="17" stroke={secondary} />
        <Circle cx="40" cy="40" fill={secondary} r="4" stroke="none" />
      </>;
    case 'dawn':
      return <>
        <Path d="M12 57h56" />
        <Path d="M22 57a18 18 0 0 1 36 0" stroke={secondary} />
        <Line x1="40" x2="40" y1="14" y2="27" />
        <Line x1="17" x2="26" y1="25" y2="34" />
        <Line x1="63" x2="54" y1="25" y2="34" />
        <Line x1="9" x2="22" y1="45" y2="45" />
        <Line x1="71" x2="58" y1="45" y2="45" />
        <Path d="M12 65c7-3 13-3 20 0s13 3 20 0 12-3 18 0" />
      </>;
    case 'shield':
      return <>
        <Path d="M40 10c8 6 17 9 26 10v17c0 16-9 26-26 34C23 63 14 53 14 37V20c9-1 18-4 26-10z" />
        <Path d="M40 20c6 4 11 6 17 7v11c0 10-6 17-17 23-11-6-17-13-17-23V27c6-1 11-3 17-7z" stroke={secondary} />
        <Circle cx="40" cy="39" r="8" />
      </>;
    case 'quran':
      return <>
        <Path d="M11 22c11-4 20-2 29 5v39c-9-7-18-9-29-5z" />
        <Path d="M69 22c-11-4-20-2-29 5v39c9-7 18-9 29-5z" />
        <Line stroke={secondary} x1="40" x2="40" y1="27" y2="66" />
        <Path d="M17 31c6-1 12 1 18 5M63 31c-6-1-12 1-18 5" />
      </>;
  }
}

const styles = StyleSheet.create({
  shell: { alignItems: 'center', justifyContent: 'center' },
  muted: { opacity: 0.48 },
});
