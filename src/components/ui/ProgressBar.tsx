import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, radii } from '../../theme/tokens';

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  color?: string;
  height?: number;
  showLabel?: boolean;
  accessibilityLabel?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  label,
  color = colors.primary,
  height = 8,
  showLabel = true,
  accessibilityLabel,
}) => {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      style={styles.wrapper}
    >
      {showLabel && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label ?? `${current} / ${total}`}</Text>
          <Text style={[styles.pct, { color }]}>{pct}%</Text>
        </View>
      )}
      <View style={[styles.track, { height }]}>
        <View
          style={[
            styles.fill,
            { width: `${pct}%`, backgroundColor: color, height, borderRadius: height / 2 },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, fontWeight: '500' },
  pct: { fontFamily: fonts.bold, fontSize: 13, fontWeight: '700' },
  track: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 99,
  },
});

export default ProgressBar;
