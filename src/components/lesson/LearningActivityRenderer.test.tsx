import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { getContentRepository } from '../../lib/content/repository';
import LearningActivityRenderer, { createMatchLayout, shuffle } from './LearningActivityRenderer';

test('shuffles ordering choices without mutating authored stable-ID order', () => {
  const authored = ['token-1', 'token-2', 'token-3'];
  expect(shuffle(authored, () => 0)).not.toEqual(authored);
  expect(authored).toEqual(['token-1', 'token-2', 'token-3']);
});

test('exposes an RTL typed-recall input and evaluates canonical text through the repository', async () => {
  const activity = getContentRepository().getActivityById('l1-type-ayah-1');
  expect(activity?.kind).toBe('type_missing_text');
  if (!activity || activity.kind !== 'type_missing_text') throw new Error('Typed fixture unavailable');
  const onAnswer = jest.fn();
  const screen = render(<LearningActivityRenderer activity={activity} onAnswer={onAnswer} />);
  const input = screen.getByLabelText('Arabic answer from memory');
  fireEvent.changeText(input, 'ألم تر كيف فعل ربك بأصحاب ٱلفيل');
  fireEvent.press(screen.getByRole('button', { name: 'Check Answer' }));
  await waitFor(() => expect(onAnswer).toHaveBeenCalledWith('ألم تر كيف فعل ربك بأصحاب ٱلفيل', true));
  expect(input).toHaveStyle({ writingDirection: 'rtl' });
});

test('creates independently shuffled prompt and choice columns', () => {
  const values = [0.9, 0.1, 0.2, 0.8];
  const layout = createMatchLayout(['p1', 'p2', 'p3'], ['c1', 'c2', 'c3'], () => values.shift() ?? 0);
  expect(layout.prompts).not.toEqual(['p1', 'p2', 'p3']);
  expect(layout.choices).not.toEqual(['c1', 'c2', 'c3']);
  expect(layout.prompts.map(id => id.slice(1))).not.toEqual(layout.choices.map(id => id.slice(1)));
});

test('renders canonical continuation segments and submits the stable option ID', async () => {
  const repo = getContentRepository();
  const activity = repo.getActivityById('l2-continuation-2');
  expect(activity?.kind).toBe('choose_continuation');
  if (!activity || activity.kind !== 'choose_continuation' || !activity.config.segments) throw new Error('Continuation fixture unavailable');
  const correct = activity.config.segments.find(segment => segment.id === activity.config.correctOptionId);
  if (!correct) throw new Error('Continuation answer unavailable');
  const label = correct.tokenIds.map(id => repo.getWordToken(id)?.arabicText).join(' ');
  const onAnswer = jest.fn();
  const screen = render(<LearningActivityRenderer activity={activity} onAnswer={onAnswer} />);

  fireEvent.press(screen.getByRole('button', { name: label }));
  expect(screen.getByRole('button', { name: label }).props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
  fireEvent.press(screen.getByRole('button', { name: 'Check Answer' }));

  await waitFor(() => expect(onAnswer).toHaveBeenCalledWith(activity.config.correctOptionId, true));
});

test('orders canonical ayat while submitting stable reference keys', async () => {
  const repo = getContentRepository();
  const activity = repo.getActivityById('l3-order-ayat-3-4');
  expect(activity?.kind).toBe('order_ayat');
  if (!activity || activity.kind !== 'order_ayat') throw new Error('Ayah order fixture unavailable');
  const labels = activity.config.correctOrderRefs.map(ref => repo.getAyahByRef(ref)?.arabicText.text ?? '');
  const onAnswer = jest.fn();
  const screen = render(<LearningActivityRenderer activity={activity} onAnswer={onAnswer} />);
  const optionButtons = labels.map(label => screen.getByRole('button', { name: label }));

  optionButtons.forEach(button => fireEvent.press(button));
  fireEvent.press(screen.getByRole('button', { name: 'Check Answer' }));

  await waitFor(() => expect(onAnswer).toHaveBeenCalledWith(['105:3', '105:4'], true));
});
