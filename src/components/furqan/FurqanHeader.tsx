import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, shadows, spacing, touch } from '../../theme/tokens';
import { useLocalization } from '../../lib/localization/LocalizationProvider';

interface FurqanHeaderProps {
  streak: number;
  xp: number;
  onSearch: () => void;
  onProfile: () => void;
  onSettings: () => void;
}

export default function FurqanHeader({ streak, xp, onSearch, onProfile, onSettings }: FurqanHeaderProps) {
  const { t } = useLocalization();
  const [menuOpen, setMenuOpen] = useState(false);
  const choose = (action: () => void) => {
    setMenuOpen(false);
    action();
  };
  return (
    <>
      <View style={styles.header}>
        <View style={styles.side}>
          <Pressable accessibilityLabel={t('nav.menu')} accessibilityRole="button" onPress={() => setMenuOpen(true)} style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}>
            <Ionicons name="menu-outline" size={25} color={colors.primary} />
          </Pressable>
        </View>
        <Text accessibilityRole="header" style={styles.brandName}>الفرقان</Text>
        <View style={styles.stats}>
          <Stat icon="flame" value={streak} label={t('header.dayStreak')} />
          <Stat icon="star-outline" value={xp} label={t('header.points')} />
        </View>
      </View>
      <Modal animationType="fade" onRequestClose={() => setMenuOpen(false)} transparent visible={menuOpen}>
        <View style={styles.modalRoot}>
          <Pressable accessibilityLabel={t('nav.closeMenu')} accessibilityRole="button" onPress={() => setMenuOpen(false)} style={styles.backdrop} />
          <View accessibilityViewIsModal style={styles.menuCard}>
            <MenuItem icon="search-outline" label={t('nav.search')} onPress={() => choose(onSearch)} />
            <MenuItem icon="person-outline" label={t('nav.profile')} onPress={() => choose(onProfile)} />
            <MenuItem icon="settings-outline" label={t('nav.settings')} onPress={() => choose(onSettings)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

function Stat({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: number; label: string }) {
  return (
    <View accessibilityLabel={`${value} ${label}`} style={styles.stat}>
      <Ionicons name={icon} size={13} color={colors.gold} />
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function MenuItem({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}>
      <Ionicons name={icon} size={20} color={colors.success} />
      <Text style={styles.menuLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-between', maxWidth: 680, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, width: '100%' },
  side: { alignItems: 'flex-start', width: 68 },
  menuButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.borderStrong, borderRadius: radii.md, borderWidth: 1, height: touch.minimum, justifyContent: 'center', width: touch.minimum },
  pressed: { opacity: 0.68 },
  brandName: { color: colors.primary, fontFamily: fonts.arabicMedium, fontSize: 30, lineHeight: 42, textAlign: 'center', writingDirection: 'rtl' },
  stats: { alignItems: 'stretch', gap: 3, width: 68 },
  stat: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, flexDirection: 'row', gap: 4, justifyContent: 'center', minHeight: 21, paddingHorizontal: spacing.sm },
  statValue: { color: colors.primary, fontFamily: fonts.bold, fontSize: 11 },
  modalRoot: { flex: 1 },
  backdrop: { backgroundColor: 'rgba(18,63,58,0.18)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  menuCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, boxShadow: shadows.raised, left: spacing.lg, minWidth: 190, overflow: 'hidden', padding: spacing.xs, position: 'absolute', top: 68 },
  menuItem: { alignItems: 'center', borderRadius: radii.md, flexDirection: 'row', gap: spacing.md, minHeight: touch.minimum, paddingHorizontal: spacing.md },
  menuItemPressed: { backgroundColor: colors.successSoft },
  menuLabel: { color: colors.primary, fontFamily: fonts.bold, fontSize: 15 },
});
