import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import FurqanHeader from './FurqanHeader';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('../../lib/localization/LocalizationProvider', () => ({
  useLocalization: () => ({
    t: (key: string) => ({
      'header.dayStreak': 'Day streak',
      'header.points': 'Points',
      'nav.menu': 'Menu',
      'nav.closeMenu': 'Close menu',
      'nav.search': 'Search',
      'nav.profile': 'Profile',
      'nav.settings': 'Settings',
    }[key] ?? key),
  }),
}));

test('uses Arabic-only Furqan branding and retains streak and points', () => {
  const screen = render(<FurqanHeader onProfile={jest.fn()} onSearch={jest.fn()} onSettings={jest.fn()} streak={2} xp={240} />);

  expect(screen.getByRole('header', { name: 'الفرقان' })).toBeTruthy();
  expect(screen.queryByText('Furqan')).toBeNull();
  expect(screen.getByLabelText('2 Day streak')).toBeTruthy();
  expect(screen.getByLabelText('240 Points')).toBeTruthy();
});

test('opens compact menu and routes selected action', () => {
  const onSearch = jest.fn();
  const screen = render(<FurqanHeader onProfile={jest.fn()} onSearch={onSearch} onSettings={jest.fn()} streak={2} xp={240} />);
  fireEvent.press(screen.getByRole('button', { name: 'Menu' }));
  fireEvent.press(screen.getByRole('button', { name: 'Search' }));
  expect(onSearch).toHaveBeenCalledTimes(1);
});
