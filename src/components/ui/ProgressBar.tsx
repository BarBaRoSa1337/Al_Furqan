import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  color?: string;
  height?: number;
  showLabel?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  label,
  color = '#1B4F72',
  height = 8,
  showLabel = true,
}) => {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <View style={styles.wrapper}>
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
  label: { fontSize: 13, color: '#555', fontWeight: '500' },
  pct: { fontSize: 13, fontWeight: '700' },
  track: {
    backgroundColor: '#E8E8E8',
    borderRadius: 99,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 99,
  },
});

export default ProgressBar;
