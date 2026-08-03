import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { getContentRepository } from '../../lib/content/repository';
import { colors } from '../../theme/tokens';
import LearningActivityRenderer, { createMatchLayout, derange, shuffle } from './LearningActivityRenderer';

test('shuffles ordering choices without mutating authored stable-ID order', () => {
  const authored = ['token-1', 'token-2', 'token-3'];
  expect(shuffle(authored, () => 0)).not.toEqual(authored);
  expect(authored).toEqual(['token-1', 'token-2', 'token-3']);
});

test('exposes an RTL typed-recall input and evaluates canonical text through the repository', async () => {
  const activity = getContentRepository().getActivityById('l1-type-ayah-1');
  expect(activity?.kind).toBe('type_missing_text');
  if (!activity || activity.kind !== 'type_missing_text') throw new Error('Typed fixture unavailable');
  const onAnswer = jest.fn().mockResolvedValue({ correct: true });
  const screen = render(<LearningActivityRenderer activity={activity} onAnswer={onAnswer} />);
  const input = screen.getByLabelText('Arabic answer from memory');
  fireEvent.changeText(input, 'ألم تر كيف فعل ربك بأصحاب ٱلفيل');
  fireEvent(input, 'submitEditing');
  await waitFor(() => expect(onAnswer).toHaveBeenCalledWith('ألم تر كيف فعل ربك بأصحاب ٱلفيل', false));
  expect(input).toHaveStyle({ writingDirection: 'rtl' });
});

test('creates independently shuffled prompt and choice columns', () => {
  const values = [0.9, 0.1, 0.2, 0.8];
  const layout = createMatchLayout(['p1', 'p2', 'p3'], ['c1', 'c2', 'c3'], () => values.shift() ?? 0);
  expect(layout.prompts).not.toEqual(['p1', 'p2', 'p3']);
  expect(layout.choices).not.toEqual(['c1', 'c2', 'c3']);
  expect(layout.prompts.map(id => id.slice(1))).not.toEqual(layout.choices.map(id => id.slice(1)));
});

test('deranges matching choices so no answer starts on its matching row', () => {
  const authored = ['a', 'b', 'c'];
  const choices = derange(authored, () => 0);
  expect(choices.every((choice, index) => choice !== authored[index])).toBe(true);
});

test('renders word matching as accessible two-column selections and submits stable pairs', async () => {
  const repo = getContentRepository();
  const activity = repo.getActivityById('l1-match-meaning');
  expect(activity?.kind).toBe('match_word_meaning');
  if (!activity || activity.kind !== 'match_word_meaning') throw new Error('Match fixture unavailable');
  const onAnswer = jest.fn().mockResolvedValue({ correct: true });
  const screen = render(<LearningActivityRenderer activity={activity} onAnswer={onAnswer} />);

  activity.config.pairs.forEach(pair => {
    const arabic = repo.getWordToken(pair.promptTokenId)?.arabicText ?? pair.promptTokenId;
    const meaning = repo.getAyatByRefs(activity.ayahRefs).flatMap(ayah => ayah.wordMeanings ?? []).find(item => item.id === pair.meaningId)?.meaning ?? pair.meaningId;
    fireEvent.press(screen.getByRole('button', { name: arabic }));
    fireEvent.press(screen.getByRole('button', { name: meaning }));
  });
  await waitFor(() => expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({
    [activity.config.pairs[0].promptTokenId]: activity.config.pairs[0].meaningId,
    [activity.config.pairs[1].promptTokenId]: activity.config.pairs[1].meaningId,
  }), false));
});

test('keeps vocabulary prompts in authored order and requires an explicit word selection', () => {
  const repo = getContentRepository();
  const activity = repo.getActivityById('l1-match-meaning');
  expect(activity?.kind).toBe('match_word_meaning');
  if (!activity || activity.kind !== 'match_word_meaning') throw new Error('Match fixture unavailable');
  const screen = render(<LearningActivityRenderer activity={activity} />);
  const promptLabels = activity.config.pairs.map(pair => repo.getWordToken(pair.promptTokenId)?.arabicText ?? pair.promptTokenId);
  const promptButtons = screen.getAllByRole('button').filter(button => promptLabels.includes(button.props.accessibilityLabel));

  expect(promptButtons.map(button => button.props.accessibilityLabel)).toEqual(promptLabels);
  expect(promptButtons.every(button => button.props.accessibilityState.selected === false)).toBe(true);

  const firstMeaning = repo.getAyatByRefs(activity.ayahRefs).flatMap(ayah => ayah.wordMeanings ?? []).find(item => item.id === activity.config.pairs[0].meaningId)?.meaning;
  if (!firstMeaning) throw new Error('Meaning fixture unavailable');
  fireEvent.press(screen.getByRole('button', { name: firstMeaning }));
  expect(screen.getByRole('button', { name: firstMeaning }).props.accessibilityState.selected).toBe(false);
});

