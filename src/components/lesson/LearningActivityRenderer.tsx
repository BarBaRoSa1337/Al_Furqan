import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { LearningActivity } from '../../types/activities';
import { evaluateActivity } from '../../lib/activities/activityEngine';
import { createActivityEvaluationContext } from '../../lib/activities/activityContext';
import { getContentRepository } from '../../lib/content/repository';
import { packageText } from '../../lib/content/text';
import Card from '../ui/Card';

interface Props {
  activity: LearningActivity;
  onAnswer?: (answer: unknown, correct: boolean) => void | Promise<void>;
}

export default function LearningActivityRenderer({ activity, onAnswer }: Props) {
  if (activity.kind === 'fill_gap' || activity.kind === 'complete_missing_token') return <SequenceActivity activity={activity} ids={activity.config.tokenBankIds} answerLength={activity.config.correctTokenIds.length} onAnswer={onAnswer} />;
  if (activity.kind === 'order_tokens' || activity.kind === 'order_segments') return <SequenceActivity activity={activity} ids={activity.config.itemIds} answerLength={activity.config.correctOrderIds.length} onAnswer={onAnswer} />;
  if (activity.kind === 'match_word_meaning') return <WordMeaningMatch activity={activity} onAnswer={onAnswer} />;
  if (activity.kind === 'match_ayah_translation') return <AyahTranslationMatch activity={activity} onAnswer={onAnswer} />;
  if (activity.kind === 'choose_continuation') return <ContinuationActivity activity={activity} onAnswer={onAnswer} />;
  if (activity.kind === 'order_ayat') return <SequenceActivity activity={activity} ids={activity.config.correctOrderRefs.map(refKey)} answerLength={activity.config.correctOrderRefs.length} onAnswer={onAnswer} />;
  if (activity.kind === 'multiple_choice') return <ChoiceActivity activity={activity} onAnswer={onAnswer} />;
  if (activity.kind === 'type_missing_text') return <TypedActivity activity={activity} onAnswer={onAnswer} />;
  const repo = getContentRepository();
  return <Card><Text style={styles.unsupported}>{packageText(repo, 'content.unsupported')}</Text></Card>;
}

function SequenceActivity({ activity, ids, answerLength, onAnswer }: Props & { ids: string[]; answerLength: number }) {
  const repo = getContentRepository();
  const [choices] = useState(() => shuffle(ids));
  const [answer, setAnswer] = useState<string[]>([]);
  const submission = useSubmission(activity, onAnswer);
  const labels = useMemo(() => new Map(ids.map(id => [id, resolveItemLabel(activity, id)])), [activity, ids]);

  const choose = (id: string) => {
    if (submission.result === true || answer.length >= answerLength) return;
    setAnswer(current => [...current, id]);
    submission.reset();
  };
  const remove = (index: number) => {
    setAnswer(current => current.filter((_, itemIndex) => itemIndex !== index));
    submission.reset();
  };

  return <ActivityCard instruction={activity.instruction}>
    <Text style={styles.hint}>{packageText(repo, 'activity.buildAnswer')}</Text>
    <View accessibilityLabel={packageText(repo, 'activity.selectedAnswer')} style={styles.answerTray}>
      {answer.map((id, index) => <Option key={`${id}:${index}`} label={labels.get(id) ?? id} selected onPress={() => remove(index)} />)}
    </View>
    <View style={styles.options}>{choices.map(id => <Option key={id} label={labels.get(id) ?? id} disabled={answer.includes(id)} onPress={() => choose(id)} />)}</View>
    <SubmitControl disabled={answer.length !== answerLength} {...submission} onPress={() => submission.submit(answer)} />
  </ActivityCard>;
}

function WordMeaningMatch({ activity, onAnswer }: { activity: Extract<LearningActivity, { kind: 'match_word_meaning' }>; onAnswer?: Props['onAnswer'] }) {
  const repo = getContentRepository();
  const meanings = repo.getAyatByRefs(activity.ayahRefs).flatMap(ayah => ayah.wordMeanings ?? []);
  const [layout] = useState(() => createMatchLayout(activity.config.pairs.map(pair => pair.promptTokenId), activity.config.pairs.map(pair => pair.meaningId)));
  const { prompts, choices } = layout;
  return <MatchActivity activity={activity} prompts={prompts.map(id => ({ id, label: repo.getWordToken(id)?.arabicText ?? id }))} choices={choices.map(id => ({ id, label: meanings.find(meaning => meaning.id === id)?.meaning ?? id }))} hint={packageText(repo, 'question.matchHint')} onAnswer={onAnswer} />;
}

