import { directionForLocale } from '../../../packages/api-contracts/src';
import { appText } from './catalogs';

test('renders supported interface locales without changing stable keys', () => {
  expect(appText('ar', 'nav.home')).toBe('الرئيسية');
  expect(appText('fr', 'nav.home')).toBe('Accueil');
  expect(appText('en', 'home.ready', { count: 3 })).toBe('3 ready');
});

test('never exposes missing translation keys to learners', () => {
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  expect(appText('fr', 'app.retry')).toBe('Réessayer');
  expect(appText('ar', 'unknown.key')).toBe('النص غير متاح');
  warning.mockRestore();
});

test('localizes level-entry and retained-match workflow copy', () => {
  expect(appText('en', 'levelEntry.startOver')).toBe('Start over');
  expect(appText('ar', 'levelEntry.extraPractice')).toBe('تدريب إضافي');
  expect(appText('fr', 'activity.matchedCorrectly', { prompt: 'A', choice: 'B' })).toBe('A, associé correctement à B');
});

test('keeps screen direction tied to interface locale', () => {
  expect(directionForLocale('ar')).toBe('rtl');
  expect(directionForLocale('en')).toBe('ltr');
  expect(directionForLocale('fr')).toBe('ltr');
});
