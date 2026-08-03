import React, { useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ExerciseSubmissionResult, LearningActivity } from '../../types/activities';
import { getContentRepository } from '../../lib/content/repository';
import { packageText } from '../../lib/content/text';
import Card from '../ui/Card';
import { colors, fonts, radii, spacing } from '../../theme/tokens';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface Props {
  activity: LearningActivity;
  onAnswer?: (answer: unknown, correct: boolean) => Promise<ExerciseSubmissionResult>;
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
  const [result, setResult] = useState<boolean>();
  const shakeStyle = useIncorrectShake(result === false);
  const labels = useMemo(() => new Map(ids.map(id => [id, resolveItemLabel(activity, id)])), [activity, ids]);
  const isAyahOrder = activity.kind === 'order_ayat';

  const choose = async (id: string) => {
    if (answer.length >= answerLength || result !== undefined) return;
    const nextAnswer = [...answer, id];
    setAnswer(nextAnswer);
    if (nextAnswer.length === answerLength && onAnswer) {
      const submission = await onAnswer(nextAnswer, false);
      setResult(submission.correct);
      AccessibilityInfo.announceForAccessibility(submission.correct ? 'Correct' : 'Incorrect. This exercise will return later.');
    }
  };
  const remove = (index: number) => {
    setAnswer(current => current.filter((_, itemIndex) => itemIndex !== index));
    void onAnswer?.(answer.filter((_, itemIndex) => itemIndex !== index), false);
  };

  const expected = activity.kind === 'fill_gap' || activity.kind === 'complete_missing_token'
    ? activity.config.correctTokenIds
    : activity.kind === 'order_tokens' || activity.kind === 'order_segments'
      ? activity.config.correctOrderIds
      : activity.kind === 'order_ayat' ? activity.config.correctOrderRefs.map(refKey) : [];
  return <Animated.View style={shakeStyle}><ActivityCard instruction={activity.instruction}>
    <Text style={styles.hint}>{packageText(repo, 'activity.buildAnswer')}</Text>
    <View accessibilityLabel={packageText(repo, 'activity.selectedAnswer')} style={[styles.answerTray, isAyahOrder ? styles.ayahStack : styles.answerSequence]}>
      {answer.map((id, index) => <Option key={`${id}:${index}`} label={labels.get(id) ?? id} selected={result === undefined} correct={result !== undefined && expected[index] === id} incorrect={result === false && expected[index] !== id} disabled={result !== undefined} fullWidth={isAyahOrder} marker={String(index + 1)} onPress={() => remove(index)} />)}
    </View>
    <View style={[styles.options, isAyahOrder ? styles.ayahStack : styles.rtlSequence]}>
      {choices.map(id => <Option key={id} label={labels.get(id) ?? id} disabled={answer.includes(id)} fullWidth={isAyahOrder} onPress={() => choose(id)} />)}
    </View>
  </ActivityCard></Animated.View>;
}

function WordMeaningMatch({ activity, onAnswer }: { activity: Extract<LearningActivity, { kind: 'match_word_meaning' }>; onAnswer?: Props['onAnswer'] }) {
  const repo = getContentRepository();
  const meanings = repo.getAyatByRefs(activity.ayahRefs).flatMap(ayah => ayah.wordMeanings ?? []);
  const promptIds = activity.config.pairs.map(pair => pair.promptTokenId);
  const [meaningIds] = useState(() => derange(activity.config.pairs.map(pair => pair.meaningId)));
  return <MatchActivity activity={activity} prompts={promptIds.map(id => ({ id, label: repo.getWordToken(id)?.arabicText ?? id }))} choices={meaningIds.map(id => ({ id, label: meanings.find(meaning => meaning.id === id)?.meaning ?? id }))} hint={packageText(repo, 'activity.matchWordPrompt')} promptLabel={packageText(repo, 'content.wordByWord')} onAnswer={onAnswer} />;
}

