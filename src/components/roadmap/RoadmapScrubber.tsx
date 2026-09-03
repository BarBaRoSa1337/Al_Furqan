import * as Haptics from 'expo-haptics';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, touch } from '../../theme/tokens';

export interface RoadmapScrubberItem { id: string; label: string; listIndex: number; }

interface RoadmapScrubberProps {
  accessibilityLabel: string;
  items: readonly RoadmapScrubberItem[];
  onSelect: (listIndex: number) => void;
}

const RoadmapScrubber = memo(function RoadmapScrubber({ accessibilityLabel, items, onSelect }: RoadmapScrubberProps) {
  const [height, setHeight] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [active, setActive] = useState(false);
  const activeIndexRef = useRef(0);
  const lastHapticAt = useRef(0);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const opacity = useRef(new Animated.Value(0.3)).current;

  const show = useCallback(() => {
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    Animated.timing(opacity, { duration: 120, toValue: 1, useNativeDriver: true }).start();
  }, [opacity]);
  const scheduleFade = useCallback(() => {
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => Animated.timing(opacity, { duration: 320, toValue: 0.3, useNativeDriver: true }).start(), 1100);
  }, [opacity]);
  useEffect(() => () => { if (fadeTimer.current) clearTimeout(fadeTimer.current); }, []);

  const updateAt = useCallback((y: number) => {
    if (!items.length) return;
    const index = scrubberIndexForPosition(y, height, items.length);
    if (index === activeIndexRef.current) return;
    activeIndexRef.current = index;
    setActiveIndex(index);
    const now = Date.now();
    if (Platform.OS !== 'web' && now - lastHapticAt.current > 80) {
      lastHapticAt.current = now;
      void Haptics.selectionAsync();
    }
  }, [height, items.length]);
  const commit = useCallback(() => {
    const item = items[activeIndexRef.current];
    if (item) onSelect(item.listIndex);
    setActive(false);
    scheduleFade();
  }, [items, onSelect, scheduleFade]);

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => items.length > 0,
    onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dy) > 2,
    onPanResponderGrant: event => { setActive(true); show(); updateAt(event.nativeEvent.locationY); },
    onPanResponderMove: event => updateAt(event.nativeEvent.locationY),
    onPanResponderRelease: commit,
    onPanResponderTerminate: commit,
  }), [commit, items.length, show, updateAt]);

  const selectAccessible = useCallback((next: number) => {
    if (!items.length) return;
    const index = Math.min(Math.max(next, 0), items.length - 1);
    activeIndexRef.current = index;
    setActiveIndex(index);
    onSelect(items[index].listIndex);
    show();
    scheduleFade();
  }, [items, onSelect, scheduleFade, show]);
  const selected = items[activeIndex];
  const thumbTop = items.length > 1 ? (activeIndex / (items.length - 1)) * Math.max(height - 20, 0) : 0;

  if (!items.length) return null;
  return (
    <Animated.View
      {...responder.panHandlers}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, { name: 'activate' }]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="adjustable"
      accessibilityValue={{ text: selected?.label }}
      onAccessibilityAction={event => {
        if (event.nativeEvent.actionName === 'increment') selectAccessible(activeIndexRef.current + 1);
        if (event.nativeEvent.actionName === 'decrement') selectAccessible(activeIndexRef.current - 1);
        if (event.nativeEvent.actionName === 'activate') selectAccessible(activeIndexRef.current);
      }}
      onLayout={event => setHeight(Math.max(event.nativeEvent.layout.height, 1))}
      style={[styles.touchArea, { opacity }]}
    >
      {active && selected ? <View pointerEvents="none" style={[styles.tooltip, { top: Math.max(0, Math.min(thumbTop - 8, height - 34)) }]}><Text numberOfLines={1} style={styles.tooltipText}>{selected.label}</Text></View> : null}
      <View pointerEvents="none" style={[styles.track, active && styles.trackActive]} />
      <View pointerEvents="none" style={[styles.thumb, active && styles.thumbActive, { top: thumbTop }]} />
    </Animated.View>
  );
});

export default RoadmapScrubber;

export function scrubberIndexForPosition(y: number, height: number, count: number): number {
  if (count <= 1 || height <= 0) return 0;
  const ratio = Math.min(Math.max(y / height, 0), 1);
  return Math.round(ratio * (count - 1));
}

const styles = StyleSheet.create({
  touchArea: { alignItems: 'center', bottom: 20, justifyContent: 'center', minWidth: touch.minimum, position: 'absolute', right: 0, top: 76, zIndex: 20 },
  track: { backgroundColor: colors.borderStrong, borderRadius: radii.pill, bottom: 0, position: 'absolute', right: 10, top: 0, width: 2 },
  trackActive: { backgroundColor: colors.gold, width: 4 },
  thumb: { backgroundColor: colors.success, borderColor: colors.surface, borderRadius: 10, borderWidth: 2, height: 20, position: 'absolute', right: 1, width: 20 },
  thumbActive: { borderColor: colors.gold, transform: [{ scale: 1.12 }] },
  tooltip: { backgroundColor: colors.primary, borderRadius: radii.md, maxWidth: 170, minHeight: 34, paddingHorizontal: 10, position: 'absolute', right: 30, justifyContent: 'center' },
  tooltipText: { color: colors.surface, fontFamily: fonts.bold, fontSize: 13, textAlign: 'center' },
});
