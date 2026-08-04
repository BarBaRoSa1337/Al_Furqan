import React from 'react';
import { render } from '@testing-library/react-native';
import FurqanHeader from './FurqanHeader';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('../../lib/localization/LocalizationProvider', () => ({
  useLocalization: () => ({
    t: (key: string) => key === 'header.dayStreak' ? 'Day streak' : 'Points',
  }),
}));

test('uses Arabic-only Furqan branding and retains streak and points', () => {
  const screen = render(<FurqanHeader streak={2} xp={240} />);

  expect(screen.getByRole('header', { name: 'الفرقان' })).toBeTruthy();
  expect(screen.queryByText('Furqan')).toBeNull();
  expect(screen.getByLabelText('2 Day streak')).toBeTruthy();
  expect(screen.getByLabelText('240 Points')).toBeTruthy();
});
