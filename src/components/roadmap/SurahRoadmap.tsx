import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../theme/tokens';
import RoadmapPath from './RoadmapPath';
import SurahRoadmapNode from './SurahRoadmapNode';
import type { SurahRoadmapItem } from './surahRoadmapModel';
import { roadmapNodeX } from './roadmapGeometry';

const ROW_HEIGHT = 112;
const NODE_SIZE = 88;
const NODE_WIDTH = 232;

interface SurahRoadmapProps {
  items: readonly SurahRoadmapItem[];
  onSelectSurah: (id: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  header?: React.ReactElement | null;
  direction?: 'ltr' | 'rtl';
  showLocalizedName?: boolean;
}

export default function SurahRoadmap({ items, onSelectSurah, onRefresh, refreshing = false, header, direction = 'ltr', showLocalizedName = true }: SurahRoadmapProps) {
  const [width, setWidth] = useState(320);
  const renderItem = useCallback(({ item, index }: { item: SurahRoadmapItem; index: number }) => {
    const pathX = roadmapNodeX(index, width, 'surah');
    const nextPathX = roadmapNodeX(index + 1, width, 'surah');
    const renderedWidth = showLocalizedName ? NODE_WIDTH : NODE_SIZE;
    const nameSide = pathX < width / 2 ? 'right' : 'left';
    const nodeLeft = !showLocalizedName ? pathX - NODE_SIZE / 2 : nameSide === 'right' ? pathX - NODE_SIZE / 2 : pathX - NODE_WIDTH + NODE_SIZE / 2;
    return (
      <View style={styles.row}>
        {index < items.length - 1 ? <View style={styles.connector}><RoadmapPath fromX={pathX} height={ROW_HEIGHT} index={index} state={item.state} toX={nextPathX} width={width} /></View> : null}
        <View style={[styles.node, { left: Math.max(0, Math.min(nodeLeft, width - renderedWidth)), width: renderedWidth }]}>
          <SurahRoadmapNode arabicName={item.arabicName} direction={direction} id={item.id} localizedName={item.localizedName} nameSide={nameSide} onPress={onSelectSurah} showLocalizedName={showLocalizedName} state={item.state} />
        </View>
      </View>
    );
  }, [direction, items.length, onSelectSurah, showLocalizedName, width]);

  return (
    <FlatList
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      data={items as SurahRoadmapItem[]}
      initialNumToRender={7}
      keyExtractor={keyExtractor}
      ListHeaderComponent={header}
      maxToRenderPerBatch={8}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
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
  content: { alignSelf: 'center', maxWidth: 680, paddingBottom: spacing.xxl, paddingHorizontal: spacing.sm, width: '100%' },
  row: { height: ROW_HEIGHT, position: 'relative' },
  connector: { height: ROW_HEIGHT, left: 0, position: 'absolute', right: 0, top: NODE_SIZE / 2 },
  node: { position: 'absolute', top: 0, width: NODE_WIDTH, zIndex: 1 },
});
