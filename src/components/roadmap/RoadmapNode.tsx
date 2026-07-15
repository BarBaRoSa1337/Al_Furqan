import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export type NodeStatus = 'completed' | 'active' | 'locked';

interface RoadmapNodeProps {
  id: string;
  title: string;
  description?: string;
  status: NodeStatus;
  index: number;
  onPress: (id: string) => void;
  isLast?: boolean;
}

const STATUS_COLORS: Record<NodeStatus, { bg: string; border: string; icon: string; text: string }> = {
  completed: { bg: '#1E8449', border: '#1E8449', icon: '✓', text: '#FFFFFF' },
  active: { bg: '#1B4F72', border: '#1B4F72', icon: '▶', text: '#FFFFFF' },
  locked: { bg: '#E8E8E8', border: '#CCC', icon: '🔒', text: '#AAA' },
};

const RoadmapNode: React.FC<RoadmapNodeProps> = ({
  id,
  title,
  description,
  status,
  index,
  onPress,
  isLast = false,
}) => {
  const colors = STATUS_COLORS[status];
  const isLocked = status === 'locked';

  return (
    <View style={styles.wrapper}>
      {/* Connector line */}
      {!isLast && <View style={[styles.connector, isLocked && styles.connectorLocked]} />}

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${status}`}
        accessibilityState={{ disabled: isLocked, selected: status === 'active' }}
        style={styles.row}
        onPress={() => !isLocked && onPress(id)}
        activeOpacity={isLocked ? 1 : 0.8}
        disabled={isLocked}
      >
        {/* Circle indicator */}
        <View
          style={[
            styles.circle,
            { backgroundColor: colors.bg, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.icon, { color: colors.text }]}>{colors.icon}</Text>
        </View>

        {/* Text content */}
        <View style={styles.content}>
          <Text style={[styles.title, isLocked && styles.lockedText]}>{title}</Text>
          {description ? (
            <Text style={[styles.desc, isLocked && styles.lockedText]} numberOfLines={2}>
              {description}
            </Text>
          ) : null}
        </View>

        {/* Status chip */}
        {status === 'completed' && (
          <View style={styles.chip}>
            <Text style={styles.chipText}>Done</Text>
          </View>
        )}
        {status === 'active' && (
          <View style={[styles.chip, styles.chipActive]}>
            <Text style={[styles.chipText, styles.chipTextActive]}>Start</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { position: 'relative', marginBottom: 4 },
  connector: {
    position: 'absolute',
    left: 21,
    top: 44,
    width: 2,
    height: 36,
    backgroundColor: '#1B4F72',
    zIndex: 0,
  },
  connectorLocked: { backgroundColor: '#DDD' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  icon: { fontSize: 16, fontWeight: '700' },
  content: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  desc: { fontSize: 13, color: '#666', lineHeight: 18 },
  lockedText: { color: '#AAA' },
  chip: {
    backgroundColor: '#D5F5E3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  chipText: { fontSize: 12, color: '#1E8449', fontWeight: '700' },
  chipActive: { backgroundColor: '#D6EAF8' },
  chipTextActive: { color: '#1B4F72' },
});

export default RoadmapNode;
