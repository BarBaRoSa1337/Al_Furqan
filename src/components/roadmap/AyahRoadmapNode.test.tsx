import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import AyahRoadmapNode from './AyahRoadmapNode';

jest.mock('../../lib/localization/LocalizationProvider', () => ({
  useLocalization: () => ({ t: (key: string) => key }),
}));

test('renders only the ayah number and remains selectable', () => {
  const onPress = jest.fn();
  const screen = render(<AyahRoadmapNode ayahNumber={5} onPress={onPress} state="current" targetLevelId="level-5" />);

  expect(screen.getByText('5')).toBeTruthy();
  expect(screen.queryByText(/practice|translation|minutes|locked/i)).toBeNull();
  fireEvent.press(screen.getByRole('button'));
  expect(onPress).toHaveBeenCalledWith('level-5');
  expect(JSON.stringify(screen.toJSON())).not.toContain('lock');
});
