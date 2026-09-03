import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { spacing } from '../../theme/tokens';
import { findAyahRoadmapIndex, type AyahRoadmapItem } from './ayahRoadmapModel';
import AyahRoadmapNode from './AyahRoadmapNode';
import RoadmapPath from './RoadmapPath';
import { roadmapNodeX } from './roadmapGeometry';
import RoadmapMilestoneNode from './RoadmapMilestoneNode';
import RoadmapScrubber from './RoadmapScrubber';
import { useLocalization } from '../../lib/localization/LocalizationProvider';

const ROW_HEIGHT = 86;
const NODE_SIZE = 68;
const MILESTONE_WIDTH = 204;
const SCRUBBER_CLEARANCE = 44;

interface AyahRoadmapProps {
  items: readonly AyahRoadmapItem[];
  onSelectLevel: (levelId: string) => void;
  onSelectAyah?: (item: Extract<AyahRoadmapItem, { kind: 'ayah' }>) => void;
  selectedAyahId?: string;
  header: React.ReactElement;
  focusAyah?: number;
}

export default function AyahRoadmap({ items, onSelectLevel, onSelectAyah, selectedAyahId, header, focusAyah }: AyahRoadmapProps) {
  const listRef = useRef<FlatList<AyahRoadmapItem>>(null);
  const [width, setWidth] = useState(320);
  const [highlightedAyahId, setHighlightedAyahId] = useState<string>();
  const { t } = useLocalization();
  const scrubberItems = useMemo(() => items.flatMap((item, listIndex) => item.kind === 'ayah' ? [{ id: item.id, label: t('roadmap.preview.ayah', { number: item.ayahNumber }), listIndex }] : []), [items, t]);
  const focusIndex = useMemo(() => focusAyah && focusAyah > 0 ? findAyahRoadmapIndex(items, focusAyah) : -1, [focusAyah, items]);
  const focusItemId = focusIndex >= 0 ? items[focusIndex]?.id : undefined;
  const scrubTo = useCallback((index: number) => listRef.current?.scrollToIndex({ animated: false, index, viewPosition: 0.25 }), []);
  useEffect(() => {
    if (focusIndex < 0 || !focusItemId) return;
    const highlightStartTimer = setTimeout(() => setHighlightedAyahId(focusItemId), 0);
    const timer = setTimeout(() => listRef.current?.scrollToIndex({ animated: true, index: focusIndex, viewPosition: 0.35 }), 60);
    const highlightTimer = setTimeout(() => setHighlightedAyahId(current => current === focusItemId ? undefined : current), 1600);
    return () => { clearTimeout(highlightStartTimer); clearTimeout(timer); clearTimeout(highlightTimer); };
  }, [focusIndex, focusItemId]);

  const renderItem = useCallback(({ item, index }: { item: AyahRoadmapItem; index: number }) => {
    const pathX = roadmapNodeX(index, width, 'ayah');
    const nextPathX = roadmapNodeX(index + 1, width, 'ayah');
    return (
      <View style={styles.row}>
        {index < items.length - 1 ? <View style={styles.connector}><RoadmapPath fromX={pathX} height={ROW_HEIGHT} index={index} state={item.state} toX={nextPathX} width={width} /></View> : null}
        <View style={[styles.node, item.kind === 'milestone' && styles.milestoneNode, { left: item.kind === 'ayah' ? pathX - NODE_SIZE / 2 : Math.max(0, Math.min(pathX - MILESTONE_WIDTH / 2, width - MILESTONE_WIDTH - SCRUBBER_CLEARANCE)) }]}>
          {item.kind === 'ayah'
            ? <AyahRoadmapNode ayahNumber={item.ayahNumber} onPress={() => onSelectAyah ? onSelectAyah(item) : onSelectLevel(item.targetLevelId)} selected={selectedAyahId === item.id || highlightedAyahId === item.id} state={item.state} targetLevelId={item.targetLevelId} />
            : <RoadmapMilestoneNode kind={item.milestoneKind} onPress={onSelectLevel} state={item.state} targetLevelId={item.targetLevelId} />}
        </View>
      </View>
    );
  }, [highlightedAyahId, items.length, onSelectAyah, onSelectLevel, selectedAyahId, width]);

  return <View style={styles.root}>
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      data={items as AyahRoadmapItem[]}
      initialNumToRender={10}
      keyExtractor={keyExtractor}
      ListHeaderComponent={header}
      maxToRenderPerBatch={12}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      onScrollToIndexFailed={({ averageItemLength, index }) => {
        listRef.current?.scrollToOffset({ animated: false, offset: Math.max(index * averageItemLength, 0) });
        setTimeout(() => listRef.current?.scrollToIndex({ animated: true, index, viewPosition: 0.25 }), 80);
      }}
      ref={listRef}
      removeClippedSubviews
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      windowSize={7}
    />
    <RoadmapScrubber accessibilityLabel={t('roadmap.scrubber.ayah')} items={scrubberItems} onSelect={scrubTo} />
  </View>;
}

function keyExtractor(item: AyahRoadmapItem): string { return item.id; }

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { alignSelf: 'center', maxWidth: 560, width: '100%' },
  content: { paddingBottom: spacing.xxl },
  row: { height: ROW_HEIGHT, position: 'relative' },
  connector: { height: ROW_HEIGHT, left: 0, position: 'absolute', right: 0, top: NODE_SIZE / 2 },
  node: { position: 'absolute', top: 0, zIndex: 1 },
  milestoneNode: { alignItems: 'center', height: NODE_SIZE, justifyContent: 'center', width: MILESTONE_WIDTH },
});
