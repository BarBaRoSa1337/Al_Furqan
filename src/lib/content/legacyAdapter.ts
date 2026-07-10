import {
  AyahRecord,
  AyahRef,
  ContentPackage,
  ContentSource,
  LearningPath,
  Lesson,
  LessonBlock,
  Level,
  LevelBlock,
  QuestionBlock,
  ReviewerStatus,
  SurahRecord,
} from '../../types/content';

const DEFAULT_TRANSLATION_LOCALE = 'en';

interface LegacyPackageInput {
  id: string;
  version: string;
  title: string;
  description: string;
  surahs: SurahRecord[];
  ayat: AyahRecord[];
  learningPaths: LearningPath[];
  levels: Level[];
  sources: ContentSource[];
}

export function createLegacyPackageFromLearningPath(input: LegacyPackageInput): ContentPackage {
  const lessons = input.levels.map((level) => createLegacyLesson(level, input));

  return {
    id: input.id,
    version: input.version,
    title: input.title,
    description: input.description,
    type: 'surah',
    lessons,
    sources: input.sources,
    surahs: input.surahs,
    ayat: input.ayat,
    learningPaths: input.learningPaths,
    levels: input.levels,
    assets: { images: [], audio: [] },
    metadata: {
      totalLessons: lessons.length,
      language: 'en',
      targetAudience: 'family',
    },
  };
}

function createLegacyLesson(level: Level, input: LegacyPackageInput): Lesson {
  const surah = input.surahs.find((record) => record.id === level.surahId);
  const blocks = level.steps.flatMap((step) =>
    step.blocks.map((block) => createLegacyBlock(block, input, level)).filter(Boolean)
  ) as LessonBlock[];

  return {
    id: level.id,
    packageId: input.id,
    title: level.title,
    description: level.description,
    level: level.difficulty === 'hard' ? 'intermediate' : 'beginner',
    durationMinutes: level.durationMinutes,
    blocks,
    prerequisites: level.unlockRules?.requiresLevelIds,
    metadata: {
      surahName: surah?.transliteratedName,
      surahNumber: surah?.surahNumber,
      isFinalReview: level.metadata?.isFinalReview,
      sourceMetadata: {
        quranTextSourceId: surah?.sourceMetadata.quranTextSourceId ?? '',
        translationSourceId: surah?.sourceMetadata.translationSourceIds[0] ?? '',
        tafsirSourceId: surah?.sourceMetadata.tafsirSourceIds[0],
        wordMeaningSourceId: surah?.sourceMetadata.translationSourceIds[0],
        reviewerStatus: resolveReviewerStatus(level),
        notes: 'Temporary renderer adapter from Level/Step/Block curriculum.',
      },
    },
  };
}

function createLegacyBlock(block: LevelBlock, input: LegacyPackageInput, level: Level): LessonBlock | null {
  switch (block.type) {
    case 'ayah_ref':
      return createAyahBlock(block.id, block.ayahRef, input, block.translationLocale);
    case 'tafsir_ref':
      return createTafsirBlock(block.id, block.ayahRef, block.tafsirEntryId, input);
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
    case 'word_explorer':
      return createWordExplorerBlock(block.id, block.ayahRefs, input);
    case 'question':
      return createQuestionBlock(block, level.difficulty);
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

function createAyahBlock(
  blockId: string,
  ref: AyahRef,
  input: LegacyPackageInput,
  locale = DEFAULT_TRANSLATION_LOCALE
): LessonBlock | null {
  const ayah = findAyah(input.ayat, ref);
  if (!ayah) return null;

  const translation = ayah.translations.find((entry) => entry.locale === locale) ?? ayah.translations[0];

  return {
    id: blockId,
    type: 'ayah',
    content: {
      quranText: {
        arabic: ayah.arabicText.text,
        transliteration: ayah.transliteration,
        translation: translation?.text ?? '',
        arabicSourceId: ayah.arabicText.sourceId,
        translationSourceId: translation?.sourceId ?? '',
      },
      wordBreakdown: ayah.wordMeanings,
    },
  };
}

function createTafsirBlock(
  blockId: string,
  ref: AyahRef,
  tafsirEntryId: string,
  input: LegacyPackageInput
): LessonBlock | null {
  const ayah = findAyah(input.ayat, ref);
  const tafsir = ayah?.tafsirEntries.find((entry) => entry.id === tafsirEntryId);
  if (!tafsir) return null;

  return {
    id: blockId,
    type: 'tafsir',
    content: {
      tafsir: {
        text: tafsir.text,
        sourceId: tafsir.sourceId,
        explanation: tafsir.explanation,
      },
    },
    metadata: {
      reviewerStatus: tafsir.reviewerStatus,
    },
  };
}

function createWordExplorerBlock(
  blockId: string,
  refs: AyahRef[],
  input: LegacyPackageInput
): LessonBlock | null {
  const words = refs.flatMap((ref) => findAyah(input.ayat, ref)?.wordMeanings ?? []);
  if (words.length === 0) return null;

  return {
    id: blockId,
    type: 'word-meaning',
    content: {
      words,
    },
  };
}

function createQuestionBlock(block: QuestionBlock, difficulty: Level['difficulty']): LessonBlock {
  return {
    id: block.id,
    type: 'quiz',
    content: {
      question: block.question,
      type: block.questionType,
      options: block.options,
      correctAnswer: block.correctAnswer,
      explanation: block.explanation,
      difficulty,
    },
    metadata: {
      sourceIds: block.sourceIds,
      reviewerStatus: block.reviewerStatus,
    },
  };
}

function findAyah(ayat: AyahRecord[], ref: AyahRef): AyahRecord | undefined {
  return ayat.find(
    (ayah) => ayah.ref.surahNumber === ref.surahNumber && ayah.ref.ayahNumber === ref.ayahNumber
  );
}

function resolveReviewerStatus(level: Level): ReviewerStatus {
  const statuses = level.steps.flatMap((step) =>
    step.blocks.flatMap((block) => {
      if ('reviewerStatus' in block) {
        return [block.reviewerStatus];
      }
      return [];
    })
  );

  if (statuses.includes('draft')) return 'draft';
  if (statuses.includes('reviewed')) return 'reviewed';
  return 'approved';
}
