import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import SurahRoadmapNode from './SurahRoadmapNode';
import type { SurahRoadmapItem } from './surahRoadmapModel';

const item: SurahRoadmapItem = {
  id: 'surah-114',
  surahNumber: 114,
  arabicName: 'النَّاس',
  englishName: 'Mankind',
  transliteratedName: 'An-Nas',
  ayahCount: 6,
  revelationType: 'Makki',
  state: 'future',
  illustrationKey: 'shield',
  completedLessons: 0,
  totalLessons: 8,
  progress: 0,
};

test('renders complete Surah metadata and keeps future nodes selectable without locks', () => {
  const onPress = jest.fn();
  const screen = render(<SurahRoadmapNode item={item} onPress={onPress} />);

  expect(screen.getByText('النَّاس')).toBeTruthy();
  expect(screen.getByText('An-Nas')).toBeTruthy();
  expect(screen.getByText('Mankind')).toBeTruthy();
  expect(screen.getByText('6 ayat · Makki')).toBeTruthy();
  const button = screen.getByRole('button', { name: /future in the suggested path, open/ });
  fireEvent.press(button);
  expect(onPress).toHaveBeenCalledWith('surah-114');
  expect(JSON.stringify(screen.toJSON())).not.toContain('lock');
});
