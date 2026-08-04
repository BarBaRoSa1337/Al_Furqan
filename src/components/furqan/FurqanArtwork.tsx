import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, radii } from '../../theme/tokens';

export function FurqanMark({ size = 44 }: { size?: number }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.mark, { height: size, width: size }]}>
      <Ionicons name="book-outline" size={size * 0.58} color={colors.primary} />
      <View style={styles.markMoon}>
        <Ionicons name="moon" size={size * 0.23} color={colors.gold} />
      </View>
    </View>
  );
}

export function ZelligeSeal({
  children,
  size = 62,
  tone = 'active',
}: {
  children?: React.ReactNode;
  size?: number;
  tone?: 'active' | 'completed' | 'locked' | 'gold';
}) {
  const toneColor = tone === 'completed'
    ? colors.success
    : tone === 'locked'
      ? colors.locked
      : tone === 'gold'
        ? colors.gold
        : colors.primary;
  return (
    <View style={[styles.seal, { height: size, width: size }]}>
      <View style={[styles.sealDiamond, { borderColor: toneColor }]} />
      <View style={[styles.sealCircle, { backgroundColor: toneColor, borderRadius: size / 2 }]}>
        {children}
      </View>
    </View>
  );
}

export function CourseArtwork({
  variant,
  size = 72,
}: {
  variant: 'quran' | 'lantern' | 'stories' | 'profile';
  size?: number;
}) {
  const icon = variant === 'quran'
    ? 'book-outline'
    : variant === 'lantern'
      ? 'flame-outline'
      : variant === 'stories'
        ? 'moon-outline'
        : 'person-outline';
  const tint = variant === 'lantern' ? colors.goldSoft : colors.primarySoft;
  const foreground = variant === 'lantern' ? colors.warning : colors.primary;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.artwork, { backgroundColor: tint, height: size, width: size }]}>
      <View style={styles.artArch}>
        <Ionicons name={icon} size={size * 0.42} color={foreground} />
      </View>
      <View style={[styles.artFloor, { backgroundColor: foreground }]} />
    </View>
  );
}

export function MoroccanBackdrop({ inverted = false }: { inverted?: boolean }) {
  const stroke = inverted ? colors.goldSoft : colors.gold;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backdrop]}>
      <MoroccanCorner stroke={stroke} style={styles.cornerTop} />
      <MoroccanCorner stroke={stroke} style={styles.cornerRight} />
      <MoroccanCorner stroke={stroke} style={styles.cornerBottom} />
    </View>
  );
}

function MoroccanCorner({ stroke, style }: { stroke: string; style: object }) {
  return (
    <View style={[styles.cornerPattern, style]}>
      <Svg accessible={false} height="100%" viewBox="0 0 120 120" width="100%">
        <Path d="M60 5l13 27 30-10-10 30 27 13-27 13 10 30-30-10-13 27-13-27-30 10 10-30L0 65l27-13-10-30 30 10z" fill="none" stroke={stroke} strokeWidth="1.2" />
        <Path d="M60 25l9 18 20-7-7 20 18 9-18 9 7 20-20-7-9 18-9-18-20 7 7-20-18-9 18-9-7-20 20 7z" fill="none" stroke={stroke} strokeWidth="1" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  markMoon: { position: 'absolute', right: 0, top: 0 },
  seal: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  sealDiamond: { borderRadius: 8, borderWidth: 2, height: '72%', position: 'absolute', transform: [{ rotate: '45deg' }], width: '72%' },
  sealCircle: { alignItems: 'center', borderColor: colors.surface, borderWidth: 4, height: '82%', justifyContent: 'center', width: '82%' },
  artwork: { alignItems: 'center', borderRadius: radii.lg, justifyContent: 'center', overflow: 'hidden' },
  artArch: { alignItems: 'center', borderColor: colors.borderStrong, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, height: '70%', justifyContent: 'center', width: '62%' },
  artFloor: { borderRadius: radii.pill, bottom: 9, height: 3, opacity: 0.7, position: 'absolute', width: '55%' },
  backdrop: { overflow: 'hidden' },
  cornerPattern: { height: 150, opacity: 0.1, position: 'absolute', width: 150 },
  cornerTop: { right: -74, top: 112 },
  cornerRight: { right: -86, top: 520, transform: [{ rotate: '24deg' }] },
  cornerBottom: { bottom: 82, left: -78, transform: [{ rotate: '-18deg' }] },
});
