import { isPreviewContentMode, resolveContentMode, validationModeForContentMode } from './contentMode';

test('enables preview only for the explicit preview value', () => {
  expect(resolveContentMode('preview')).toBe('preview');
  expect(resolveContentMode(' PREVIEW ')).toBe('preview');
  expect(isPreviewContentMode('preview')).toBe(true);
});

test('defaults missing or invalid values to production', () => {
  expect(resolveContentMode('')).toBe('production');
  expect(resolveContentMode('development')).toBe('production');
  expect(validationModeForContentMode('production')).toBe('production');
});