function AyahTranslationMatch({ activity, onAnswer }: { activity: Extract<LearningActivity, { kind: 'match_ayah_translation' }>; onAnswer?: Props['onAnswer'] }) {
  const repo = getContentRepository();
  const [layout] = useState(() => createMatchLayout(activity.config.ayahSegments, activity.config.translationSegments));
  const { prompts, choices } = layout;
  return <MatchActivity activity={activity} prompts={prompts.map(segment => ({ id: segment.id, label: segment.tokenIds.map(id => repo.getWordToken(id)?.arabicText ?? id).join(' ') }))} choices={choices.map(segment => ({ id: segment.id, label: segment.text }))} hint={packageText(repo, 'activity.matchTranslationHint')} onAnswer={onAnswer} />;
}

function ContinuationActivity({ activity, onAnswer }: { activity: Extract<LearningActivity, { kind: 'choose_continuation' }>; onAnswer?: Props['onAnswer'] }) {
  const repo = getContentRepository();
  const [options] = useState(() => shuffle(activity.config.optionIds));
  const [answer, setAnswer] = useState<string>();
  const submission = useSubmission(activity, onAnswer);
  const prompt = activity.config.promptTokenIds?.map(id => repo.getWordToken(id)?.arabicText ?? id).join(' ');
  return <ActivityCard instruction={activity.instruction}>
    {prompt ? <Text accessibilityLabel={prompt} style={styles.quranPrompt}>{prompt}</Text> : null}
    <View style={styles.choiceList}>{options.map(id => <Option key={id} label={resolveItemLabel(activity, id)} selected={answer === id} onPress={() => { setAnswer(id); submission.reset(); }} />)}</View>
    <SubmitControl disabled={!answer} {...submission} onPress={() => submission.submit(answer)} />
  </ActivityCard>;
}

function MatchActivity({ activity, prompts, choices, hint, onAnswer }: Props & { prompts: { id: string; label: string }[]; choices: { id: string; label: string }[]; hint: string }) {
  const [activePrompt, setActivePrompt] = useState(prompts[0]?.id);
  const [answer, setAnswer] = useState<Record<string, string>>({});
  const submission = useSubmission(activity, onAnswer);
  return <ActivityCard instruction={activity.instruction}>
    <Text style={styles.hint}>{hint}</Text>
    <View style={styles.options}>{prompts.map(prompt => <Option key={prompt.id} label={prompt.label} selected={activePrompt === prompt.id} onPress={() => setActivePrompt(prompt.id)} />)}</View>
    <View style={styles.options}>{choices.map(choice => {
      const usedByAnotherPrompt = Boolean(activePrompt && Object.entries(answer).some(([promptId, choiceId]) => promptId !== activePrompt && choiceId === choice.id));
      return <Option key={choice.id} label={choice.label} disabled={usedByAnotherPrompt} selected={Boolean(activePrompt && answer[activePrompt] === choice.id)} onPress={() => {
      if (!activePrompt || submission.result === true) return;
      setAnswer(current => ({ ...current, [activePrompt]: choice.id }));
      const next = prompts.find(prompt => !answer[prompt.id] && prompt.id !== activePrompt);
      setActivePrompt(next?.id ?? activePrompt);
      submission.reset();
    }} />; })}</View>
    <SubmitControl disabled={Object.keys(answer).length !== prompts.length} {...submission} onPress={() => submission.submit(answer)} />
  </ActivityCard>;
}

function ChoiceActivity({ activity, onAnswer }: { activity: Extract<LearningActivity, { kind: 'multiple_choice' }>; onAnswer?: Props['onAnswer'] }) {
  const [options] = useState(() => shuffle(activity.config.options));
  const [answer, setAnswer] = useState<string>();
  const submission = useSubmission(activity, onAnswer);
  return <ActivityCard instruction={activity.instruction}><View style={styles.choiceList}>{options.map(option => <Option key={option.id} label={option.text} selected={answer === option.id} onPress={() => { setAnswer(option.id); submission.reset(); }} />)}</View><SubmitControl disabled={!answer} {...submission} onPress={() => submission.submit(answer)} /></ActivityCard>;
}

function TypedActivity({ activity, onAnswer }: { activity: Extract<LearningActivity, { kind: 'type_missing_text' }>; onAnswer?: Props['onAnswer'] }) {
  const repo = getContentRepository();
  const [answer, setAnswer] = useState('');
  const submission = useSubmission(activity, onAnswer);
  return <ActivityCard instruction={activity.instruction}>
    <Text style={styles.hint}>{packageText(repo, 'activity.typeFromMemory')}</Text>
    <TextInput
      accessibilityLabel={packageText(repo, 'activity.typedAnswerLabel')}
      autoCapitalize="none"
      autoCorrect={false}
      multiline
      onChangeText={value => { setAnswer(value); submission.reset(); }}
      placeholder={packageText(repo, 'question.typeAnswer')}
      style={styles.typedInput}
      textAlign="right"
      value={answer}
    />
    <SubmitControl disabled={!answer.trim()} {...submission} onPress={() => submission.submit(answer)} />
  </ActivityCard>;
}

