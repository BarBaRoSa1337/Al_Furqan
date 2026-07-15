import React from 'react';
import { render } from '@testing-library/react-native';
import Button from './Button';

test('exposes button role and disabled state', () => {
  const screen = render(<Button title="Continue" onPress={jest.fn()} disabled />);
  const button = screen.getByRole('button', { name: 'Continue' });
  expect(button.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
});
