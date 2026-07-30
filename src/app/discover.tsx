import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import BottomNavigation from '../components/furqan/BottomNavigation';
import { MoroccanBackdrop } from '../components/furqan/FurqanArtwork';
import Screen from '../components/ui/Screen';
import { useFurqanDashboard } from '../hooks/useFurqanDashboard';
import { getContentRepository } from '../lib/content/repository';
import { packageText } from '../lib/content/text';
import { getAppProgress } from '../lib/progress/storage';
import { isLevelAccessible } from '../lib/progress/lessonAccess';
import { colors, fonts, radii, shadows, spacing } from '../theme/tokens';
import { AppProgress, DEFAULT_PROGRESS } from '../types/progress';

export default function DiscoverScreen() {
  const params = useLocalSearchParams<{ q?: string | string[] }>();
  const initialQuery = Array.isArray(params.q) ? params.q[0] ?? '' : params.q ?? '';
  const router = useRouter();
  const dashboard = useFurqanDashboard();
  const repo = getContentRepository();
  const text = (key: Parameters<typeof packageText>[1]) => packageText(repo, key);
  const [query, setQuery] = useState(initialQuery);
  const [downloadedOnly, setDownloadedOnly] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState<string>();
  const [progress, setProgress] = useState<AppProgress>(DEFAULT_PROGRESS);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    void getAppProgress().then(setProgress).catch(() => undefined);
  }, []);

  const scope = {
    activePackageIds: repo.getAllPackages().map(pkg => pkg.id),
    editionId: 'hafs-an-asim' as const,
    studyLocale: 'en',
  };
  const result = repo.searchDiscovery(query, {
    downloadedOnly,
    themeIds: selectedThemeId ? [selectedThemeId] : undefined,
    approvedOnly: !__DEV__,
  }, scope);
  const themes = repo.getAllPackages()
    .flatMap(pkg => pkg.themes ?? [])
    .filter((theme, index, all) => all.findIndex(candidate => candidate.id === theme.id) === index)
    .filter(theme => __DEV__ || theme.reviewerStatus === 'approved');
  const hasResults = result.quranReferences.length > 0 || result.learningPaths.length > 0;

  const openPath = (packageId: string, levelIds: string[]) => {
    const pkg = repo.getPackageById(packageId);
    if (!pkg) return;
    const levels = levelIds.map(id => pkg.levels.find(level => level.id === id)).filter((level): level is NonNullable<typeof level> => Boolean(level));
    const level = levels.find(candidate => isLevelAccessible(levels, progress.completedLevelIds, candidate.id));
    if (level) router.push(`/lesson/${level.id}`);
  };

  return (
    <Screen>
      <MoroccanBackdrop />
      <View style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Canonical Quran & learning paths</Text>
            <Text accessibilityRole="header" style={styles.title}>{text('discovery.title')}</Text>
          </View>
          <Ionicons name="compass-outline" size={30} color={colors.gold} />
        </View>
        <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">
          <View style={styles.searchShell}>
            <Ionicons name="search" size={19} color={colors.textMuted} />
            <TextInput
              accessibilityLabel={text('discovery.title')}
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setQuery}
              placeholder={text('discovery.placeholder')}
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
              style={styles.input}
              value={query}
            />
          </View>

          {themes.length > 0 ? (
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>{text('discovery.themes')}</Text>
              <View style={styles.chips}>
                {themes.map(theme => {
                  const selected = selectedThemeId === theme.id;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={theme.id}
                      onPress={() => setSelectedThemeId(selected ? undefined : theme.id)}
                      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{theme.title.en ?? theme.id}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>{text('discovery.downloadedOnly')}</Text>
              <Text style={styles.switchHint}>Show content ready for offline learning</Text>
            </View>
            <Switch accessibilityLabel={text('discovery.downloadedOnly')} onValueChange={setDownloadedOnly} trackColor={{ true: colors.successSoft }} thumbColor={downloadedOnly ? colors.success : colors.surfaceMuted} value={downloadedOnly} />
          </View>

          {result.diagnostics.map(diagnostic => <Text key={diagnostic.code} style={styles.diagnostic}>{diagnostic.message}</Text>)}

          {result.quranReferences.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{text('discovery.quranReferences')}</Text>
              {result.quranReferences.map(reference => {
                const ayat = repo.getAyatByRefs(reference.ayahRefs.slice(0, 3), scope.editionId, scope);
                return (
                  <View key={`${reference.lookup.type}:${reference.label}`} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>{reference.label}</Text>
                      <Ionicons name="book-outline" size={18} color={colors.success} />
                    </View>
                    {ayat.map(ayah => <Text key={ayah.id} style={styles.arabic}>{ayah.arabicText.text}</Text>)}
                    {reference.lessonAvailability === 'no_published_lesson' ? <Text style={styles.unavailable}>{text('discovery.noLesson')}</Text> : null}
                  </View>
                );
              })}
            </View>
          ) : null}

          {result.learningPaths.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{text('discovery.learningPaths')}</Text>
              {result.learningPaths.map(({ packageId, path }) => (
                <View key={`${packageId}:${path.id}`} style={styles.card}>
                  <Text style={styles.cardTitle}>{path.title}</Text>
                  <Text style={styles.description}>{path.description}</Text>
                  <Pressable accessibilityRole="button" onPress={() => openPath(packageId, path.levelIds)} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                    <Text style={styles.primaryButtonText}>{text('discovery.start')}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.surface} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          {!hasResults && result.diagnostics.length === 0 ? <Text style={styles.empty}>{text('discovery.noResults')}</Text> : null}
        </ScrollView>
      </View>
      <BottomNavigation active="explore" reviewCount={dashboard.dueReviewCount} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { alignItems: 'center', backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  eyebrow: { color: colors.success, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.6, textTransform: 'uppercase' },
  title: { color: colors.primary, fontFamily: fonts.bold, fontSize: 24 },
  content: { alignSelf: 'center', maxWidth: 640, padding: spacing.lg, paddingBottom: spacing.xxl, width: '100%' },
  searchShell: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, boxShadow: shadows.card, flexDirection: 'row', paddingHorizontal: spacing.md },
  input: { color: colors.text, flex: 1, fontFamily: fonts.regular, fontSize: 16, minHeight: 50, paddingHorizontal: spacing.sm },
  filterGroup: { marginTop: spacing.lg },
  filterLabel: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 11, marginBottom: spacing.sm, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontFamily: fonts.medium, fontSize: 13 },
  chipTextSelected: { color: colors.surface },
  switchRow: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginVertical: spacing.lg, padding: spacing.md },
  switchLabel: { color: colors.text, fontFamily: fonts.bold, fontSize: 14 },
  switchHint: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 11, marginTop: 1 },
  diagnostic: { backgroundColor: colors.warningSoft, borderRadius: radii.sm, color: colors.warning, fontFamily: fonts.medium, marginBottom: spacing.md, padding: spacing.md },
  section: { gap: spacing.md, marginBottom: spacing.xl },
  sectionTitle: { color: colors.primary, fontFamily: fonts.bold, fontSize: 18 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, boxShadow: shadows.card, padding: spacing.lg },
  cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 17 },
  arabic: { color: colors.text, fontFamily: fonts.arabic, fontSize: 27, lineHeight: 44, marginTop: spacing.sm, textAlign: 'right', writingDirection: 'rtl' },
  unavailable: { color: colors.warning, fontFamily: fonts.bold, fontSize: 13, marginTop: spacing.sm },
  description: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, marginTop: spacing.sm },
  primaryButton: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.success, borderRadius: radii.pill, flexDirection: 'row', gap: spacing.xs, marginTop: spacing.md, minHeight: 44, paddingHorizontal: spacing.lg },
  primaryButtonText: { color: colors.surface, fontFamily: fonts.bold, fontSize: 14 },
  empty: { color: colors.textMuted, fontFamily: fonts.regular, lineHeight: 22, paddingVertical: spacing.xl, textAlign: 'center' },
  pressed: { opacity: 0.72 },
});
