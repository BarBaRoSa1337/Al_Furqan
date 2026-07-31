// Home / Entry Screen — redirects to Roadmap

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getContentRepository } from '../lib/content/repository';
import { packageText } from '../lib/content/text';
import { useLocalization } from '../lib/localization/LocalizationProvider';

export default function IndexScreen() {
  const router = useRouter();
  const repo = getContentRepository();
  const { preferences } = useLocalization();
  const packageTitle = packageText(repo, 'app.title', {}, preferences.interfaceLocale);

  useEffect(() => {
    // Small delay to let the layout settle, then go to roadmap
    const t = setTimeout(() => {
      router.replace('/roadmap');
    }, 100);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>📖</Text>
      <Text style={styles.title}>{packageTitle}</Text>
      <ActivityIndicator color="#1B4F72" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { fontSize: 64, marginBottom: 12 },
  spinner: { marginTop: 24 },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1B4F72',
    letterSpacing: 1,
  },
});
