// Home / Entry Screen — redirects to Roadmap

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    // Small delay to let the layout settle, then go to roadmap
    const t = setTimeout(() => {
      router.replace('/roadmap');
    }, 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>📖</Text>
      <Text style={styles.title}>QuranDo</Text>
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
