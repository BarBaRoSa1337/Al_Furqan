import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  variant?: 'default' | 'ayah' | 'tafsir' | 'story' | 'quiz';
}

const VARIANT_ACCENT: Record<string, string> = {
  default: 'transparent',
  ayah: '#1B4F72',
  tafsir: '#7D6608',
  story: '#1E8449',
  quiz: '#6C3483',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});

export default Card;
