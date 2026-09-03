import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import RoadmapScrubber, { scrubberIndexForPosition } from './RoadmapScrubber';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn() }));

test('maps scrub positions across full long-roadmap range', () => {
  expect(scrubberIndexForPosition(-10, 500, 286)).toBe(0);
  expect(scrubberIndexForPosition(250, 500, 286)).toBe(143);
  expect(scrubberIndexForPosition(600, 500, 286)).toBe(285);
});

test('offers accessible increment and decrement navigation', () => {
  const onSelect = jest.fn();
  const items = [{ id: '1', label: 'Ayah 1', listIndex: 2 }, { id: '2', label: 'Ayah 2', listIndex: 4 }];
  const screen = render(<RoadmapScrubber accessibilityLabel="Navigate" items={items} onSelect={onSelect} />);
  const scrubber = screen.getByLabelText('Navigate');
  fireEvent(scrubber, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
  expect(onSelect).toHaveBeenCalledWith(4);
  fireEvent(scrubber, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
  expect(onSelect).toHaveBeenLastCalledWith(2);
});
