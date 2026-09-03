import React from 'react';
import { render } from '@testing-library/react-native';
import { Path } from 'react-native-svg';
import RoadmapPath from './RoadmapPath';

test('renders one curved line without plant or oval decoration', () => {
  const screen = render(<RoadmapPath fromX={40} height={86} index={2} state="current" toX={220} width={320} />);
  const paths = screen.UNSAFE_getAllByType(Path);

  expect(paths).toHaveLength(1);
  expect(paths[0].props.d).toMatch(/^M 40 0 C /);
  expect(JSON.stringify(screen.toJSON())).not.toMatch(/leaf|ellipse|oval|lock/i);
});
