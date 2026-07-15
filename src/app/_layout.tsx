// Root layout for Expo Router

import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { getContentRepository } from '../lib/content/repository';
import { hydrateInstalledPackages } from '../lib/packages/installer';
import { AsyncStoragePackageStore } from '../lib/packages/asyncStoragePackageStore';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void hydrateInstalledPackages(new AsyncStoragePackageStore(), getContentRepository())
      .catch(error => console.warn('[content] Installed package hydration skipped:', error))
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  if (!ready) return <View style={styles.root} />;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: '#F5F0E8' },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="roadmap" />
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

const styles = StyleSheet.create({ root: { flex: 1 } });
