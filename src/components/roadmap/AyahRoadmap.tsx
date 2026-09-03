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
  const scrubTo = useCallback((index: number) => listRef.current?.scrollToIndex({ animated: false, index, viewPosition: 0.25 }), []);
  useEffect(() => {
    if (!focusAyah || focusAyah < 1) return;
    const index = findAyahRoadmapIndex(items, focusAyah);
    if (index < 0) return;
    const item = items[index];
    setHighlightedAyahId(item.id);
    const timer = setTimeout(() => listRef.current?.scrollToIndex({ animated: true, index, viewPosition: 0.35 }), 60);
    const highlightTimer = setTimeout(() => setHighlightedAyahId(current => current === item.id ? undefined : current), 1600);
    return () => { clearTimeout(timer); clearTimeout(highlightTimer); };
  }, [focusAyah, items.length]);

  const renderItem = useCallback(({ item, index }: { item: AyahRoadmapItem; index: number }) => {
    const pathX = roadmapNodeX(index, width, 'ayah');
    const nextPathX = roadmapNodeX(index + 1, width, 'ayah');
    return (
      <View style={styles.row}>
        {index < items.length - 1 ? <View style={styles.connector}><RoadmapPath fromX={pathX} height={ROW_HEIGHT} index={index} state={item.state} toX={nextPathX} width={width} /></View> : null}
        <View style={[styles.node, item.kind === 'milestone' && styles.milestoneNode, { left: item.kind === 'ayah' ? pathX - NODE_SIZE / 2 : Math.max(0, Math.min(pathX - 102, width - 204)) }]}>
          {item.kind === 'ayah'
            ? <AyahRoadmapNode ayahNumber={item.ayahNumber} onPress={() => onSelectAyah ? onSelectAyah(item) : onSelectLevel(item.targetLevelId)} selected={selectedAyahId === item.id || highlightedAyahId === item.id} state={item.state} targetLevelId={item.targetLevelId} />
            : <RoadmapMilestoneNode kind={item.milestoneKind} onPress={onSelectLevel} state={item.state} targetLevelId={item.targetLevelId} />}
        </View>
      </View>
    );
  }, [highlightedAyahId, items.length, onSelectAyah, onSelectLevel, selectedAyahId, width]);

  return <View style={styles.root}>
    <FlatList
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      data={items as AyahRoadmapItem[]}
      initialNumToRender={10}
      keyExtractor={keyExtractor}
      ListHeaderComponent={header}
      maxToRenderPerBatch={12}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      onScrollToIndexFailed={({ index }) => listRef.current?.scrollToOffset({ animated: true, offset: Math.max(index * 98, 0) })}
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
  content: { alignSelf: 'center', maxWidth: 560, paddingBottom: spacing.xxl, paddingHorizontal: spacing.sm, width: '100%' },
  row: { height: ROW_HEIGHT, position: 'relative' },
  connector: { height: ROW_HEIGHT, left: 0, position: 'absolute', right: 0, top: NODE_SIZE / 2 },
  node: { position: 'absolute', top: 0, zIndex: 1 },
  milestoneNode: { alignItems: 'center', height: NODE_SIZE, justifyContent: 'center', width: 204 },
});
