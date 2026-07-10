import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'success' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary: { bg: '#1B4F72', text: '#FFFFFF' },
  secondary: { bg: '#FDFAF6', text: '#1B4F72', border: '#1B4F72' },
  ghost: { bg: 'transparent', text: '#1B4F72' },
  success: { bg: '#1E8449', text: '#FFFFFF' },
  danger: { bg: '#C0392B', text: '#FFFFFF' },
};

const SIZE_STYLES: Record<ButtonSize, { padding: number; fontSize: number; radius: number }> = {
  sm: { padding: 8, fontSize: 14, radius: 8 },
  md: { padding: 14, fontSize: 16, radius: 12 },
  lg: { padding: 18, fontSize: 18, radius: 14 },
};

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const v = VARIANT_STYLES[variant];
  const s = SIZE_STYLES[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          padding: s.padding,
          borderRadius: s.radius,
          borderWidth: v.border ? 1.5 : 0,
          borderColor: v.border ?? 'transparent',
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <Text style={[styles.text, { color: v.text, fontSize: s.fontSize }, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default Button;
