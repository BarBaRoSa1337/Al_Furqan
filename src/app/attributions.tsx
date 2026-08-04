import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/ui/Screen';
import { colors, fonts, radii, spacing } from '../theme/tokens';

interface SourceAttribution {
  name: string;
  description: string;
  license: string;
  version?: string;
  attributionText: string;
  url: string;
  urlLabel: string;
}

const SOURCES: SourceAttribution[] = [
  {
    name: 'Tanzil Project',
    description: 'Hafs ʿan ʿAsim Uthmani Arabic Quran text',
    license: 'Creative Commons Attribution 3.0 (CC BY 3.0)',
    version: '1.1',
    attributionText:
      'Tanzil Quran Text. Copyright (C) 2007-2021 Tanzil Project. '
      + 'License: Creative Commons Attribution 3.0.',
    url: 'https://tanzil.net',
    urlLabel: 'tanzil.net',
  },
  {
    name: 'Quran Foundation',
    description:
      'Quran structure, word tokens, word meanings, and tafsir data',
    license: 'Quran Foundation Developer Terms of Service',
    attributionText:
      'Quran data provided by the Quran Foundation (quran.foundation). '
      + 'Content is served through the Quran Foundation Content API v4.',
    url: 'https://quran.foundation',
    urlLabel: 'quran.foundation',
  },
  {
    name: 'QuranEnc — English Translation',
    description: 'Rowwad Translation Center English translation',
    license: 'QuranEnc published republication conditions',
    version: '1.0.19',
    attributionText:
      'Rowwad Translation Center, provided by QuranEnc (quranenc.com). '
      + 'Version 1.0.19. Provider text is unmodified.',
    url: 'https://quranenc.com',
    urlLabel: 'quranenc.com',
  },
  {
    name: 'QuranEnc — French Translation',
    description: 'Rachid Maach French translation',
    license: 'QuranEnc published republication conditions',
    version: '1.0.3',
    attributionText:
      'Rachid Maach, provided by QuranEnc (quranenc.com). '
      + 'Version 1.0.3. Provider text is unmodified.',
    url: 'https://quranenc.com',
    urlLabel: 'quranenc.com',
  },
  {
    name: 'MP3Quran.net — Recitation',
    description:
      'Mahmoud Khalil Al-Husary, Hafs ʿan ʿAsim recitation (stream only)',
    license: 'MP3Quran published usage terms',
    attributionText:
      'Recitation streamed directly from MP3Quran.net. '
      + 'No audio is downloaded, cached, or redistributed.',
    url: 'https://www.mp3quran.net',
    urlLabel: 'mp3quran.net',
  },
];

export default function AttributionsScreen() {
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            // Navigate back - uses expo-router history
            if (typeof window !== 'undefined' && window.history.length > 1) {
              window.history.back();
            }
          }}
          style={styles.backButton}
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          Sources \u0026 Attributions
        </Text>
        <Text style={styles.intro}>
          This application uses the following sources for Quran text,
          translations, tafsir, and recitation. We are grateful to every
          provider for making these resources available.
        </Text>
        {SOURCES.map(source => (
          <View key={source.name} style={styles.card}>
            <Text style={styles.sourceName}>{source.name}</Text>
            <Text style={styles.sourceDescription}>{source.description}</Text>
            {source.version ? (
              <Text style={styles.sourceVersion}>Version {source.version}</Text>
            ) : null}
            <Text style={styles.sourceLicense}>{source.license}</Text>
            <Text style={styles.attributionText}>{source.attributionText}</Text>
            <Pressable
              accessibilityRole="link"
              onPress={() => {
                void Linking.openURL(source.url);
              }}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>{source.urlLabel} ↗</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            All npm dependencies use MIT or Apache-2.0 open-source licenses.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: 'center',
    maxWidth: 600,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    width: '100%',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  backText: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  title: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 27,
    marginBottom: spacing.sm,
  },
  intro: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  sourceName: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 17,
    marginBottom: spacing.xs,
  },
  sourceDescription: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.xs,
  },
  sourceVersion: {
    color: colors.success,
    fontFamily: fonts.bold,
    fontSize: 11,
    marginBottom: spacing.xs,
  },
  sourceLicense: {
    color: colors.warning,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: spacing.sm,
  },
  attributionText: {
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.sm,
  },
  linkButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.successSoft,
    borderRadius: radii.pill,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  linkText: {
    color: colors.success,
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  footer: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
  footerText: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