function useSubmission(activity: LearningActivity, onAnswer?: Props['onAnswer']) {
  const [result, setResult] = useState<boolean>();
  const [submitting, setSubmitting] = useState(false);
  return {
    result,
    submitting,
    reset: () => setResult(undefined),
    submit: async (answer: unknown) => {
      if (result === false) { setResult(undefined); return; }
      const evaluation = evaluateActivity(activity, answer, createActivityEvaluationContext(getContentRepository()));
      setSubmitting(true);
      try { await onAnswer?.(answer, evaluation.correct); setResult(evaluation.correct); }
      finally { setSubmitting(false); }
    },
  };
}

function ActivityCard({ instruction, children }: { instruction: string; children: React.ReactNode }) {
  return <Card><Text style={styles.instruction}>{instruction}</Text>{children}</Card>;
}

function Option({ label, selected = false, disabled = false, onPress }: { label: string; selected?: boolean; disabled?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} accessibilityLabel={label} disabled={disabled} style={[styles.option, selected && styles.selected, disabled && styles.used]} onPress={onPress}><Text style={[styles.optionText, containsArabic(label) && styles.rtlText]}>{label}</Text></Pressable>;
}

function SubmitControl({ disabled, submitting, result, onPress }: { disabled: boolean; submitting: boolean; result?: boolean; onPress: () => Promise<void> }) {
  const repo = getContentRepository();
  const locked = disabled || submitting || result === true;
  const label = submitting ? packageText(repo, 'question.checking') : result === true ? packageText(repo, 'question.correct') : result === false ? packageText(repo, 'question.tryAgain') : packageText(repo, 'question.checkAnswer');
  return <Pressable accessibilityRole="button" disabled={locked} style={[styles.submit, locked && styles.disabled]} onPress={() => { void onPress(); }}><Text style={styles.submitText}>{label}</Text></Pressable>;
}

function resolveItemLabel(activity: LearningActivity, id: string): string {
  const repo = getContentRepository();
  if (activity.kind === 'order_segments') return activity.config.segments?.find(segment => segment.id === id)?.tokenIds.map(tokenId => repo.getWordToken(tokenId)?.arabicText ?? tokenId).join(' ') ?? id;
  if (activity.kind === 'choose_continuation') return activity.config.segments?.find(segment => segment.id === id)?.tokenIds.map(tokenId => repo.getWordToken(tokenId)?.arabicText ?? tokenId).join(' ') ?? repo.getWordToken(id)?.arabicText ?? id;
  if (activity.kind === 'order_ayat') {
    const ref = activity.config.correctOrderRefs.find(candidate => refKey(candidate) === id);
    return ref ? repo.getAyahByRef(ref)?.arabicText.text ?? id : id;
  }
  return repo.getWordToken(id)?.arabicText ?? id;
}

function refKey(ref: { surahNumber: number; ayahNumber: number }): string { return `${ref.surahNumber}:${ref.ayahNumber}`; }
function containsArabic(value: string): boolean { return /[\u0600-\u06FF]/.test(value); }

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function createMatchLayout<P, C>(prompts: readonly P[], choices: readonly C[], random: () => number = Math.random): { prompts: P[]; choices: C[] } {
  return { prompts: shuffle(prompts, random), choices: shuffle(choices, random) };
}

const styles = StyleSheet.create({
  unsupported: { color: '#7F8C8D', fontSize: 14, lineHeight: 21 },
  instruction: { fontSize: 17, color: '#2C3E50', lineHeight: 25, marginBottom: 14, fontWeight: '600' },
  hint: { color: '#7F8C8D', marginBottom: 10 },
  quranPrompt: { color: '#1B4F72', fontFamily: 'serif', fontSize: 27, lineHeight: 42, marginBottom: 16, textAlign: 'right', writingDirection: 'rtl' },
  answerTray: { minHeight: 52, flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderWidth: 1, borderColor: '#D5DBDB', borderRadius: 12, padding: 8, marginBottom: 12 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  choiceList: { gap: 8 },
  option: { backgroundColor: '#F5F0E8', borderWidth: 1, borderColor: '#E5DED2', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11 },
  selected: { backgroundColor: '#D4EFDF', borderColor: '#27AE60' },
  optionText: { fontSize: 16, color: '#1B4F72', textAlign: 'center' },
  rtlText: { writingDirection: 'rtl' },
  used: { opacity: 0.3 },
  typedInput: { minHeight: 96, borderWidth: 2, borderColor: '#D5DBDB', borderRadius: 12, padding: 14, color: '#1A1A1A', backgroundColor: '#FFF', fontFamily: 'serif', fontSize: 24, lineHeight: 38, writingDirection: 'rtl' },
  submit: { backgroundColor: '#1B4F72', borderRadius: 10, padding: 13, marginTop: 8, alignItems: 'center' },
  disabled: { opacity: 0.5 },
  submitText: { color: '#FFF', fontWeight: '700' },
});
