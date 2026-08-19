import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, shadows, spacing } from '../../theme/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  elevated?: boolean;
  variant?: 'default' | 'ayah' | 'tafsir' | 'story' | 'quiz' | 'mushaf';
}

const VARIANT_ACCENT: Record<string, string> = {
  default: 'transparent',
  ayah: colors.primary,
  tafsir: colors.warning,
  story: colors.success,
  quiz: colors.primary,
  mushaf: colors.mushafGold,
};

const Card: React.FC<CardProps> = ({ children, style, elevated = true, variant = 'default' }) => {
  const accent = VARIANT_ACCENT[variant];
  const isMushaf = variant === 'mushaf';

  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        isMushaf ? styles.mushafCard : (variant !== 'default' && { borderLeftWidth: 4, borderLeftColor: accent }),
        style,
      ]}
    >
      {isMushaf ? (
        <View style={styles.mushafInnerFrame}>
          {children}
        </View>
      ) : children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  mushafCard: {
    backgroundColor: colors.mushafPaper,
    borderColor: colors.mushafBorder,
    borderWidth: 1.5,
    borderRadius: radii.xl,
    padding: spacing.sm,
  },
  mushafInnerFrame: {
    borderColor: colors.mushafBorderInner,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  elevated: {
    boxShadow: shadows.card,
  },
});

export default Card;
