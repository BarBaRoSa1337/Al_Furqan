import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SUPPORTED_LOCALES, type SupportedLocale } from '../../packages/api-contracts/src';
import BottomNavigation from '../components/furqan/BottomNavigation';
import { CourseArtwork, MoroccanBackdrop } from '../components/furqan/FurqanArtwork';
import Screen from '../components/ui/Screen';
import { useFurqanDashboard } from '../hooks/useFurqanDashboard';
import { getSourceHash, grantCovers } from '../lib/content/governance';
import { getContentRepository } from '../lib/content/repository';
import { colors, fonts, radii, shadows, spacing } from '../theme/tokens';
import { useLocalization } from '../lib/localization/LocalizationProvider';
import { isLessonLocaleAvailable } from '../lib/content/publication';

export default function ProfileScreen() {
  const dashboard = useFurqanDashboard();
  const router = useRouter();
  const { preferences, setInterfaceLocale, setLessonLocale, t, updatePreferences } = useLocalization();
  const contentPackage = getContentRepository().getActivePackage();
  const lessonLocaleAvailable = Boolean(contentPackage && isLessonLocaleAvailable(contentPackage, preferences.lessonLocale));
  const completedCount = dashboard.progress.completedLevelIds.length;
  return (
    <Screen>
      <MoroccanBackdrop />
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <View style={styles.intro}>
          <CourseArtwork variant="profile" size={82} />
          <View style={styles.introCopy}>
            <Text accessibilityRole="header" style={styles.title}>{t('profile.title')}</Text>
            <Text style={styles.subtitle}>{t('profile.subtitle')}</Text>
          </View>
        </View>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>{t('profile.currentPath')}</Text>
          <Text style={styles.heroTitle}>{lessonLocaleAvailable ? dashboard.path?.title ?? t('profile.choosePath') : t('lesson.localeUnavailableTitle', { language: t(`locale.${preferences.lessonLocale}`) })}</Text>
          <Text style={styles.heroText}>{lessonLocaleAvailable ? dashboard.activeLevel?.title ?? dashboard.latestCompletedLevel?.title ?? t('profile.openExplore') : t('lesson.localeUnavailableBody')}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${dashboard.levels.length > 0 ? Math.round((completedCount / dashboard.levels.length) * 100) : 0}%` }]} />
          </View>
        </View>
        <View style={styles.stats}>
          <Stat value={dashboard.progress.streak.currentStreak} label={t('profile.dayStreak')} accent />
          <Stat value={dashboard.progress.xp} label={t('profile.points')} />
          <Stat value={completedCount} label={t('profile.completedLevels')} />
          <Stat value={dashboard.reviewItemCount} label={t('profile.reviewItems')} />
        </View>
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>{t('profile.habitSummary')}</Text>
          <Detail label={t('profile.longestStreak')} value={t('profile.days', { count: dashboard.progress.streak.longestStreak })} />
          <Detail label={t('profile.readyReview')} value={String(dashboard.dueReviewCount)} />
          <Detail label={t('profile.dailyGoal')} value={dashboard.dailyGoalComplete ? t('profile.complete') : t('profile.incomplete')} />
        </View>
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>{t('profile.languageSettings')}</Text>
          <PreferenceLabel>{t('profile.interfaceLanguage')}</PreferenceLabel>
          <LocaleSelector value={preferences.interfaceLocale} onSelect={locale => { void setInterfaceLocale(locale); }} t={t} />
          <PreferenceLabel>{t('profile.lessonLanguage')}</PreferenceLabel>
          <LocaleSelector value={preferences.lessonLocale} onSelect={locale => { void setLessonLocale(locale); }} t={t} />
          <Detail label={t('profile.translation')} value={preferences.translationResourceId} />
          <Detail label={t('profile.script')} value="Uthmani Hafs" />
          <Detail label={t('profile.reciter')} value="Mahmoud Khalil Al-Husary" />
          <PreferenceLabel>{t('profile.transliteration')}</PreferenceLabel>
          <View style={styles.preferenceOptions}>
            {(['show', 'hide'] as const).map(value => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: preferences.transliterationPreference === value }}
                key={value}
                onPress={() => { void updatePreferences({ transliterationPreference: value }); }}
                style={[styles.preferenceOption, preferences.transliterationPreference === value && styles.preferenceOptionSelected]}
              >
                <Text style={[styles.preferenceOptionText, preferences.transliterationPreference === value && styles.preferenceOptionTextSelected]}>{t(`profile.${value}`)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        {contentPackage ? (
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>{t('profile.sourcesRights')}</Text>
            <Text style={styles.rightsIntro}>
              {t('profile.rightsIntro')}
            </Text>
            {contentPackage.sources.map(source => {
              const sourceHash = getSourceHash(source);
              const legallyApproved = contentPackage.governance?.approvals.some(approval => (
                approval.decision === 'approved'
                && approval.role === 'legal'
                && approval.target.kind === 'source'
                && approval.target.id === source.id
                && approval.target.hash === sourceHash
              )) ?? false;
              const distributable = contentPackage.governance?.licenseGrants.some(grant => grantCovers(grant, {
                sourceId: source.id,
                profile: 'public-free',
                platforms: ['android', 'ios', 'web'],
                rights: ['public_distribution'],
              })) ?? false;
              const approved = source.reviewerStatus === 'approved' && legallyApproved && distributable;
              return (
                <View key={source.id} style={styles.sourceRow}>
                  <View style={styles.sourceHeading}>
                    <Text style={styles.sourceName}>{source.name}</Text>
                    <View style={[styles.rightsBadge, approved ? styles.rightsApproved : styles.rightsRestricted]}>
                      <Text style={[styles.rightsBadgeText, approved ? styles.rightsApprovedText : styles.rightsRestrictedText]}>
                        {approved ? t('profile.productionReady') : t('profile.restricted')}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.sourceMeta}>{source.publisher ?? source.author ?? t('profile.publisherMissing')} · {source.version}</Text>
                  <Text style={styles.sourceLicense}>{source.license ?? t('profile.licenseMissing')}</Text>
                </View>
              );
            })}
          </View>
        ) : null}
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>Legal</Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/attributions')}
            style={styles.legalLink}
          >
            <Text style={styles.legalLinkText}>Sources & Attributions</Text>
            <Text style={styles.legalArrow}>→</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/privacy')}
            style={styles.legalLink}
          >
            <Text style={styles.legalLinkText}>Privacy Policy</Text>
            <Text style={styles.legalArrow}>→</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/terms')}
            style={styles.legalLink}
          >
            <Text style={styles.legalLinkText}>Terms of Use</Text>
            <Text style={styles.legalArrow}>→</Text>
          </Pressable>
        </View>
      </ScrollView>
      <BottomNavigation active="profile" reviewCount={dashboard.dueReviewCount} />
    </Screen>
  );
}

function Stat({ value, label, accent = false }: { value: number; label: string; accent?: boolean }) {
  return <View style={[styles.stat, accent && styles.statAccent]}><Text style={[styles.statValue, accent && styles.statValueAccent]}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

function PreferenceLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.preferenceLabel}>{children}</Text>;
}

function LocaleSelector({ value, onSelect, t }: { value: SupportedLocale; onSelect: (locale: SupportedLocale) => void; t: (key: string) => string }) {
  return (
    <View accessibilityRole="radiogroup" style={styles.preferenceOptions}>
      {SUPPORTED_LOCALES.map(locale => (
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: value === locale }}
          key={locale}
          onPress={() => onSelect(locale)}
          style={[styles.preferenceOption, value === locale && styles.preferenceOptionSelected]}
        >
          <Text style={[styles.preferenceOptionText, value === locale && styles.preferenceOptionTextSelected]}>{t(`locale.${locale}`)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: 'center', maxWidth: 600, padding: spacing.lg, paddingBottom: spacing.xxl, width: '100%' },
  intro: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  introCopy: { flex: 1 },
  title: { color: colors.primary, fontFamily: fonts.bold, fontSize: 27 },
  subtitle: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  heroCard: { backgroundColor: colors.primary, borderRadius: radii.xl, boxShadow: shadows.raised, padding: spacing.lg },
  heroEyebrow: { color: colors.goldSoft, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.7, textTransform: 'uppercase' },
  heroTitle: { color: colors.surface, fontFamily: fonts.bold, fontSize: 21, marginTop: 3 },
  heroText: { color: '#D8E3DF', fontFamily: fonts.regular, fontSize: 13, marginTop: 2 },
  progressTrack: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: radii.pill, height: 7, marginTop: spacing.md, overflow: 'hidden' },
  progressFill: { backgroundColor: colors.gold, borderRadius: radii.pill, height: 7 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  stat: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, boxShadow: shadows.card, flexBasis: '47%', flexGrow: 1, padding: spacing.lg },
  statAccent: { backgroundColor: colors.successSoft, borderColor: '#B8DACA' },
  statValue: { color: colors.primary, fontFamily: fonts.bold, fontSize: 27 },
  statValueAccent: { color: colors.success },
  statLabel: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 11, marginTop: 2 },
  detailCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, marginTop: spacing.md, padding: spacing.lg },
  detailTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 17, marginBottom: spacing.sm },
  detailRow: { borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md },
  detailLabel: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13 },
  detailValue: { color: colors.primary, fontFamily: fonts.bold, fontSize: 13 },
  rightsIntro: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, marginBottom: spacing.sm },
  sourceRow: { borderTopColor: colors.border, borderTopWidth: 1, paddingVertical: spacing.md },
  sourceHeading: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  sourceName: { color: colors.text, flex: 1, fontFamily: fonts.bold, fontSize: 14, lineHeight: 19 },
  sourceMeta: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 11, marginTop: spacing.xs },
  sourceLicense: { color: colors.warning, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, marginTop: spacing.xs },
  rightsBadge: { borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  rightsApproved: { backgroundColor: colors.successSoft },
  rightsRestricted: { backgroundColor: colors.warningSoft },
  rightsBadgeText: { fontFamily: fonts.bold, fontSize: 9, textTransform: 'uppercase' },
  rightsApprovedText: { color: colors.success },
  rightsRestrictedText: { color: colors.warning },
  preferenceLabel: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 11, marginTop: spacing.md, textTransform: 'uppercase' },
  preferenceOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  preferenceOption: { borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, minHeight: 42, justifyContent: 'center', paddingHorizontal: spacing.md },
  preferenceOptionSelected: { backgroundColor: colors.successSoft, borderColor: colors.success },
  preferenceOptionText: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 12 },
  preferenceOptionTextSelected: { color: colors.success },
  legalLink: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md },
  legalLinkText: { color: colors.primary, fontFamily: fonts.bold, fontSize: 14 },
  legalArrow: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 16 },
});
