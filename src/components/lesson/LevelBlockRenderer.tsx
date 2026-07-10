import React from 'react';
import {
  AyahLessonBlock,
  Level,
  LevelBlock,
  LessonBlock,
  QuestionBlock,
  TafsirLessonBlock,
} from '../../types/content';
import { getContentRepository } from '../../lib/content/repository';
import BlockRenderer from './BlockRenderer';

interface LevelBlockRendererProps {
  block: LevelBlock;
  level: Level;
  onQuestionAnswer?: (blockId: string, correct: boolean) => void;
}

const DEFAULT_TRANSLATION_LOCALE = 'en';

export default function LevelBlockRenderer({ block, level, onQuestionAnswer }: LevelBlockRendererProps) {
  const repo = getContentRepository();
  const legacyBlock = toRenderableBlock(block, level, repo);

  if (!legacyBlock) {
    return null;
  }

  return (
    <BlockRenderer
      block={legacyBlock}
      onQuizAnswer={(blockId, _answerIndex, correct) => onQuestionAnswer?.(blockId, correct)}
    />
  );
}

function toRenderableBlock(
  block: LevelBlock,
  level: Level,
  repo: ReturnType<typeof getContentRepository>
): LessonBlock | null {
  switch (block.type) {
    case 'ayah_ref': {
      const ayah = repo.getAyahByRef(block.ayahRef);
      if (!ayah) return null;

      const translation =
        ayah.translations.find(entry => entry.locale === (block.translationLocale ?? DEFAULT_TRANSLATION_LOCALE)) ??
        ayah.translations[0];

      return {
        id: block.id,
        type: 'ayah',
        content: {
          quranText: {
            arabic: ayah.arabicText.text,
            transliteration: ayah.transliteration,
            translation: translation?.text ?? '',
            arabicSourceId: ayah.arabicText.sourceId,
            translationSourceId: translation?.sourceId ?? '',
          },
        },
      } satisfies AyahLessonBlock;
    }
    case 'tafsir_ref': {
      const ayah = repo.getAyahByRef(block.ayahRef);
      const entry = ayah?.tafsirEntries.find(tafsir => tafsir.id === block.tafsirEntryId);
      if (!entry) return null;

      return {
        id: block.id,
        type: 'tafsir',
        content: {
          tafsir: {
            text: entry.text,
            sourceId: entry.sourceId,
            explanation: entry.explanation,
          },
        },
        metadata: { reviewerStatus: entry.reviewerStatus },
      } satisfies TafsirLessonBlock;
    }
    case 'context':
      return {
        id: block.id,
        type: 'story',
        content: {
          title: block.title,
          description: block.text,
        },
        metadata: {
          contextKind: block.kind,
          sourceIds: block.sourceIds,
          reviewerStatus: block.reviewerStatus,
        },
      };
    case 'word_explorer': {
      const words = block.ayahRefs.flatMap(ref => repo.getAyahByRef(ref)?.wordMeanings ?? []);
      if (words.length === 0) return null;

      return {
        id: block.id,
        type: 'word-meaning',
        content: { words },
      };
    }
    case 'question':
      return toQuizBlock(block, level);
    case 'summary':
      return {
        id: block.id,
        type: 'summary',
        content: {
          title: block.title,
          points: block.points,
        },
        metadata: {
          sourceIds: block.sourceIds,
          reviewerStatus: block.reviewerStatus,
        },
      };
    default:
      return null;
  }
}

function toQuizBlock(block: QuestionBlock, level: Level): LessonBlock {
  return {
    id: block.id,
    type: 'quiz',
    content: {
      question: block.question,
      type: block.questionType,
      options: block.options,
      correctAnswer: block.correctAnswer,
      explanation: block.explanation,
      difficulty: level.difficulty,
    },
    metadata: {
      sourceIds: block.sourceIds,
      reviewerStatus: block.reviewerStatus,
    },
  };
}