function AyahTranslationMatch({ activity, onAnswer }: { activity: Extract<LearningActivity, { kind: 'match_ayah_translation' }>; onAnswer?: Props['onAnswer'] }) {
  const repo = getContentRepository();
  const [layout] = useState(() => {
    const prompts = shuffle(activity.config.ayahSegments);
    const alignedChoices = prompts.map(prompt => {
      const choiceId = activity.config.pairs.find(pair => pair.ayahSegmentId === prompt.id)?.translationSegmentId;
      return activity.config.translationSegments.find(choice => choice.id === choiceId)!;
    });
    return { prompts, choices: derange(alignedChoices) };
  });
  return <MatchActivity activity={activity} prompts={layout.prompts.map(segment => ({ id: segment.id, label: segment.tokenIds.map(id => repo.getWordToken(id)?.arabicText ?? id).join(' ') }))} choices={layout.choices.map(segment => ({ id: segment.id, label: segment.text }))} hint={packageText(repo, 'activity.matchTranslationHint')} promptLabel={packageText(repo, 'activity.quranPhrase')} onAnswer={onAnswer} />;
}

function ContinuationActivity({ activity, onAnswer }: { activity: Extract<LearningActivity, { kind: 'choose_continuation' }>; onAnswer?: Props['onAnswer'] }) {
  const repo = getContentRepository();
  const [options] = useState(() => shuffle(activity.config.optionIds));
  const [answer, setAnswer] = useState<string>();
  const [result, setResult] = useState<boolean>();
  const [submitting, setSubmitting] = useState(false);
  const shakeStyle = useIncorrectShake(result === false);
  const prompt = activity.config.promptTokenIds?.map(id => repo.getWordToken(id)?.arabicText ?? id).join(' ');
  const submit = async (id: string) => {
    if (result !== undefined || submitting) return;
    setSubmitting(true);
    setAnswer(id);
    const submission = await onAnswer?.(id, false);
    if (submission) setResult(submission.correct);
    setSubmitting(false);
  };
  return <Animated.View style={shakeStyle}><ActivityCard instruction={activity.instruction}>
    {prompt ? <Text accessibilityLabel={prompt} style={styles.quranPrompt}>{prompt}</Text> : null}
    <View style={styles.choiceList}>{options.map(id => <Option key={id} label={resolveItemLabel(activity, id)} fullWidth selected={answer === id && result === undefined} correct={answer === id && result === true} incorrect={answer === id && result === false} disabled={submitting || result !== undefined} onPress={() => { void submit(id); }} />)}</View>
  </ActivityCard></Animated.View>;
}

function MatchActivity({ activity, prompts, choices, hint, promptLabel, onAnswer }: Props & { prompts: { id: string; label: string }[]; choices: { id: string; label: string }[]; hint: string; promptLabel: string }) {
  const repo = getContentRepository();
  const [activePrompt, setActivePrompt] = useState<string>();
  const [matchedPairs, setMatchedPairs] = useState<Record<string, string>>({});
  const [incorrectPair, setIncorrectPair] = useState<{ promptId: string; choiceId: string }>();
  const matchedCount = Object.keys(matchedPairs).length;

  const choose = (choiceId: string) => {
    if (!activePrompt) return;
    if (isCorrectMatch(activity, activePrompt, choiceId)) {
      const nextPairs = { ...matchedPairs, [activePrompt]: choiceId };
      setMatchedPairs(nextPairs);
      setIncorrectPair(undefined);
      setActivePrompt(undefined);
      if (Object.keys(nextPairs).length === prompts.length) void onAnswer?.(nextPairs, false);
    } else {
      setIncorrectPair({ promptId: activePrompt, choiceId });
    }
  };

  return <ActivityCard instruction={activity.instruction}>
    <Text style={styles.hint}>{hint}</Text>
    <Text accessibilityLiveRegion="polite" style={styles.matchProgress}>{packageText(repo, 'activity.matchProgress', { current: matchedCount, total: prompts.length })}</Text>
    <View style={styles.matchColumns}>
      <View style={styles.matchColumn}>
        <Text style={styles.columnLabel}>{promptLabel}</Text>
        {prompts.map(prompt => {
          const choiceId = matchedPairs[prompt.id];
          const choice = choices.find(candidate => candidate.id === choiceId);
          const matchedLabel = choice ? packageText(repo, 'activity.matchedCorrectly', { prompt: prompt.label, choice: choice.label }) : undefined;
          return <Option key={prompt.id} label={prompt.label} accessibilityLabel={matchedLabel} correct={Boolean(choiceId)} disabled={Boolean(choiceId)} selected={activePrompt === prompt.id} incorrect={incorrectPair?.promptId === prompt.id} onPress={() => { setActivePrompt(prompt.id); setIncorrectPair(undefined); }} />;
        })}
      </View>
      <View style={styles.matchColumn}>
        <Text style={styles.columnLabel}>{packageText(repo, 'content.translation')}</Text>
        {choices.map(choice => {
          const used = Object.values(matchedPairs).includes(choice.id);
          const prompt = used ? prompts.find(candidate => matchedPairs[candidate.id] === choice.id) : undefined;
          const matchedLabel = prompt ? packageText(repo, 'activity.matchedCorrectly', { prompt: prompt.label, choice: choice.label }) : undefined;
          return <Option key={choice.id} label={choice.label} accessibilityLabel={matchedLabel} correct={used} disabled={used} selected={incorrectPair?.choiceId === choice.id} incorrect={incorrectPair?.choiceId === choice.id} onPress={() => choose(choice.id)} />;
        })}
      </View>
    </View>
  </ActivityCard>;
}

