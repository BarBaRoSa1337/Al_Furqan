import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import SurahRoadmapNode from './SurahRoadmapNode';

jest.mock('../../lib/localization/LocalizationProvider', () => ({
  useLocalization: () => ({ t: (key: string) => key }),
}));

test('renders only Arabic and Latin-script Surah names and stays selectable', () => {
  const onPress = jest.fn();
  const screen = render(<SurahRoadmapNode arabicName="النَّاس" englishName="An-Nas" id="surah-114" onPress={onPress} state="upcoming" />);

  expect(screen.getByText('النَّاس')).toBeTruthy();
  expect(screen.getByText('An-Nas')).toBeTruthy();
  expect(screen.queryByText('Mankind')).toBeNull();
  expect(screen.queryByText(/ayat|Makki|0\/8/i)).toBeNull();
  fireEvent.press(screen.getByRole('button'));
  expect(onPress).toHaveBeenCalledWith('surah-114');
  expect(JSON.stringify(screen.toJSON())).not.toContain('lock');
});
