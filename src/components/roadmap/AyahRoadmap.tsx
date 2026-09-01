import React, { useCallback, useEffect, useRef } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { spacing } from '../../theme/tokens';
import type { AyahRoadmapItem } from './ayahRoadmapModel';
import AyahRoadmapNode from './AyahRoadmapNode';
import RoadmapPath from './RoadmapPath';

interface AyahRoadmapProps {
  items: readonly AyahRoadmapItem[];
  onSelectLevel: (levelId: string) => void;
  header: React.ReactElement;
  focusAyah?: number;
}

export default function AyahRoadmap({ items, onSelectLevel, header, focusAyah }: AyahRoadmapProps) {
  const listRef = useRef<FlatList<AyahRoadmapItem>>(null);
  useEffect(() => {
    if (!focusAyah || focusAyah < 1 || focusAyah > items.length) return;
    const timer = setTimeout(() => listRef.current?.scrollToIndex({ animated: true, index: focusAyah - 1, viewPosition: 0.35 }), 60);
    return () => clearTimeout(timer);
  }, [focusAyah, items.length]);

  const renderItem = useCallback(({ item, index }: { item: AyahRoadmapItem; index: number }) => {
    const offset = [-10, 7, -5, 10][index % 4];
    const nextOffset = [-10, 7, -5, 10][(index + 1) % 4];
    return (
      <View style={styles.row}>
        {index < items.length - 1 ? <View style={styles.connector}><RoadmapPath fromX={50 + offset / 4} showLeaves={index % 2 === 1} state={item.state} toX={50 + nextOffset / 4} /></View> : null}
        <View style={[styles.node, { transform: [{ translateX: offset }] }]}>
          <AyahRoadmapNode ayahNumber={item.ayahNumber} onPress={onSelectLevel} state={item.state} targetLevelId={item.targetLevelId} />
        </View>
      </View>
    );
  }, [items.length, onSelectLevel]);

  return (
    <FlatList
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      data={items as AyahRoadmapItem[]}
      initialNumToRender={10}
      keyExtractor={keyExtractor}
      ListHeaderComponent={header}
      maxToRenderPerBatch={12}
      onScrollToIndexFailed={({ index }) => listRef.current?.scrollToOffset({ animated: true, offset: Math.max(index * 98, 0) })}
      ref={listRef}
      removeClippedSubviews
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      windowSize={7}
    />
  );
}

function keyExtractor(item: AyahRoadmapItem): string { return item.id; }

const styles = StyleSheet.create({
  content: { alignSelf: 'center', maxWidth: 560, paddingBottom: spacing.xxl, paddingHorizontal: spacing.lg, width: '100%' },
  row: { alignItems: 'center', justifyContent: 'center', minHeight: 98, position: 'relative' },
  connector: { bottom: -38, left: 0, position: 'absolute', right: 0, top: 57 },
  node: { zIndex: 1 },
});
