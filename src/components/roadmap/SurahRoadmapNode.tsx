import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, touch } from '../../theme/tokens';
import { useLocalization } from '../../lib/localization/LocalizationProvider';
import IslamicNodeFrame, { roadmapForeground } from './IslamicNodeFrame';
import type { RoadmapState } from './surahRoadmapModel';

interface SurahRoadmapNodeProps {
  id: string;
  arabicName: string;
  localizedName: string;
  showLocalizedName?: boolean;
  highlighted?: boolean;
  direction?: 'ltr' | 'rtl';
  nameSide?: 'left' | 'right';
  state: RoadmapState;
  onPress: (id: string) => void;
}

const SurahRoadmapNode = memo(function SurahRoadmapNode({ id, arabicName, localizedName, showLocalizedName = true, highlighted = false, direction = 'ltr', nameSide = 'right', state, onPress }: SurahRoadmapNodeProps) {
  const { t } = useLocalization();
  const handlePress = useCallback(() => onPress(id), [id, onPress]);
  const statusKey = state === 'current' ? 'active' : state === 'upcoming' ? 'available' : 'completed';
  return (
    <Pressable
      accessibilityHint={t('roadmap.openSurah')}
      accessibilityLabel={[arabicName, showLocalizedName ? localizedName : undefined, t(`roadmap.status.${statusKey}`)].filter(Boolean).join(', ')}
      accessibilityRole="button"
      accessibilityState={{ selected: state === 'current' }}
      onPress={handlePress}
      style={({ pressed }) => [styles.pressable, nameSide === 'left' && styles.nameLeft, highlighted && styles.highlighted, pressed && styles.pressed]}
    >
      <IslamicNodeFrame size={88} state={state}>
        <Text accessibilityLanguage="ar" adjustsFontSizeToFit minimumFontScale={0.62} numberOfLines={2} style={[styles.arabic, { color: roadmapForeground(state) }]}>{arabicName}</Text>
      </IslamicNodeFrame>
      {showLocalizedName ? <View style={styles.nameWrap}>
        <Text numberOfLines={2} style={[styles.name, direction === 'rtl' && styles.nameRtl, state === 'upcoming' && styles.upcomingName]}>{localizedName}</Text>
      </View> : null}
    </Pressable>
  );
});

export default SurahRoadmapNode;

const styles = StyleSheet.create({
  pressable: { alignItems: 'center', flexDirection: 'row', gap: 16, minHeight: touch.minimum, minWidth: touch.minimum },
  nameLeft: { flexDirection: 'row-reverse' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  highlighted: { backgroundColor: colors.goldSoft, borderRadius: 999 },
  arabic: { fontFamily: fonts.arabicMedium, fontSize: 19, lineHeight: 28, maxWidth: 59, textAlign: 'center', writingDirection: 'rtl' },
  nameWrap: { flex: 1, minWidth: 0 },
  name: { color: colors.primary, fontFamily: fonts.bold, fontSize: 18, lineHeight: 23, textAlign: 'left', writingDirection: 'ltr' },
  nameRtl: { textAlign: 'right' },
  upcomingName: { color: colors.textMuted },
});
