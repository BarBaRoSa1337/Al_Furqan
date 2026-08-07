import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/ui/Screen';
import { colors, fonts, radii, spacing } from '../theme/tokens';

export default function TermsOfUseScreen() {
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
          Terms of Use
        </Text>
        <Text style={styles.lastUpdated}>Last updated: Draft — not yet published</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acceptance of Terms</Text>
          <Text style={styles.body}>
            By using the Quran Habit App (&quot;Furqan&quot;), you agree to these Terms of
            Use. If you do not agree, please do not use the app.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Purpose</Text>
          <Text style={styles.body}>
            Furqan is a Quran learning application designed to help users build
            daily Quran habits, memorize short passages, understand
            translations, and learn tafsir. The app is intended for Muslims
            aged 12 and above.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content Sources</Text>
          <Text style={styles.body}>
            Quran text, translations, tafsir, and audio recitations are
            provided by third-party sources including the Tanzil Project,
            Quran Foundation, QuranEnc, and MP3Quran.net. Each source&apos;s
            content is subject to its own license terms. See the Attributions
            page for details.{"\n\n"}
            The Arabic Quran text is canonical data provided verbatim from
            verified sources. It is not modified by this application.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permitted Use</Text>
          <Text style={styles.body}>
            You may use this app for personal Quran learning and memorization.{"\n"}
            You may not:{"\n"}
            • Modify or redistribute the Quran text provided by this app{"\n"}
            • Use the app&apos;s content for purposes that promote hate,
            misinformation, or extremism{"\n"}
            • Reverse engineer, decompile, or extract data from the app for
            commercial redistribution
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Disclaimer</Text>
          <Text style={styles.body}>
            This app is provided &quot;as is&quot; without warranty of any kind. The
            developers are not responsible for the accuracy of third-party
            content. For authoritative Islamic guidance, consult qualified
            scholars.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Changes to Terms</Text>
          <Text style={styles.body}>
            We may update these terms from time to time. Continued use of the
            app constitutes acceptance of the updated terms.
          </Text>
        </View>

        <View style={styles.draftNotice}>
          <Text style={styles.draftText}>
            ⚠️ This is a draft Terms of Use template. Review with legal
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
