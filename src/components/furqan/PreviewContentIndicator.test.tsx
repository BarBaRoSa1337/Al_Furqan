import React from 'react';
import { render } from '@testing-library/react-native';
import PreviewContentIndicator from './PreviewContentIndicator';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('../../lib/localization/LocalizationProvider', () => ({
  useLocalization: () => ({ t: (key: string) => key === 'content.previewIndicator' ? 'Preview content' : key }),
}));

test('announces a single preview content indicator', async () => {
  const screen = render(<PreviewContentIndicator />);

  expect(await screen.findAllByText('Preview content')).toHaveLength(1);
  expect(screen.getByLabelText('Preview content')).toBeTruthy();
});
