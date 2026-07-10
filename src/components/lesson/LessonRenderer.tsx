// Lesson Renderer Component

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Lesson, LessonBlock, AyahLessonBlock, TafsirLessonBlock, QuizLessonBlock, WordMeaningLessonBlock, ImageLessonBlock, AudioLessonBlock } from '../../types/content';

interface LessonRendererProps {
  lesson: Lesson;
  onBlockComplete?: (blockId: string) => void;
  onLessonComplete?: () => void;
}

const LessonRenderer: React.FC<LessonRendererProps> = ({ lesson, onBlockComplete, onLessonComplete }) => {
  const renderBlock = (block: LessonBlock) => {
    switch (block.type) {
      case 'ayah':
        return <AyahBlock block={block as AyahLessonBlock} />;
      case 'tafsir':
        return <TafsirBlock block={block as TafsirLessonBlock} />;
      case 'word-meaning':
        return <WordMeaningBlock block={block as WordMeaningLessonBlock} />;
      case 'quiz':
        return <QuizBlock block={block as QuizLessonBlock} onBlockComplete={onBlockComplete} />;
      case 'image':
        return <ImageBlock block={block as ImageLessonBlock} />;
      case 'audio':
        return <AudioBlock block={block as AudioLessonBlock} />;
      case 'story':
        return <StoryBlock block={block} />;
      default:
        return <UnknownBlock block={block} />;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{lesson.title}</Text>
        <Text style={styles.description}>{lesson.description}</Text>
      </View>
      <View style={styles.blocksContainer}>
        {lesson.blocks.map((block, index) => (
          <View key={block.id} style={styles.blockWrapper}>
            {renderBlock(block)}
            {index < lesson.blocks.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>
      <TouchableOpacity style={styles.completeButton} onPress={onLessonComplete}>
        <Text style={styles.completeButtonText}>Complete Lesson</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const AyahBlock: React.FC<{ block: AyahLessonBlock }> = ({ block }) => {
  return (
    <View style={styles.blockContainer}>
      <Text style={styles.arabicText}>{block.content.quranText.arabic}</Text>
      {block.content.quranText.transliteration && (
        <Text style={styles.transliterationText}>{block.content.quranText.transliteration}</Text>
      )}
      <Text style={styles.translationText}>{block.content.quranText.translation}</Text>
      {block.content.wordBreakdown && block.content.wordBreakdown.length > 0 && (
        <View style={styles.wordBreakdownContainer}>
          <Text style={styles.sectionTitle}>Word Breakdown:</Text>
          {block.content.wordBreakdown.map((word, index) => (
            <View key={index} style={styles.wordItem}>
              <Text style={styles.arabicWord}>{word.arabic}</Text>
              <Text style={styles.wordTransliteration}>{word.transliteration}</Text>
              <Text style={styles.wordMeaning}>{word.meaning}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const TafsirBlock: React.FC<{ block: TafsirLessonBlock }> = ({ block }) => {
  return (
    <View style={styles.blockContainer}>
      <Text style={styles.sectionTitle}>Tafsir</Text>
      <Text style={styles.tafsirText}>{block.content.tafsir.text}</Text>
      {block.content.tafsir.explanation && (
        <Text style={styles.explanationText}>{block.content.tafsir.explanation}</Text>
      )}
      {block.content.tafsir.context && (
        <Text style={styles.contextText}>{block.content.tafsir.context}</Text>
      )}
    </View>
  );
};

const WordMeaningBlock: React.FC<{ block: WordMeaningLessonBlock }> = ({ block }) => {
  return (
    <View style={styles.blockContainer}>
      <Text style={styles.sectionTitle}>Word Meanings</Text>
      {block.content.words.map((word, index) => (
        <View key={index} style={styles.wordItem}>
          <Text style={styles.arabicWord}>{word.arabic}</Text>
          <Text style={styles.wordTransliteration}>{word.transliteration}</Text>
          <Text style={styles.wordMeaning}>{word.meaning}</Text>
          {word.root && (
            <Text style={styles.wordRoot}>Root: {word.root}</Text>
          )}
        </View>
      ))}
    </View>
  );
};

const QuizBlock: React.FC<{ block: QuizLessonBlock; onBlockComplete?: (blockId: string) => void }> = ({ block, onBlockComplete }) => {
  const [selectedOption, setSelectedOption] = React.useState<number | null>(null);
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
    if (onBlockComplete) {
      onBlockComplete(block.id);
    }
  };

  return (
    <View style={styles.blockContainer}>
      <Text style={styles.sectionTitle}>Quiz</Text>
      <Text style={styles.quizQuestion}>{block.content.question}</Text>
      
      {block.content.options?.map((option, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.quizOption,
            selectedOption === index && styles.selectedOption,
            submitted && index === block.content.correctAnswer && styles.correctOption,
            submitted && selectedOption === index && selectedOption !== block.content.correctAnswer && styles.incorrectOption
          ]}
          onPress={() => !submitted && setSelectedOption(index)}
        >
          <Text style={styles.quizOptionText}>{option}</Text>
        </TouchableOpacity>
      ))}
      
      {!submitted ? (
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.quizResult}>
          <Text style={styles.resultText}>
            {selectedOption === block.content.correctAnswer ? 'Correct!' : 'Incorrect'}
          </Text>
          <Text style={styles.explanationText}>{block.content.explanation}</Text>
        </View>
      )}
    </View>
  );
};

const ImageBlock: React.FC<{ block: ImageLessonBlock }> = ({ block }) => {
  return (
    <View style={styles.blockContainer}>
      <Text style={styles.sectionTitle}>Image</Text>
      {/* Placeholder for image */}
      <View style={styles.imagePlaceholder}>
        <Text style={styles.imagePlaceholderText}>Image: {block.content.caption || block.content.altText}</Text>
      </View>
    </View>
  );
};

const AudioBlock: React.FC<{ block: AudioLessonBlock }> = ({ block }) => {
  return (
    <View style={styles.blockContainer}>
      <Text style={styles.sectionTitle}>Audio</Text>
      {/* Placeholder for audio player */}
      <View style={styles.audioPlaceholder}>
        <Text style={styles.audioPlaceholderText}>Audio: {block.content.title || 'Quran Recitation'}</Text>
      </View>
    </View>
  );
};

const StoryBlock: React.FC<{ block: LessonBlock }> = ({ block }) => {
  const content = block.content as any;
  return (
    <View style={styles.blockContainer}>
      <Text style={styles.sectionTitle}>{content.title || 'Story'}</Text>
      <Text style={styles.storyText}>{content.description}</Text>
    </View>
  );
};

const UnknownBlock: React.FC<{ block: LessonBlock }> = ({ block }) => {
  return (
    <View style={styles.blockContainer}>
      <Text style={styles.unknownBlockText}>Unknown block type: {block.type}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  blocksContainer: {
    padding: 20,
  },
  blockWrapper: {
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#E9ECEF',
    marginVertical: 16,
  },
  blockContainer: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  arabicText: {
    fontSize: 24,
    fontFamily: 'serif',
    textAlign: 'right',
    color: '#2C3E50',
    marginBottom: 12,
    lineHeight: 36,
  },
  transliterationText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 8,
  },
  translationText: {
    fontSize: 16,
    color: '#2C3E50',
    lineHeight: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  tafsirText: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  contextText: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
  },
  wordBreakdownContainer: {
    marginTop: 12,
  },
  wordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  arabicWord: {
    fontSize: 20,
    fontFamily: 'serif',
    flex: 1,
    textAlign: 'right',
    color: '#2C3E50',
  },
  wordTransliteration: {
    fontSize: 14,
    flex: 1,
    color: '#666',
    marginHorizontal: 8,
  },
  wordMeaning: {
    fontSize: 14,
    flex: 1,
    color: '#2C3E50',
    fontWeight: '500',
  },
  wordRoot: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  quizQuestion: {
    fontSize: 16,
    color: '#2C3E50',
    marginBottom: 16,
    lineHeight: 22,
  },
  quizOption: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#E9ECEF',
  },
  selectedOption: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  correctOption: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  incorrectOption: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  quizOptionText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  quizResult: {
    marginTop: 12,
  },
  resultText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  correctResult: {
    color: '#4CAF50',
  },
  incorrectResult: {
    color: '#F44336',
  },
  storyText: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
  },
  imagePlaceholder: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  imagePlaceholderText: {
    color: '#666',
    fontSize: 14,
  },
  audioPlaceholder: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  audioPlaceholderText: {
    color: '#666',
    fontSize: 14,
  },
  unknownBlockText: {
    color: '#FF6B6B',
    fontStyle: 'italic',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    margin: 20,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default LessonRenderer;