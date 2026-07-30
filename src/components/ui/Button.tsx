import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { colors, fonts, radii, touch } from '../../theme/tokens';

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
  accessibilityLabel?: string;
}

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary: { bg: colors.primary, text: colors.surface },
  secondary: { bg: colors.surface, text: colors.primary, border: colors.borderStrong },
  ghost: { bg: 'transparent', text: colors.primary },
  success: { bg: colors.success, text: colors.surface },
  danger: { bg: colors.danger, text: colors.surface },
};

const SIZE_STYLES: Record<ButtonSize, { padding: number; fontSize: number; radius: number }> = {
  sm: { padding: 8, fontSize: 14, radius: radii.md },
  md: { padding: 14, fontSize: 16, radius: radii.md },
  lg: { padding: 18, fontSize: 18, radius: radii.lg },
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
  accessibilityLabel,
}) => {
  const v = VARIANT_STYLES[variant];
  const s = SIZE_STYLES[size];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: v.bg,
          padding: s.padding,
          borderRadius: s.radius,
          borderWidth: v.border ? 1.5 : 0,
          borderColor: v.border ?? 'transparent',
          opacity: disabled || loading ? 0.5 : 1,
        },
        pressed && !disabled && !loading && styles.pressed,
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
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: touch.minimum,
  },
  text: {
    fontFamily: fonts.bold,
    letterSpacing: 0.3,
  },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});

export default Button;
