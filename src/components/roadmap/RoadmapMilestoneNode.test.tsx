import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import RoadmapMilestoneNode from './RoadmapMilestoneNode';

jest.mock('../../lib/localization/LocalizationProvider', () => ({ useLocalization: () => ({ t: (key: string) => ({ 'roadmap.milestone.context': 'Context', 'roadmap.status.active': 'Current' }[key] ?? key) }) }));

test('renders a labeled milestone and opens its level', () => {
  const onPress = jest.fn();
  const screen = render(<RoadmapMilestoneNode kind="context" onPress={onPress} state="current" targetLevelId="context-1" />);
  expect(screen.getByText('Context')).toBeTruthy();
  expect(screen.queryByText(/^\d+$/)).toBeNull();
  fireEvent.press(screen.getByRole('button'));
  expect(onPress).toHaveBeenCalledWith('context-1');
});
