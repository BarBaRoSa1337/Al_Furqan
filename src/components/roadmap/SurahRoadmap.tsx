import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import SurahIllustration from './SurahIllustration';
import RoadmapConnectorPath from './RoadmapConnectorPath';
import SurahRoadmapNode from './SurahRoadmapNode';
import type { SurahRoadmapItem } from './surahRoadmapModel';

interface SurahRoadmapProps {
  items: readonly SurahRoadmapItem[];
  onSelectSurah: (id: string) => void;
}

export default function SurahRoadmap({ items, onSelectSurah }: SurahRoadmapProps) {
  const [width, setWidth] = useState(320);
  const reducedMotion = useReducedMotion();
  const wide = width >= 700;
  const rowHeight = wide ? 226 : 210;
  const nodeWidth = wide ? 172 : 148;
  const centers = wide ? [width * 0.27, width * 0.73] : [width * 0.34, width * 0.66];

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== width) setWidth(nextWidth);
  };

  return (
    <View onLayout={handleLayout} style={[styles.roadmap, { minHeight: items.length * rowHeight + 20 }]}>
      {items.map((item, index) => {
        const lane = index % 2;
        const nextLane = (index + 1) % 2;
        const centerX = centers[lane];
        const illustrationSize = wide ? 84 : 64;
        const illustrationLeft = lane === 0
          ? Math.min(width - illustrationSize, centerX + nodeWidth / 2 + 14)
          : Math.max(0, centerX - nodeWidth / 2 - illustrationSize - 14);
        return (
          <View key={item.id} style={[styles.row, { height: rowHeight, top: index * rowHeight, width }]}>
            {index < items.length - 1 ? (
              <RoadmapConnectorPath
                decorative={index % 3 !== 1}
                fromX={centerX}
                height={rowHeight}
                toX={centers[nextLane]}
                tone={item.state}
                width={width}
              />
            ) : null}
            <AnimatedRoadmapItem delay={Math.min(index * 35, 245)} reducedMotion={reducedMotion}>
              <View style={[styles.nodePosition, { left: centerX - nodeWidth / 2 }]}>
                <SurahRoadmapNode item={item} onPress={onSelectSurah} width={nodeWidth} />
              </View>
              <View style={[styles.illustrationPosition, { left: illustrationLeft, top: wide ? 68 : 72 }]}>
                <SurahIllustration illustrationKey={item.illustrationKey} muted={item.state === 'future'} size={illustrationSize} />
              </View>
            </AnimatedRoadmapItem>
          </View>
        );
      })}
    </View>
  );
}

function AnimatedRoadmapItem({ children, delay, reducedMotion }: { children: React.ReactNode; delay: number; reducedMotion: boolean }) {
  const progress = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      delay,
      duration: 220,
      toValue: 1,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, progress, reducedMotion]);
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [7, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  roadmap: { alignSelf: 'stretch', position: 'relative' },
  row: { left: 0, position: 'absolute' },
  nodePosition: { position: 'absolute', top: 18, zIndex: 2 },
  illustrationPosition: { position: 'absolute', zIndex: 1 },
});
