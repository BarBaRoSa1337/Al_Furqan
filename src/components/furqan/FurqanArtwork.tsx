import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
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
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.cornerPattern, inverted && styles.cornerPatternInverted, styles.cornerTop]} />
      <View style={[styles.cornerPattern, inverted && styles.cornerPatternInverted, styles.cornerRight]} />
      <View style={[styles.cornerPattern, inverted && styles.cornerPatternInverted, styles.cornerBottom]} />
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
  cornerPattern: { borderColor: colors.gold, borderRadius: 18, borderWidth: 1, height: 110, opacity: 0.09, position: 'absolute', transform: [{ rotate: '45deg' }], width: 110 },
  cornerPatternInverted: { borderColor: colors.goldSoft, opacity: 0.18 },
  cornerTop: { right: -58, top: 120 },
  cornerRight: { right: -68, top: 460 },
  cornerBottom: { bottom: 80, left: -70 },
});
