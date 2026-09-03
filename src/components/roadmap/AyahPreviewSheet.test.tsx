import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import AyahPreviewSheet from './AyahPreviewSheet';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));
jest.mock('../../lib/localization/LocalizationProvider', () => ({ useLocalization: () => ({ direction: 'ltr', t: (key: string, values?: { number?: number }) => ({ 'roadmap.preview.ayah': `Ayah ${values?.number}`, 'roadmap.preview.start': 'Start', 'roadmap.preview.continue': 'Continue', 'roadmap.preview.close': 'Close' }[key] ?? key) }) }));

test('shows canonical Arabic, localized translation, and starts target level', () => {
  const onStart = jest.fn();
  const screen = render(<AyahPreviewSheet data={{ ayahNumber: 1, arabicText: 'قُلْ', translation: 'Say', targetLevelId: 'level-1' }} onClose={jest.fn()} onStart={onStart} />);
  expect(screen.getByText('قُلْ')).toBeTruthy();
  expect(screen.getByText('Say')).toBeTruthy();
  fireEvent.press(screen.getByText('Start'));
  expect(onStart).toHaveBeenCalledWith('level-1');
});