function ChoiceActivity({ activity, onAnswer }: { activity: Extract<LearningActivity, { kind: 'multiple_choice' }>; onAnswer?: Props['onAnswer'] }) {
  const [options] = useState(() => shuffle(activity.config.options));
  const [answer, setAnswer] = useState<string>();
  const [result, setResult] = useState<boolean>();
  const [submitting, setSubmitting] = useState(false);
  const shakeStyle = useIncorrectShake(result === false);
  const submit = async (id: string) => {
    if (result !== undefined || submitting) return;
    setSubmitting(true);
    setAnswer(id);
    const submission = await onAnswer?.(id, false);
    if (submission) setResult(submission.correct);
    setSubmitting(false);
  };
  return <Animated.View style={shakeStyle}><ActivityCard instruction={activity.instruction}><View style={styles.choiceList}>{options.map(option => <Option key={option.id} label={option.text} fullWidth selected={answer === option.id && result === undefined} correct={answer === option.id && result === true} incorrect={answer === option.id && result === false} disabled={submitting || result !== undefined} onPress={() => { void submit(option.id); }} />)}</View></ActivityCard></Animated.View>;
}

function TypedActivity({ activity, onAnswer }: { activity: Extract<LearningActivity, { kind: 'type_missing_text' }>; onAnswer?: Props['onAnswer'] }) {
  const repo = getContentRepository();
  const [answer, setAnswer] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [result, setResult] = useState<boolean>();
  const [submitting, setSubmitting] = useState(false);
  const shakeStyle = useIncorrectShake(result === false);
  const updateAnswer = (value: string) => { if (result === undefined) setAnswer(value); };
  const submit = async () => {
    if (!answer.trim() || result !== undefined || submitting) return;
    setSubmitting(true);
    const submission = await onAnswer?.(answer, false);
    if (submission) setResult(submission.correct);
    setSubmitting(false);
  };
  return <Animated.View style={shakeStyle}><ActivityCard instruction={activity.instruction}>
    <Text style={styles.hint}>{packageText(repo, 'activity.typeFromMemory')}</Text>
    <TextInput accessibilityLabel={packageText(repo, 'activity.typedAnswerLabel')} autoCapitalize="none" autoCorrect={false} editable={result === undefined} enterKeyHint="done" multiline onChangeText={updateAnswer} onSubmitEditing={() => { void submit(); }} placeholder={packageText(repo, 'question.typeAnswer')} returnKeyType="done" submitBehavior="blurAndSubmit" style={[styles.typedInput, result === true && styles.typedCorrect, result === false && styles.typedIncorrect]} textAlign="right" value={answer} />
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: keyboardVisible }} accessibilityLabel={packageText(repo, keyboardVisible ? 'activity.hideArabicKeyboard' : 'activity.showArabicKeyboard')} style={styles.keyboardToggle} onPress={() => setKeyboardVisible(visible => !visible)}>
      <Text style={styles.keyboardToggleText}>{packageText(repo, keyboardVisible ? 'activity.hideArabicKeyboard' : 'activity.showArabicKeyboard')}</Text>
    </Pressable>
    {keyboardVisible ? <ArabicKeyboard repo={repo} onInput={value => updateAnswer(`${answer}${value}`)} onBackspace={() => updateAnswer(answer.slice(0, -1))} onDone={() => { void submit(); }} /> : null}
  </ActivityCard></Animated.View>;
}

