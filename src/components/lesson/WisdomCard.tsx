import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import type { ContentRepository, SummaryLevelBlock } from '../../types/content';
import { packageText } from '../../lib/content/text';
import { colors, fonts, radii, spacing, touch } from '../../theme/tokens';
import Card from '../ui/Card';

interface WisdomCardProps {
  block: SummaryLevelBlock;
  repo: ContentRepository;
}

export default function WisdomCard({ block, repo }: WisdomCardProps) {
  const sources = block.sourceIds
    .map(sourceId => repo.getSourceById(sourceId)?.name ?? packageText(repo, 'content.sourceUnavailable'))
    .join(', ');

  async function shareWisdom() {
    await Share.share({
      message: buildWisdomShareMessage(block, packageText(repo, 'content.source'), sources),
    });
  }

  return (
    <Card style={styles.card} elevated>
      <View style={styles.eyebrowRow}>
        <View style={styles.eyebrowLine} />
        {block.reviewerStatus === 'approved' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={packageText(repo, 'content.shareWisdom', { title: block.title })}
            onPress={() => { void shareWisdom(); }}
            hitSlop={8}
            style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}
          >
            <Ionicons name="share-outline" size={20} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.title}>{block.title}</Text>
      {block.points.map((point, index) => (
        <View key={`${block.id}-${index}`} style={styles.point}>
          <View style={styles.bullet} />
          <Text style={styles.pointText}>{point}</Text>
        </View>
      ))}
      <Text style={styles.source}>{packageText(repo, 'content.source')}: {sources}</Text>
    </Card>
  );
}

export function buildWisdomShareMessage(block: SummaryLevelBlock, sourceLabel: string, sources: string): string {
  return [block.title, '', ...block.points.map(point => `• ${point}`), '', `${sourceLabel}: ${sources}`].join('\n');
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.xl,
  },
  eyebrowRow: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  eyebrowLine: { width: 48, height: 4, borderRadius: 2, backgroundColor: colors.success },
  shareButton: {
    width: touch.minimum,
    height: touch.minimum,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.65 },
  title: { color: colors.primary, fontFamily: fonts.bold, fontSize: 24, lineHeight: 30, marginBottom: spacing.lg },
  point: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginTop: 8,
    marginRight: spacing.md,
  },
  pointText: { color: colors.text, flex: 1, fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  source: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, marginTop: spacing.md },
});
