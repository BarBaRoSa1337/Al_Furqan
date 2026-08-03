// Root layout for Expo Router

import React, { useCallback, useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import { SourceSans3_400Regular, SourceSans3_600SemiBold, SourceSans3_700Bold } from '@expo-google-fonts/source-sans-3';
import { NotoNaskhArabic_400Regular, NotoNaskhArabic_600SemiBold } from '@expo-google-fonts/noto-naskh-arabic';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { getContentRepository } from '../lib/content/repository';
import { getRuntimeApiBaseUrl, loadRuntimePackage } from '../lib/content/runtimeClient';
import { LocalizationProvider, useLocalization } from '../lib/localization/LocalizationProvider';
import { colors, fonts, radii, spacing } from '../theme/tokens';
import { resolveContentMode } from '../lib/content/contentMode';
import PreviewContentIndicator, { PREVIEW_INDICATOR_HEIGHT } from '../components/furqan/PreviewContentIndicator';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SourceSans3_400Regular,
    SourceSans3_600SemiBold,
    SourceSans3_700Bold,
    NotoNaskhArabic_400Regular,
    NotoNaskhArabic_600SemiBold,
  });
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <LocalizationProvider>
          <AppBootstrap fontsLoaded={fontsLoaded} />
        </LocalizationProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppBootstrap({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { direction, preferences, ready: preferencesReady, t } = useLocalization();
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string>();
  // The development runtime course contains the generic Surah/ayah node
  // workflow for Al-Fil through An-Nas. Deployments can override this ID.
  const packageId = process.env.EXPO_PUBLIC_INITIAL_PACKAGE_ID ?? 'surah-al-fil-v1';
  const runtimeApiBaseUrl = getRuntimeApiBaseUrl();
  const contentMode = resolveContentMode();
  const previewContent = contentMode === 'preview';

  const loadContent = useCallback(async () => {
    setState('loading');
    setError(undefined);
    try {
      const repo = getContentRepository();
      if (!runtimeApiBaseUrl) {
        throw new Error(previewContent
          ? 'Preview mode requires EXPO_PUBLIC_FURQAN_API_BASE_URL.'
          : 'No production content backend is configured.');
      }
      await loadRuntimePackage(packageId, preferences.lessonLocale, contentMode);
      if (!repo.getActivePackage()) throw new Error(`${contentMode} content package could not be activated.`);
      setState('ready');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('app.contentUnavailable'));
      setState('error');
    }
  }, [contentMode, packageId, preferences.lessonLocale, previewContent, runtimeApiBaseUrl, t]);

  useEffect(() => {
    if (preferencesReady) void loadContent();
  }, [loadContent, preferencesReady]);

  if (!fontsLoaded || !preferencesReady || state === 'loading') {
    return <View style={[styles.center, { direction }]}><ActivityIndicator color={colors.success} /><Text style={styles.message}>{t('app.loading')}</Text></View>;
  }
  if (state === 'error') {
    return (
      <View style={[styles.center, { direction }]}>
        <Text accessibilityRole="header" style={styles.errorTitle}>{t('app.contentUnavailable')}</Text>
        <Text style={styles.message}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={() => { void loadContent(); }} style={styles.retry}>
          <Text style={styles.retryText}>{t('app.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { direction }]}>
      <StatusBar style="dark" />
      <View style={[styles.stack, previewContent && styles.previewInset]}>
        <Stack screenOptions={{ headerShown: false, animation: direction === 'rtl' ? 'slide_from_left' : 'slide_from_right', contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="roadmap" />
          <Stack.Screen name="discover" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="surah/[id]" />
          <Stack.Screen name="level/[id]" options={{ animation: 'fade_from_bottom' }} />
          <Stack.Screen name="practice/[id]" />
          <Stack.Screen name="review" />
          <Stack.Screen name="lesson/[id]" />
          <Stack.Screen name="complete/[id]" options={{ animation: 'fade' }} />
        </Stack>
      </View>
      {previewContent ? <PreviewContentIndicator /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  stack: { flex: 1 },
  previewInset: { paddingTop: PREVIEW_INDICATOR_HEIGHT },
  center: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: spacing.xl },
  errorTitle: { color: colors.primary, fontFamily: fonts.bold, fontSize: 22, textAlign: 'center' },
  message: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, marginTop: spacing.sm, textAlign: 'center' },
  retry: { backgroundColor: colors.primary, borderRadius: radii.pill, marginTop: spacing.lg, minHeight: 48, paddingHorizontal: spacing.xl, justifyContent: 'center' },
  retryText: { color: colors.surface, fontFamily: fonts.bold, fontSize: 15 },
});