const ARABIC_KEY_ROWS = [
  ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع'],
  ['ه', 'خ', 'ح', 'ج', 'د', 'ش', 'س'],
  ['ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك'],
  ['ظ', 'ط', 'ذ', 'د', 'ز', 'ر', 'و'],
  ['ء', 'أ', 'إ', 'آ', 'ى', 'ة'],
] as const;

function ArabicKeyboard({ repo, onInput, onBackspace, onDone }: { repo: ReturnType<typeof getContentRepository>; onInput: (value: string) => void; onBackspace: () => void; onDone: () => void }) {
  return <View accessibilityLabel={packageText(repo, 'activity.arabicKeyboard')} style={styles.keyboard}>
    {ARABIC_KEY_ROWS.map((row, rowIndex) => <View key={rowIndex} style={styles.keyboardRow}>{row.map(key => <Pressable key={key} accessibilityRole="button" accessibilityLabel={key} style={styles.keyboardKey} onPress={() => onInput(key)}><Text style={styles.keyboardKeyText}>{key}</Text></Pressable>)}</View>)}
    <View style={styles.keyboardRow}>
      <Pressable accessibilityRole="button" accessibilityLabel={packageText(repo, 'activity.keyboardBackspace')} style={[styles.keyboardKey, styles.keyboardAction]} onPress={onBackspace}><Text style={styles.keyboardActionText}>⌫</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={packageText(repo, 'activity.keyboardSpace')} style={[styles.keyboardKey, styles.keyboardSpace]} onPress={() => onInput(' ')}><Text style={styles.keyboardActionText}>{packageText(repo, 'activity.keyboardSpace')}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Done" style={[styles.keyboardKey, styles.keyboardDone]} onPress={onDone}><Ionicons name="checkmark" size={20} color={colors.surface} /></Pressable>
    </View>
  </View>;
}

function useIncorrectShake(active: boolean) {
  const reducedMotion = useReducedMotion();
  const translateX = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (!active || reducedMotion) return;
    Animated.sequence([-7, 7, -5, 5, 0].map(value => Animated.timing(translateX, { duration: 45, toValue: value, useNativeDriver: true }))).start();
  }, [active, reducedMotion, translateX]);
  return { transform: [{ translateX }] };
}

function ActivityCard({ instruction, children }: { instruction: string; children: React.ReactNode }) {
  return <Card style={styles.card}><Text style={styles.instruction}>{instruction}</Text>{children}</Card>;
}

function Option({ label, accessibilityLabel, selected = false, disabled = false, fullWidth = false, incorrect = false, correct = false, marker, onPress }: { label: string; accessibilityLabel?: string; selected?: boolean; disabled?: boolean; fullWidth?: boolean; incorrect?: boolean; correct?: boolean; marker?: string; onPress: () => void }) {
  const arabic = containsArabic(label);
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: selected || correct, disabled }} accessibilityLabel={accessibilityLabel ?? (marker ? `${label}, ${marker}` : label)} disabled={disabled} style={[styles.option, fullWidth && styles.optionFullWidth, selected && !incorrect && !correct && styles.selected, correct && styles.correct, incorrect && styles.incorrect, disabled && !correct && styles.used]} onPress={onPress}>
    <Text style={[styles.optionText, arabic && styles.rtlText]}>{label}</Text>
    {correct ? <Ionicons name="checkmark-circle" size={17} color={colors.success} /> : null}
    {marker ? <Text style={styles.optionMarker}>{marker}</Text> : null}
  </Pressable>;
}

