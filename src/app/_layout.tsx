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
import { loadRuntimePackage } from '../lib/content/runtimeClient';
import { LocalizationProvider, useLocalization } from '../lib/localization/LocalizationProvider';
import { colors, fonts, radii, spacing } from '../theme/tokens';

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
  const packageId = process.env.EXPO_PUBLIC_INITIAL_PACKAGE_ID;

  const loadContent = useCallback(async () => {
    setState('loading');
    setError(undefined);
    try {
      const repo = getContentRepository();
      if (packageId) await loadRuntimePackage(packageId, preferences.lessonLocale);
      if (!repo.getActivePackage()) throw new Error('No published runtime package is configured.');
      setState('ready');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('app.contentUnavailable'));
      setState('error');
    }
  }, [packageId, preferences.lessonLocale, t]);

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
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: spacing.xl },
  errorTitle: { color: colors.primary, fontFamily: fonts.bold, fontSize: 22, textAlign: 'center' },
  message: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, marginTop: spacing.sm, textAlign: 'center' },
  retry: { backgroundColor: colors.primary, borderRadius: radii.pill, marginTop: spacing.lg, minHeight: 48, paddingHorizontal: spacing.xl, justifyContent: 'center' },
  retryText: { color: colors.surface, fontFamily: fonts.bold, fontSize: 15 },
});
