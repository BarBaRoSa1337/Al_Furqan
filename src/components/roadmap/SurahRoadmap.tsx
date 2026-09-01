import React, { useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../theme/tokens';
import RoadmapPath from './RoadmapPath';
import SurahRoadmapNode from './SurahRoadmapNode';
import type { SurahRoadmapItem } from './surahRoadmapModel';

interface SurahRoadmapProps {
  items: readonly SurahRoadmapItem[];
  onSelectSurah: (id: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  header?: React.ReactElement | null;
  direction?: 'ltr' | 'rtl';
}

export default function SurahRoadmap({ items, onSelectSurah, onRefresh, refreshing = false, header, direction = 'ltr' }: SurahRoadmapProps) {
  const renderItem = useCallback(({ item, index }: { item: SurahRoadmapItem; index: number }) => {
    const offset = [0, 7, -3, 5][index % 4];
    const mirroredOffset = direction === 'rtl' ? -offset : offset;
    const pathX = direction === 'rtl' ? 82 - offset / 5 : 18 + offset / 5;
    const nextOffset = [0, 7, -3, 5][(index + 1) % 4];
    const nextPathX = direction === 'rtl' ? 82 - nextOffset / 5 : 18 + nextOffset / 5;
    return (
      <View style={styles.row}>
        {index < items.length - 1 ? <View style={styles.connector}><RoadmapPath fromX={pathX} showLeaves={index % 2 === 0} state={item.state} toX={nextPathX} /></View> : null}
        <View style={[styles.node, direction === 'rtl' && styles.nodeRtl, { transform: [{ translateX: mirroredOffset }] }]}>
          <SurahRoadmapNode arabicName={item.arabicName} englishName={item.englishName} id={item.id} onPress={onSelectSurah} state={item.state} />
        </View>
      </View>
    );
  }, [direction, items.length, onSelectSurah]);

  return (
    <FlatList
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      data={items as SurahRoadmapItem[]}
      initialNumToRender={7}
      keyExtractor={keyExtractor}
      ListHeaderComponent={header}
      maxToRenderPerBatch={8}
      refreshControl={onRefresh ? <RefreshControl onRefresh={onRefresh} refreshing={refreshing} tintColor={colors.success} /> : undefined}
      removeClippedSubviews
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      windowSize={7}
    />
  );
}

function keyExtractor(item: SurahRoadmapItem): string { return item.id; }

const styles = StyleSheet.create({
  content: { alignSelf: 'center', maxWidth: 680, paddingBottom: spacing.xxl, paddingHorizontal: spacing.lg, width: '100%' },
  row: { justifyContent: 'center', minHeight: 128, position: 'relative' },
  connector: { bottom: -47, left: 0, position: 'absolute', right: 0, top: 76 },
  node: { alignSelf: 'stretch', paddingEnd: spacing.xl, zIndex: 1 },
  nodeRtl: { paddingEnd: 0, paddingStart: spacing.xl },
});
