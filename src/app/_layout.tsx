// Root layout for Expo Router

import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import { SourceSans3_400Regular, SourceSans3_600SemiBold, SourceSans3_700Bold } from '@expo-google-fonts/source-sans-3';
import { NotoNaskhArabic_400Regular, NotoNaskhArabic_600SemiBold } from '@expo-google-fonts/noto-naskh-arabic';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { getContentRepository } from '../lib/content/repository';
import { hydrateInstalledPackages } from '../lib/packages/installer';
import { AsyncStoragePackageStore } from '../lib/packages/asyncStoragePackageStore';
import { colors } from '../theme/tokens';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [fontsLoaded] = useFonts({
    SourceSans3_400Regular,
    SourceSans3_600SemiBold,
    SourceSans3_700Bold,
    NotoNaskhArabic_400Regular,
    NotoNaskhArabic_600SemiBold,
  });
  useEffect(() => {
    let cancelled = false;
    void hydrateInstalledPackages(new AsyncStoragePackageStore(), getContentRepository())
      .catch(error => console.warn('[content] Installed package hydration skipped:', error))
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  if (!ready || !fontsLoaded) return <View style={styles.root} />;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="roadmap" />
          <Stack.Screen name="discover" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="practice/[id]" />
          <Stack.Screen name="review" />
          <Stack.Screen
            name="lesson/[id]"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="complete/[id]"
            options={{ animation: 'fade' }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background } });