test('marks an incorrect vocabulary pair red and keeps a correct pair visible in green', () => {
  const repo = getContentRepository();
  const activity = repo.getActivityById('l1-match-meaning');
  expect(activity?.kind).toBe('match_word_meaning');
  if (!activity || activity.kind !== 'match_word_meaning') throw new Error('Match fixture unavailable');
  const screen = render(<LearningActivityRenderer activity={activity} />);
  const [firstPair, secondPair] = activity.config.pairs;
  const firstArabic = repo.getWordToken(firstPair.promptTokenId)?.arabicText ?? firstPair.promptTokenId;
  const secondMeaning = repo.getAyatByRefs(activity.ayahRefs).flatMap(ayah => ayah.wordMeanings ?? []).find(item => item.id === secondPair.meaningId)?.meaning;
  const firstMeaning = repo.getAyatByRefs(activity.ayahRefs).flatMap(ayah => ayah.wordMeanings ?? []).find(item => item.id === firstPair.meaningId)?.meaning;
  if (!secondMeaning || !firstMeaning) throw new Error('Meaning fixture unavailable');

  fireEvent.press(screen.getByRole('button', { name: firstArabic }));
  fireEvent.press(screen.getByRole('button', { name: secondMeaning }));
  expect(screen.getByRole('button', { name: firstArabic })).toHaveStyle({ backgroundColor: colors.dangerSoft });
  expect(screen.getByRole('button', { name: secondMeaning })).toHaveStyle({ backgroundColor: colors.dangerSoft });

  fireEvent.press(screen.getByRole('button', { name: firstMeaning }));
  const matchedLabel = `${firstArabic}, matched correctly with ${firstMeaning}`;
  const matchedButtons = screen.getAllByRole('button', { name: matchedLabel });
  expect(matchedButtons).toHaveLength(2);
  matchedButtons.forEach(button => {
    expect(button).toHaveStyle({ backgroundColor: colors.successSoft });
    expect(button.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true, selected: true }));
  });
});

test('renders canonical continuation segments and submits the stable option ID', async () => {
  const repo = getContentRepository();
  const activity = repo.getActivityById('l2-continuation-2');
  expect(activity?.kind).toBe('choose_continuation');
  if (!activity || activity.kind !== 'choose_continuation' || !activity.config.segments) throw new Error('Continuation fixture unavailable');
  const correct = activity.config.segments.find(segment => segment.id === activity.config.correctOptionId);
  if (!correct) throw new Error('Continuation answer unavailable');
  const label = correct.tokenIds.map(id => repo.getWordToken(id)?.arabicText).join(' ');
  const onAnswer = jest.fn().mockResolvedValue({ correct: true });
  const screen = render(<LearningActivityRenderer activity={activity} onAnswer={onAnswer} />);

  fireEvent.press(screen.getByRole('button', { name: label }));
  expect(screen.getByRole('button', { name: label }).props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
  await waitFor(() => expect(onAnswer).toHaveBeenCalledWith(activity.config.correctOptionId, false));
});

test('orders canonical ayat while submitting stable reference keys', async () => {
  const repo = getContentRepository();
  const activity = repo.getActivityById('al-fil-review-order-ayat');
  expect(activity?.kind).toBe('order_ayat');
  if (!activity || activity.kind !== 'order_ayat') throw new Error('Ayah order fixture unavailable');
  const labels = activity.config.correctOrderRefs.map(ref => repo.getAyahByRef(ref)?.arabicText.text ?? '');
  const onAnswer = jest.fn().mockResolvedValue({ correct: true });
  const screen = render(<LearningActivityRenderer activity={activity} onAnswer={onAnswer} />);
  const optionButtons = labels.map(label => screen.getByRole('button', { name: label }));

  optionButtons.forEach(button => fireEvent.press(button));
  await waitFor(() => expect(onAnswer).toHaveBeenCalledWith(['105:1', '105:2', '105:3', '105:4', '105:5'], false));
});