function isCorrectMatch(activity: LearningActivity, promptId: string, choiceId: string): boolean {
  if (activity.kind === 'match_word_meaning') return activity.config.pairs.some(pair => pair.promptTokenId === promptId && pair.meaningId === choiceId);
  if (activity.kind === 'match_ayah_translation') return activity.config.pairs.some(pair => pair.ayahSegmentId === promptId && pair.translationSegmentId === choiceId);
  return false;
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

export function derange<T>(items: readonly T[], random: () => number = Math.random): T[] {
  if (items.length < 2) return [...items];
  const offset = 1 + Math.floor(random() * (items.length - 1));
  return items.map((_, index) => items[(index + offset) % items.length]);
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border },
  unsupported: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  instruction: { color: colors.text, fontSize: 18, fontWeight: '800', lineHeight: 26, marginBottom: spacing.md },
  hint: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: spacing.sm },
  quranPrompt: { color: colors.primary, fontFamily: fonts.arabic, fontSize: 29, lineHeight: 46, marginBottom: spacing.md, textAlign: 'right', writingDirection: 'rtl' },
  answerTray: { backgroundColor: colors.primarySoft, borderWidth: 2, borderColor: colors.primary, borderRadius: radii.lg, minHeight: 66, padding: spacing.sm, marginBottom: spacing.md },
  answerSequence: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.sm },
  rtlSequence: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.sm },
  ayahStack: { gap: spacing.sm },
  options: { marginBottom: spacing.md },
  choiceList: { gap: spacing.sm },
  option: { alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, flexDirection: 'row', gap: spacing.xs, justifyContent: 'center', minHeight: 46, paddingHorizontal: spacing.md, paddingVertical: 10 },
  optionFullWidth: { width: '100%' },
  selected: { backgroundColor: colors.successSoft, borderColor: colors.success },
  correct: { backgroundColor: colors.successSoft, borderColor: colors.success, borderWidth: 2 },
  incorrect: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
  used: { opacity: 0.42 },
  optionText: { color: colors.text, flexShrink: 1, fontSize: 16, textAlign: 'center' },
  rtlText: { fontFamily: fonts.arabic, fontSize: 22, lineHeight: 32, textAlign: 'right', writingDirection: 'rtl' },
  optionMarker: { color: colors.success, fontSize: 11, fontWeight: '800' },
  matchProgress: { color: colors.primary, fontSize: 13, fontWeight: '800', marginBottom: spacing.md },
  matchColumns: { flexDirection: 'row-reverse', gap: spacing.sm, marginBottom: spacing.md },
  matchColumn: { flex: 1, gap: spacing.sm },
  columnLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  typedInput: { minHeight: 96, borderWidth: 2, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, color: colors.text, backgroundColor: colors.surface, fontFamily: fonts.arabic, fontSize: 26, lineHeight: 40, writingDirection: 'rtl' },
  typedCorrect: { backgroundColor: colors.successSoft, borderColor: colors.success },
  typedIncorrect: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
  keyboardToggle: { alignItems: 'center', marginTop: spacing.sm, paddingVertical: spacing.sm },
  keyboardToggleText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  keyboard: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, gap: spacing.xs, marginTop: spacing.xs, padding: spacing.sm },
  keyboardRow: { flexDirection: 'row-reverse', gap: spacing.xs, justifyContent: 'center' },
  keyboardKey: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.sm, borderWidth: 1, justifyContent: 'center', minHeight: 40, minWidth: 34, paddingHorizontal: spacing.xs },
  keyboardKeyText: { color: colors.text, fontFamily: fonts.arabic, fontSize: 21 },
  keyboardAction: { minWidth: 48 },
  keyboardSpace: { flex: 1, maxWidth: 180 },
  keyboardDone: { backgroundColor: colors.success, minWidth: 48 },
  keyboardActionText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
});
