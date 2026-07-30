import React, { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { FlatList, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
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

type BrowseMode = 'search' | 'surah' | 'juz' | 'hizb';
interface BrowseItem {
  number: number;
  title: string;
  subtitle: string;
  arabic?: string;
}

export default function DiscoverScreen() {
  const params = useLocalSearchParams<{
    q?: string | string[];
    mode?: string | string[];
    number?: string | string[];
  }>();
  const initialQuery = Array.isArray(params.q) ? params.q[0] ?? '' : params.q ?? '';
  const initialMode = normalizeBrowseMode(Array.isArray(params.mode) ? params.mode[0] : params.mode);
  const initialNumber = parseBrowseNumber(Array.isArray(params.number) ? params.number[0] : params.number);
  const router = useRouter();
  const dashboard = useFurqanDashboard();
  const repo = getContentRepository();
  const text = (key: Parameters<typeof packageText>[1]) => packageText(repo, key);
  const [query, setQuery] = useState(initialQuery);
  const [browseMode, setBrowseMode] = useState<BrowseMode>(initialMode);
  const [browseNumber, setBrowseNumber] = useState<number | undefined>(initialNumber);
  const [downloadedOnly, setDownloadedOnly] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState<string>();
  const [progress, setProgress] = useState<AppProgress>(DEFAULT_PROGRESS);
  const browseListRef = useRef<FlatList<BrowseItem>>(null);

  useEffect(() => {
    setQuery(initialQuery);
    setBrowseMode(initialMode);
    setBrowseNumber(initialNumber);
  }, [initialMode, initialNumber, initialQuery]);

  useEffect(() => {
    void getAppProgress().then(setProgress).catch(() => undefined);
  }, []);

  const scope = {
    activePackageIds: repo.getAllPackages().map(pkg => pkg.id),
    editionId: 'hafs-an-asim' as const,
    studyLocale: 'en',
  };
  const effectiveQuery = browseMode === 'search'
    ? query
    : browseNumber
      ? `${browseMode === 'surah' ? 'Surah' : browseMode === 'juz' ? 'Juz' : 'Hizb'} ${browseNumber}`
      : '';
  const result = repo.searchDiscovery(effectiveQuery, {
    downloadedOnly,
    themeIds: selectedThemeId ? [selectedThemeId] : undefined,
    approvedOnly: !__DEV__,
  }, scope);
  const themes = repo.getAllPackages()
    .flatMap(pkg => pkg.themes ?? [])
    .filter((theme, index, all) => all.findIndex(candidate => candidate.id === theme.id) === index)
    .filter(theme => __DEV__ || theme.reviewerStatus === 'approved');
  const hasResults = result.quranReferences.length > 0 || result.learningPaths.length > 0;
  const browseItems: BrowseItem[] = browseMode === 'surah'
    ? repo.getSurahs('mushaf').map(surah => ({
      number: surah.surahNumber,
      title: surah.transliteratedName,
      subtitle: `${surah.englishName} · ${surah.ayahCount} ayat`,
      arabic: surah.arabicName,
    }))
    : browseMode === 'juz' || browseMode === 'hizb'
      ? repo.listDivisions(browseMode, scope.editionId, scope).map(division => {
        const refs = repo.listAyahRefsInDivision(browseMode, division.number, scope.editionId, scope);
        const surahs = repo.listSurahsInDivision(browseMode, division.number, scope.editionId, scope);
        return {
          number: division.number,
          title: `${browseMode === 'juz' ? 'Juz' : 'Hizb'} ${division.number}`,
          subtitle: `${refs.length} ayat · ${surahs.length} Surah${surahs.length === 1 ? '' : 's'}`,
        };
      })
      : [];

  useEffect(() => {
    if (!browseNumber) return;
    browseListRef.current?.scrollToIndex({ animated: true, index: browseNumber - 1 });
  }, [browseMode, browseNumber]);

  const selectMode = (mode: BrowseMode) => {
    setBrowseMode(mode);
    setBrowseNumber(mode === 'surah'
      ? dashboard.location?.surahNumber ?? 1
      : mode === 'juz'
        ? dashboard.location?.juzNumber ?? 1
        : mode === 'hizb'
          ? dashboard.location?.hizbNumber ?? 1
          : undefined);
    if (mode !== 'search') setQuery('');
  };

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
              onFocus={() => setBrowseMode('search')}
              placeholder={text('discovery.placeholder')}
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
              style={styles.input}
              value={query}
            />
          </View>

          <View accessibilityRole="tablist" style={styles.browseTabs}>
            {(['search', 'surah', 'juz', 'hizb'] as BrowseMode[]).map(mode => {
              const selected = browseMode === mode;
              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  key={mode}
                  onPress={() => selectMode(mode)}
                  style={({ pressed }) => [styles.browseTab, selected && styles.browseTabSelected, pressed && styles.pressed]}
                >
                  <Text style={[styles.browseTabText, selected && styles.browseTabTextSelected]}>
                    {mode === 'search' ? 'Search' : mode[0].toUpperCase() + mode.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {browseMode !== 'search' ? (
            <View style={styles.browseSection}>
              <Text style={styles.filterLabel}>Browse by {browseMode}</Text>
              <FlatList
                contentContainerStyle={styles.browseList}
                data={browseItems}
                getItemLayout={(_data, index) => ({
                  index,
                  length: 190 + spacing.sm,
                  offset: (190 + spacing.sm) * index,
                })}
                horizontal
                initialScrollIndex={browseNumber ? browseNumber - 1 : 0}
                keyExtractor={item => `${browseMode}:${item.number}`}
                ref={browseListRef}
                renderItem={({ item }) => {
                  const selected = browseNumber === item.number;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setBrowseNumber(item.number)}
                      style={({ pressed }) => [styles.browseItem, selected && styles.browseItemSelected, pressed && styles.pressed]}
                    >
                      <View style={styles.browseNumber}><Text style={styles.browseNumberText}>{item.number}</Text></View>
                      <View style={styles.browseCopy}>
                        <Text style={styles.browseTitle}>{item.title}</Text>
                        <Text style={styles.browseSubtitle}>{item.subtitle}</Text>
                      </View>
                      {item.arabic ? <Text style={styles.browseArabic}>{item.arabic}</Text> : null}
                      <Ionicons name={selected ? 'checkmark-circle' : 'chevron-forward'} size={18} color={selected ? colors.success : colors.textMuted} />
                    </Pressable>
                  );
                }}
                showsHorizontalScrollIndicator={false}
              />
            </View>
          ) : null}

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
                const firstRef = reference.ayahRefs[0];
                const lastRef = reference.ayahRefs.at(-1);
                const includedSurahs = reference.lookup.type === 'juz' || reference.lookup.type === 'hizb'
                  ? repo.listSurahsInDivision(reference.lookup.type, reference.lookup.number, scope.editionId, scope)
                  : [];
                return (
                  <View key={`${reference.lookup.type}:${reference.label}`} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>{reference.label}</Text>
                      <Ionicons name="book-outline" size={18} color={colors.success} />
                    </View>
                    {firstRef && lastRef ? (
                      <Text style={styles.referenceMeta}>
                        {firstRef.surahNumber}:{firstRef.ayahNumber}–{lastRef.surahNumber}:{lastRef.ayahNumber} · {reference.ayahRefs.length} ayat
                      </Text>
                    ) : null}
                    {includedSurahs.length > 0 ? (
                      <Text numberOfLines={3} style={styles.referenceSurahs}>
                        {includedSurahs.map(surah => surah.transliteratedName).join(' · ')}
                      </Text>
                    ) : null}
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
  browseTabs: { backgroundColor: colors.surfaceMuted, borderRadius: radii.pill, flexDirection: 'row', marginTop: spacing.md, padding: 3 },
  browseTab: { alignItems: 'center', borderRadius: radii.pill, flex: 1, justifyContent: 'center', minHeight: 40, paddingHorizontal: spacing.sm },
  browseTabSelected: { backgroundColor: colors.primary },
  browseTabText: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 12 },
  browseTabTextSelected: { color: colors.surface },
  browseSection: { marginTop: spacing.lg },
  browseList: { gap: spacing.sm, paddingRight: spacing.lg },
  browseItem: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, minHeight: 62, padding: spacing.md, width: 190 },
  browseItemSelected: { backgroundColor: colors.successSoft, borderColor: colors.success },
  browseNumber: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radii.pill, height: 34, justifyContent: 'center', width: 34 },
  browseNumberText: { color: colors.primary, fontFamily: fonts.bold, fontSize: 12 },
  browseCopy: { flex: 1, minWidth: 0 },
  browseTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 15 },
  browseSubtitle: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 11, marginTop: 1 },
  browseArabic: { color: colors.primary, fontFamily: fonts.arabic, fontSize: 20 },
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
  referenceMeta: { color: colors.success, fontFamily: fonts.bold, fontSize: 12, marginTop: spacing.sm },
  referenceSurahs: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, marginTop: spacing.xs },
  unavailable: { color: colors.warning, fontFamily: fonts.bold, fontSize: 13, marginTop: spacing.sm },
  description: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, marginTop: spacing.sm },
  primaryButton: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.success, borderRadius: radii.pill, flexDirection: 'row', gap: spacing.xs, marginTop: spacing.md, minHeight: 44, paddingHorizontal: spacing.lg },
  primaryButtonText: { color: colors.surface, fontFamily: fonts.bold, fontSize: 14 },
  empty: { color: colors.textMuted, fontFamily: fonts.regular, lineHeight: 22, paddingVertical: spacing.xl, textAlign: 'center' },
  pressed: { opacity: 0.72 },
});

function normalizeBrowseMode(value?: string): BrowseMode {
  return value === 'surah' || value === 'juz' || value === 'hizb' ? value : 'search';
}

function parseBrowseNumber(value?: string): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return number > 0 ? number : undefined;
}
