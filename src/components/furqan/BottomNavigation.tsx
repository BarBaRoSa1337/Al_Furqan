import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing, touch } from '../../theme/tokens';
import { useLocalization } from '../../lib/localization/LocalizationProvider';

export type FurqanTab = 'home' | 'explore' | 'reviews' | 'profile';

const ITEMS: { id: FurqanTab; labelKey: string; route: '/roadmap' | '/discover' | '/review' | '/profile'; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'home', labelKey: 'nav.home', route: '/roadmap', icon: 'home-outline', activeIcon: 'home' },
  { id: 'explore', labelKey: 'nav.explore', route: '/discover', icon: 'compass-outline', activeIcon: 'compass' },
  { id: 'reviews', labelKey: 'nav.reviews', route: '/review', icon: 'reader-outline', activeIcon: 'reader' },
  { id: 'profile', labelKey: 'nav.profile', route: '/profile', icon: 'person-outline', activeIcon: 'person' },
];

export default function BottomNavigation({ active, reviewCount = 0 }: { active: FurqanTab; reviewCount?: number }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLocalization();
  return (
    <View accessibilityRole="tablist" style={[styles.shell, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {ITEMS.map(item => {
        const selected = active === item.id;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityLabel={t(item.labelKey)}
            accessibilityState={{ selected }}
            key={item.id}
            onPress={() => {
              if (!selected) router.replace(item.route);
            }}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <View style={[styles.iconWrap, selected && styles.iconWrapActive]}>
              <Ionicons name={selected ? item.activeIcon : item.icon} size={21} color={selected ? colors.success : colors.textMuted} />
              {item.id === 'reviews' && reviewCount > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{Math.min(reviewCount, 99)}</Text></View> : null}
            </View>
            <Text style={[styles.label, selected && styles.labelActive]}>{t(item.labelKey)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', paddingHorizontal: spacing.sm, paddingTop: spacing.sm },
  item: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: touch.minimum },
  pressed: { opacity: 0.65 },
  iconWrap: { alignItems: 'center', borderRadius: 14, height: 28, justifyContent: 'center', minWidth: 38, position: 'relative' },
  iconWrapActive: { backgroundColor: colors.successSoft },
  badge: { alignItems: 'center', backgroundColor: colors.danger, borderColor: colors.surface, borderRadius: 8, borderWidth: 1, minWidth: 16, paddingHorizontal: 3, position: 'absolute', right: -3, top: -4 },
  badgeText: { color: colors.surface, fontFamily: fonts.bold, fontSize: 8, lineHeight: 13 },
  label: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 10, marginTop: 2 },
  labelActive: { color: colors.success },
});
