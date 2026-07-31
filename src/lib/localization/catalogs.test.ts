import { appText } from './catalogs';

test('renders supported interface locales without changing stable keys', () => {
  expect(appText('ar', 'nav.home')).toBe('الرئيسية');
  expect(appText('fr', 'nav.home')).toBe('Accueil');
  expect(appText('en', 'home.ready', { count: 3 })).toBe('3 ready');
});

test('falls back to English for missing generic interface copy', () => {
  expect(appText('fr', 'app.retry')).toBe('Réessayer');
  expect(appText('ar', 'unknown.key')).toBe('unknown.key');
});

test('localizes level-entry and retained-match workflow copy', () => {
  expect(appText('en', 'levelEntry.startOver')).toBe('Start over');
  expect(appText('ar', 'levelEntry.extraPractice')).toBe('تدريب إضافي');
  expect(appText('fr', 'activity.matchedCorrectly', { prompt: 'A', choice: 'B' })).toBe('A, associé correctement à B');
});
