import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  LessonBlock,
  AyahLessonBlock,
  TafsirLessonBlock,
  StoryLessonBlock,
  QuizLessonBlock,
  ImageLessonBlock,
  AudioLessonBlock,
  SummaryLessonBlock,
  WordMeaningLessonBlock,
} from '../../types/content';

import QuranAyahBlock from './blocks/QuranAyahBlock';
import TafsirCardBlock from './blocks/TafsirCardBlock';
import StoryCardBlock from './blocks/StoryCardBlock';
import SummaryBlock from './blocks/SummaryBlock';
import ImageBlock from './blocks/ImageBlock';
import AudioBlock from './blocks/AudioBlock';

const WordMeaningBlock: React.FC<{ block: WordMeaningLessonBlock }> = ({ block }) => {
  return (
    <View style={wordStyles.container}>
      <Text style={wordStyles.title}>Word by Word</Text>
      {block.content.words.map((word, index) => (
        <View key={`${word.arabic}-${index}`} style={wordStyles.row}>
          <Text style={wordStyles.arabic}>{word.arabic}</Text>
          <View style={wordStyles.meaning}>
            <Text style={wordStyles.transliteration}>{word.transliteration}</Text>
            <Text style={wordStyles.text}>{word.meaning}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const wordStyles = StyleSheet.create({
  container: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16 },
  title: { fontSize: 14, fontWeight: '700', color: '#1B4F72', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  arabic: { width: 90, fontSize: 22, fontFamily: 'serif', textAlign: 'right', color: '#1B4F72' },
  meaning: { flex: 1, marginLeft: 14 },
  transliteration: { fontSize: 13, color: '#7F8C8D', fontStyle: 'italic', marginBottom: 2 },
  text: { fontSize: 14, color: '#2C3E50', fontWeight: '600' },
});

interface QuizBlockProps {
  block: QuizLessonBlock;
  onAnswer?: (blockId: string, answerIndex: number, correct: boolean) => void;
}

// Inline quiz renderer — kept here to avoid circular deps, can be extracted later
const InlineQuizBlock: React.FC<QuizBlockProps> = ({ block, onAnswer }) => {
  const [selected, setSelected] = React.useState<number | null>(null);
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = () => {
    if (selected === null) return;
    setSubmitted(true);
    const correct = selected === block.content.correctAnswer;
    onAnswer?.(block.id, selected, correct);
  };

  return (
    <View style={quizStyles.container}>
      <Text style={quizStyles.badge}>Quiz</Text>
      <Text style={quizStyles.question}>{block.content.question}</Text>
      {block.content.options?.map((opt, i) => {
        const isSelected = selected === i;
        const isCorrect = submitted && i === block.content.correctAnswer;
        const isWrong = submitted && isSelected && i !== block.content.correctAnswer;
        return (
          <View
            key={i}
            style={[
              quizStyles.option,
              isSelected && !submitted && quizStyles.optionSelected,
              isCorrect && quizStyles.optionCorrect,
              isWrong && quizStyles.optionWrong,
            ]}
          >
            <Text
              style={[quizStyles.optionText, (isCorrect || (isSelected && !submitted)) && quizStyles.optionTextSelected]}
              onPress={() => !submitted && setSelected(i)}
            >
              {opt}
            </Text>
          </View>
        );
      })}
      {!submitted ? (
        <Text
          style={[quizStyles.submitBtn, selected === null && quizStyles.submitDisabled]}
          onPress={selected !== null ? handleSubmit : undefined}
        >
          Check Answer
        </Text>
      ) : (
        <View style={quizStyles.result}>
          <Text style={[
            quizStyles.resultText,
            selected === block.content.correctAnswer ? quizStyles.resultCorrect : quizStyles.resultWrong,
          ]}>
            {selected === block.content.correctAnswer ? '✅ Correct!' : '❌ Not quite.'}
          </Text>
          {block.content.explanation ? (
            <Text style={quizStyles.explanation}>{block.content.explanation}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
};

const quizStyles = StyleSheet.create({
  container: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, borderLeftWidth: 4, borderLeftColor: '#6C3483' },
  badge: { fontSize: 11, fontWeight: '700', color: '#6C3483', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  question: { fontSize: 17, color: '#1A1A1A', fontWeight: '600', lineHeight: 26, marginBottom: 16 },
  option: { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: 'transparent' },
  optionSelected: { borderColor: '#1B4F72', backgroundColor: '#EBF5FB' },
  optionCorrect: { borderColor: '#1E8449', backgroundColor: '#D5F5E3' },
  optionWrong: { borderColor: '#C0392B', backgroundColor: '#FDEDEC' },
  optionText: { fontSize: 15, color: '#333', lineHeight: 22 },
  optionTextSelected: { fontWeight: '600' },
  submitBtn: { backgroundColor: '#1B4F72', borderRadius: 10, padding: 14, textAlign: 'center', color: '#FFF', fontWeight: '700', fontSize: 15, marginTop: 4 },
  submitDisabled: { backgroundColor: '#AAA' },
  result: { marginTop: 8 },
  resultText: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  resultCorrect: { color: '#1E8449' },
  resultWrong: { color: '#C0392B' },
  explanation: { fontSize: 14, color: '#555', lineHeight: 22, backgroundColor: '#F9F9F9', padding: 12, borderRadius: 8 },
});

// ─── Main Block Renderer ──────────────────────────────────────────────────

interface BlockRendererProps {
  block: LessonBlock;
  onQuizAnswer?: (blockId: string, answerIndex: number, correct: boolean) => void;
}

const BlockRenderer: React.FC<BlockRendererProps> = ({ block, onQuizAnswer }) => {
  switch (block.type) {
    case 'ayah':
      return <QuranAyahBlock block={block as AyahLessonBlock} />;
    case 'tafsir':
      return <TafsirCardBlock block={block as TafsirLessonBlock} />;
    case 'story':
      return <StoryCardBlock block={block as StoryLessonBlock} />;
    case 'word-meaning':
      return <WordMeaningBlock block={block as WordMeaningLessonBlock} />;
    case 'quiz':
      return <InlineQuizBlock block={block as QuizLessonBlock} onAnswer={onQuizAnswer} />;
    case 'image':
      return <ImageBlock block={block as ImageLessonBlock} />;
    case 'audio':
      return <AudioBlock block={block as AudioLessonBlock} />;
    case 'summary':
      return <SummaryBlock block={block as SummaryLessonBlock} />;
    case 'reflection':
      return (
        <View style={reflStyles.card}>
          <Text style={reflStyles.prompt}>🤔 Reflect: {(block.content as { prompt: string }).prompt}</Text>
        </View>
      );
    default:
      return (
        <View style={reflStyles.unknown}>
          <Text style={reflStyles.unknownText}>Unknown block type: {block.type}</Text>
        </View>
      );
  }
};

const reflStyles = StyleSheet.create({
  card: { backgroundColor: '#FEF9E7', borderRadius: 14, padding: 18, borderLeftWidth: 4, borderLeftColor: '#D4AC0D' },
  prompt: { fontSize: 16, color: '#7D6608', lineHeight: 26, fontStyle: 'italic' },
  unknown: { backgroundColor: '#FEE', borderRadius: 10, padding: 14 },
  unknownText: { fontSize: 13, color: '#C00', fontStyle: 'italic' },
});

export default BlockRenderer;
