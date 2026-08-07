import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/ui/Screen';
import { colors, fonts, radii, spacing } from '../theme/tokens';

export default function PrivacyPolicyScreen() {
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (typeof window !== 'undefined' && window.history.length > 1) {
              window.history.back();
            }
          }}
          style={styles.backButton}
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          Privacy Policy
        </Text>
        <Text style={styles.lastUpdated}>Last updated: Draft — not yet published</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.body}>
            The Quran Habit App (&quot;Furqan&quot;) is a Quran learning application that
            helps users build daily Quran habits, memorize passages, and
            understand translations and tafsir.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data We Collect</Text>
          <Text style={styles.body}>
            • Learning progress (completed levels, streaks, XP) — stored locally
            on your device using AsyncStorage.{"\n"}
            • Language and display preferences — stored locally on your device.{"\n"}
            • No personal information, email, or account data is collected.{"\n"}
            • No analytics or tracking services are used.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>External Services</Text>
          <Text style={styles.body}>
            The app connects to the following services to deliver content:{"\n\n"}
            • Quran Foundation (quran.foundation) — for Quran text, word data,
            and tafsir. Requests are proxied through our backend; no credentials
            are exposed to your device.{"\n"}
            • QuranEnc (quranenc.com) — for translation data.{"\n"}
            • MP3Quran (mp3quran.net) — for audio recitation streaming. Audio is
            streamed directly and is not downloaded or cached.{"\n\n"}
            These services may log standard HTTP request information (IP address,
            user agent). Please review each provider&apos;s privacy policy for
            details.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Storage</Text>
          <Text style={styles.body}>
            All learning data is stored locally on your device. We do not
            operate user accounts, cloud sync, or remote databases. Uninstalling
            the app removes all stored data.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Children&apos;s Privacy</Text>
          <Text style={styles.body}>
            This app is designed for users aged 12 and above. We do not
            knowingly collect personal information from children under 13.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Changes to This Policy</Text>
          <Text style={styles.body}>
            We may update this privacy policy from time to time. Any changes
            will be reflected in the app with an updated &quot;Last updated&quot; date.
          </Text>
        </View>

        <View style={styles.draftNotice}>
          <Text style={styles.draftText}>
            ⚠️ This is a draft privacy policy template. Review with legal
            counsel before publishing.
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
    marginBottom: spacing.xs,
  },
  lastUpdated: {
    color: colors.warning,
    fontFamily: fonts.medium,
    fontSize: 12,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 17,
    marginBottom: spacing.sm,
  },
  body: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 22,
  },
  draftNotice: {
    backgroundColor: colors.warningSoft,
    borderRadius: radii.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  draftText: {
    color: colors.warning,
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
