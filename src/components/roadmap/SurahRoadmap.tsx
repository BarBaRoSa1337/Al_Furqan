import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../theme/tokens';
import RoadmapPath from './RoadmapPath';
import SurahRoadmapNode from './SurahRoadmapNode';
import type { SurahRoadmapItem } from './surahRoadmapModel';
import { roadmapNodeX } from './roadmapGeometry';
import RoadmapScrubber from './RoadmapScrubber';
import { useLocalization } from '../../lib/localization/LocalizationProvider';

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
  focusSurahId?: string;
}

export default function SurahRoadmap({ items, onSelectSurah, onRefresh, refreshing = false, header, direction = 'ltr', showLocalizedName = true, focusSurahId }: SurahRoadmapProps) {
  const listRef = useRef<FlatList<SurahRoadmapItem>>(null);
  const [width, setWidth] = useState(320);
  const { t } = useLocalization();
  const [highlightedId, setHighlightedId] = useState<string>();
  const scrubberItems = useMemo(() => items.map((item, listIndex) => ({ id: item.id, label: showLocalizedName ? item.localizedName : item.arabicName, listIndex })), [items, showLocalizedName]);
  const focusIndex = useMemo(() => focusSurahId ? items.findIndex(item => item.id === focusSurahId) : -1, [focusSurahId, items]);
  const scrubTo = useCallback((index: number) => listRef.current?.scrollToIndex({ animated: false, index, viewPosition: 0.2 }), []);
  useEffect(() => {
    if (!focusSurahId || focusIndex < 0) return;
    setHighlightedId(focusSurahId);
    const scrollTimer = setTimeout(() => listRef.current?.scrollToIndex({ animated: true, index: focusIndex, viewPosition: 0.3 }), 60);
    const highlightTimer = setTimeout(() => setHighlightedId(current => current === focusSurahId ? undefined : current), 1600);
    return () => { clearTimeout(scrollTimer); clearTimeout(highlightTimer); };
  }, [focusIndex, focusSurahId]);
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
          <SurahRoadmapNode arabicName={item.arabicName} direction={direction} highlighted={highlightedId === item.id} id={item.id} localizedName={item.localizedName} nameSide={nameSide} onPress={onSelectSurah} showLocalizedName={showLocalizedName} state={item.state} />
        </View>
      </View>
    );
  }, [direction, highlightedId, items.length, onSelectSurah, showLocalizedName, width]);

  return <View style={styles.root}>
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      data={items as SurahRoadmapItem[]}
      initialNumToRender={7}
      keyExtractor={keyExtractor}
      ListHeaderComponent={header}
      maxToRenderPerBatch={8}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      onScrollToIndexFailed={({ averageItemLength, index }) => {
        listRef.current?.scrollToOffset({ animated: false, offset: Math.max(index * averageItemLength, 0) });
        setTimeout(() => listRef.current?.scrollToIndex({ animated: true, index, viewPosition: 0.25 }), 80);
      }}
      refreshControl={onRefresh ? <RefreshControl onRefresh={onRefresh} refreshing={refreshing} tintColor={colors.success} /> : undefined}
      removeClippedSubviews
      ref={listRef}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      windowSize={7}
    />
    <RoadmapScrubber accessibilityLabel={t('roadmap.scrubber.surah')} items={scrubberItems} onSelect={scrubTo} />
  </View>;
}

function keyExtractor(item: SurahRoadmapItem): string { return item.id; }

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { alignSelf: 'center', maxWidth: 680, width: '100%' },
  content: { paddingBottom: spacing.xxl },
  row: { height: ROW_HEIGHT, position: 'relative' },
  connector: { height: ROW_HEIGHT, left: 0, position: 'absolute', right: 0, top: NODE_SIZE / 2 },
  node: { position: 'absolute', top: 0, width: NODE_WIDTH, zIndex: 1 },
});
