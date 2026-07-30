import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, shadows, spacing } from '../../theme/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  variant?: 'default' | 'ayah' | 'tafsir' | 'story' | 'quiz';
}

const VARIANT_ACCENT: Record<string, string> = {
  default: 'transparent',
  ayah: colors.primary,
  tafsir: colors.warning,
  story: colors.success,
  quiz: colors.primary,
};

const Card: React.FC<CardProps> = ({ children, style, elevated = true, variant = 'default' }) => {
  const accent = VARIANT_ACCENT[variant];

  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        variant !== 'default' && { borderLeftWidth: 4, borderLeftColor: accent },
        style,
      ]}
    >
      {children}
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
  elevated: {
    boxShadow: shadows.card,
  },
});

export default Card;
