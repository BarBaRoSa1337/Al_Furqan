import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalization } from '../../lib/localization/LocalizationProvider';
import { colors, fonts, radii, spacing } from '../../theme/tokens';

export const PREVIEW_INDICATOR_HEIGHT = 26;

export default function PreviewContentIndicator({ label }: { label?: string }) {
  const insets = useSafeAreaInsets();
  const { t } = useLocalization();

  return (
    <View
      accessibilityLabel={label ?? t('content.previewIndicator')}
      accessibilityRole="text"
      pointerEvents="none"
      style={[styles.badge, { top: insets.top + 3 }]}
    >
      <Ionicons color={colors.warning} name="eye-outline" size={13} />
      <Text style={styles.label}>{label ?? t('content.previewIndicator')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.warningSoft,
    borderColor: colors.goldSoft,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 20,
    paddingHorizontal: spacing.sm,
    position: 'absolute',
    zIndex: 100,
  },
  label: { color: colors.warning, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.35 },
});
