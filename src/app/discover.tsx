import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { QuranSearchResult } from '../../packages/api-contracts/src';
import { MoroccanBackdrop } from '../components/furqan/FurqanArtwork';
import Screen from '../components/ui/Screen';
import { getContentRepository } from '../lib/content/repository';
import { searchQuran } from '../lib/content/quranSearch';
import { resolveRoadmapSearchTarget } from '../lib/content/searchRoadmapTarget';
import { colors, fonts, radii, spacing, touch } from '../theme/tokens';
import { useLocalization } from '../lib/localization/LocalizationProvider';

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string | string[]; mode?: string | string[]; number?: string | string[] }>();
  const router = useRouter();
  const repo = getContentRepository();
  const { direction, preferences, t } = useLocalization();
  const initialQuery = useMemo(() => initialSearchQuery(params), [params]);
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<QuranSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [remoteUnavailable, setRemoteUnavailable] = useState(false);
  const authored = useMemo(() => {
    const path = repo.getCurrentLearningPath();
    return path ? repo.listAuthoredSurahs(path.id) : [];
  }, [repo]);

  useEffect(() => setQuery(initialQuery), [initialQuery]);
  useEffect(() => {
    const normalized = query.trim();
    if (!normalized) {
      setResults([]);
      setRemoteUnavailable(false);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      void searchQuran(normalized, preferences.interfaceLocale, controller.signal)
        .then(outcome => {
          setResults(outcome.results);
          setRemoteUnavailable(outcome.remoteUnavailable);
        })
        .catch(() => undefined)
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [preferences.interfaceLocale, query]);

  const openResult = useCallback((result: QuranSearchResult) => {
    const target = resolveRoadmapSearchTarget(result, authored, repo);
    if (target) router.push(target as never);
  }, [authored, router]);

  const renderItem = useCallback(({ item }: { item: QuranSearchResult }) => (
    <SearchResultRow item={item} onPress={openResult} pressable={Boolean(resolveRoadmapSearchTarget(item, authored, repo))} />
  ), [authored, openResult, repo]);

  return (
    <Screen>
      <MoroccanBackdrop />
      <FlatList
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        data={results}
        keyboardShouldPersistTaps="handled"
        keyExtractor={keyExtractor}
        ListEmptyComponent={!loading && query.trim() ? <Text style={styles.empty}>{t('search.noResults')}</Text> : null}
        ListHeaderComponent={(
          <View style={styles.headerArea}>
            <View style={styles.header}>
              <Pressable accessibilityLabel={t('surah.backHome')} accessibilityRole="button" onPress={() => router.replace('/roadmap')} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
                <Ionicons name={direction === 'rtl' ? 'arrow-forward' : 'arrow-back'} size={23} color={colors.primary} />
              </Pressable>
              <Text accessibilityRole="header" style={styles.title}>{t('search.title')}</Text>
              <View style={styles.headerSpacer} />
            </View>
            <View style={styles.searchShell}>
              <Ionicons name="search" size={20} color={colors.textMuted} />
              <TextInput
                accessibilityLabel={t('search.title')}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setQuery}
                placeholder={t('search.placeholder')}
                placeholderTextColor={colors.textMuted}
                returnKeyType="search"
                style={[styles.input, direction === 'rtl' && styles.inputRtl]}
                value={query}
              />
              {loading ? <ActivityIndicator color={colors.success} size="small" /> : null}
            </View>
            {remoteUnavailable && query.trim() ? <Text style={styles.offline}>{t('search.localOnly')}</Text> : null}
          </View>
        )}
        maxToRenderPerBatch={10}
        removeClippedSubviews
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        windowSize={7}
      />
    </Screen>
  );
}

const SearchResultRow = memo(function SearchResultRow({ item, onPress, pressable }: { item: QuranSearchResult; onPress: (item: QuranSearchResult) => void; pressable: boolean }) {
  const { t } = useLocalization();
  const displayName = item.kind === 'hizb' || item.kind === 'juz' ? t(`search.result.${item.kind}`, { number: item.key }) : item.displayName;
  const content = (
    <View style={styles.resultContent}>
      {item.arabicText ? <Text style={styles.arabic}>{item.arabicText}</Text> : null}
      <View style={styles.resultFooter}>
        {displayName ? <Text numberOfLines={2} style={styles.resultName}>{displayName}</Text> : <View />}
        <Text style={styles.reference}>{item.kind === 'ayah' ? item.key : `${item.kind.toUpperCase()} ${item.key}`}</Text>
      </View>
    </View>
  );
  if (!pressable) return <View style={styles.result}>{content}</View>;
  return <Pressable accessibilityRole="button" onPress={() => onPress(item)} style={({ pressed }) => [styles.result, pressed && styles.pressed]}>{content}</Pressable>;
});

function initialSearchQuery(params: { q?: string | string[]; mode?: string | string[]; number?: string | string[] }): string {
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  if (q) return q;
  const mode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const number = Array.isArray(params.number) ? params.number[0] : params.number;
  if (number && (mode === 'surah' || mode === 'juz' || mode === 'hizb')) return `${mode[0].toUpperCase()}${mode.slice(1)} ${number}`;
  return '';
}

function keyExtractor(item: QuranSearchResult): string { return item.id; }

const styles = StyleSheet.create({
  content: { alignSelf: 'center', gap: spacing.sm, maxWidth: 680, padding: spacing.lg, paddingBottom: spacing.xxl, width: '100%' },
  headerArea: { gap: spacing.md, paddingBottom: spacing.lg },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  back: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, height: touch.minimum, justifyContent: 'center', width: touch.minimum },
  headerSpacer: { width: touch.minimum },
  title: { color: colors.primary, fontFamily: fonts.bold, fontSize: 24 },
  searchShell: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.borderStrong, borderRadius: radii.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, minHeight: 52, paddingHorizontal: spacing.md },
  input: { color: colors.text, flex: 1, fontFamily: fonts.regular, fontSize: 16, minHeight: 50, textAlign: 'left' },
  inputRtl: { textAlign: 'right', writingDirection: 'rtl' },
  offline: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 12, textAlign: 'center' },
  result: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, marginBottom: spacing.sm, minHeight: touch.minimum, padding: spacing.md },
  resultContent: { gap: spacing.sm },
  arabic: { color: colors.primary, fontFamily: fonts.arabic, fontSize: 25, lineHeight: 40, textAlign: 'right', writingDirection: 'rtl' },
  resultFooter: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  resultName: { color: colors.text, flex: 1, fontFamily: fonts.bold, fontSize: 15, textAlign: 'left', writingDirection: 'ltr' },
  reference: { color: colors.gold, fontFamily: fonts.bold, fontSize: 12 },
  empty: { color: colors.textMuted, fontFamily: fonts.regular, paddingVertical: spacing.xl, textAlign: 'center' },
  pressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
});
