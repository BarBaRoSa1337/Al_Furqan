import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalization } from '../../lib/localization/LocalizationProvider';
import { colors, fonts, radii, spacing } from '../../theme/tokens';
import Button from '../ui/Button';
import type { AyahPreviewData } from './ayahPreviewModel';

interface AyahPreviewSheetProps {
  data?: AyahPreviewData;
  continuing?: boolean;
  onClose: () => void;
  onStart: (levelId: string) => void;
}

export default function AyahPreviewSheet({ data, continuing = false, onClose, onStart }: AyahPreviewSheetProps) {
  const insets = useSafeAreaInsets();
  const { direction, t } = useLocalization();
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={Boolean(data)}>
      <View style={styles.root}>
        <Pressable accessibilityLabel={t('roadmap.preview.close')} accessibilityRole="button" onPress={onClose} style={styles.backdrop} />
        {data ? <View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <View accessibilityElementsHidden style={styles.handle} />
          <Text accessibilityRole="header" style={styles.title}>{t('roadmap.preview.ayah', { number: data.ayahNumber })}</Text>
          <Text style={styles.arabic}>{data.arabicText}</Text>
          {data.translation ? <Text style={[styles.translation, direction === 'rtl' && styles.rtl]}>{data.translation}</Text> : null}
          {data.shortMeaning ? <Text style={[styles.meaning, direction === 'rtl' && styles.rtl]}>{data.shortMeaning}</Text> : null}
          <Button onPress={() => onStart(data.targetLevelId)} style={styles.button} title={t(continuing ? 'roadmap.preview.continue' : 'roadmap.preview.start')} variant="success" />
        </View> : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(18,63,58,0.2)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  sheet: { backgroundColor: colors.surface, borderColor: colors.border, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, borderWidth: 1, gap: spacing.sm, maxHeight: '72%', padding: spacing.lg },
  handle: { alignSelf: 'center', backgroundColor: colors.borderStrong, borderRadius: radii.pill, height: 4, marginBottom: spacing.xs, width: 42 },
  title: { color: colors.gold, fontFamily: fonts.bold, fontSize: 15, textAlign: 'center' },
  arabic: { color: colors.primary, fontFamily: fonts.arabic, fontSize: 27, lineHeight: 45, textAlign: 'right', writingDirection: 'rtl' },
  translation: { color: colors.text, fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, textAlign: 'left' },
  meaning: { backgroundColor: colors.surfaceWarm, borderRadius: radii.md, color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, padding: spacing.md, textAlign: 'left' },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  button: { marginTop: spacing.sm },
});
