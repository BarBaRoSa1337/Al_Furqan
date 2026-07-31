import { ContentRepository, PackageTextKey } from '../../types/content';
import type { SupportedLocale } from '../../../packages/api-contracts/src';
import { appText, getCurrentInterfaceLocale } from '../localization/catalogs';

const OPTIONAL_TEXT_DEFAULTS: Record<string, string> = {
  'nav.home': 'Home',
  'nav.explore': 'Explore',
  'nav.reviews': 'Reviews',
  'nav.profile': 'Profile',
  'home.dailyGoal': "Today's goal",
  'home.sessionComplete': 'Daily session complete',
  'home.sessionPending': 'One focused session keeps your Quran habit moving.',
  'home.reviewFirst': 'Strengthen what you learned before starting something new.',
  'home.continue': 'Continue',
  'home.reviewNow': 'Review now',
  'home.explore': 'Explore Quran',
  'home.currentLocation': 'Current Quran location',
  'home.learningPath': 'Your learning path',
  'home.juz': 'Juz',
  'home.hizb': 'Hizb',
  'home.surah': 'Surah',
  'home.page': 'Page',
  'home.ayah': 'Ayah',
  'home.reviewDue': 'Review due',
  'home.reviewReady': '{count} activities ready',
  'home.memorize': 'Memorize',
  'home.memorizeHint': 'Continue your active Quran passage',
  'home.stories': 'Stories & wisdom',
  'home.storiesHint': 'Explore reviewed Quran learning paths',
  'profile.title': 'Your progress',
  'profile.subtitle': 'A quiet record of your Quran habit.',
  'profile.completedLevels': 'Circles completed',
  'profile.reviewItems': 'Review items',
  'profile.longestStreak': 'Longest streak',
  'content.shareWisdom': 'Share {title}',
  'discovery.open': 'Discover',
  'discovery.title': 'Quran discovery',
  'discovery.placeholder': 'Al-Fil, 105:1, Juz 30, stories...',
  'discovery.quranReferences': 'Quran references',
  'discovery.learningPaths': 'Learning paths',
  'discovery.noLesson': 'No published lesson yet',
  'discovery.noResults': 'No matching Quran references or learning paths',
  'discovery.downloadedOnly': 'Downloaded only',
  'discovery.start': 'Open path',
  'discovery.back': 'Back to roadmap',
  'discovery.themes': 'Themes',
  'practice.title': 'Extra practice',
  'practice.back': 'Back',
  'practice.complete': 'Practice complete',
  'practice.done': 'Back to completion',
  'completion.extraPractice': 'Extra practice',
  'roadmap.practice': 'Practice',
  'activity.matchProgress': '{current} of {total} matched',
  'activity.matchWordPrompt': 'Choose the meaning for this word',
  'activity.correctFeedback': 'Correct. Continue when you are ready.',
  'activity.incorrectFeedback': 'Not quite. Adjust your answer and try again.',
  'activity.showArabicKeyboard': 'Show Arabic keyboard',
  'activity.hideArabicKeyboard': 'Hide Arabic keyboard',
  'activity.arabicKeyboard': 'Arabic keyboard',
  'activity.keyboardSpace': 'Space',
  'activity.keyboardBackspace': 'Backspace',
};

export function packageText(repo: ContentRepository, key: PackageTextKey, values: Record<string, string | number> = {}, locale: SupportedLocale = getCurrentInterfaceLocale()): string {
  const resolvedText = repo.getText(key, locale);
  const appResolved = appText(locale, key, values);
  return Object.entries(values).reduce(
    (text, [name, value]) => text.split(`{${name}}`).join(String(value)),
    resolvedText === key ? appResolved === key ? OPTIONAL_TEXT_DEFAULTS[key] ?? key : appResolved : resolvedText
  );
}
