// Content Types for Quran Habit App

// ─── Source & Governance ───────────────────────────────────────────────────

export type ReviewerStatus = 'draft' | 'reviewed' | 'approved';

export interface ContentSource {
  id: string;
  name: string;
  author?: string;
  publisher?: string;
  version: string;
  language: string;
  reviewed?: boolean;
  reviewerStatus: ReviewerStatus;
  reviewerName?: string;
  reviewDate?: string;
  license?: string;
  notes?: string;
}

// ─── Core Quran Content ────────────────────────────────────────────────────

export interface QuranText {
  arabic: string;
  transliteration?: string;
  translation: string;
  arabicSourceId: string;
  translationSourceId: string;
}

export interface TafsirContent {
  text: string;
  sourceId: string;
  explanation?: string;
  context?: string;
}

export interface WordMeaning {
  arabic: string;
  transliteration: string;
  meaning: string;
  root?: string;
  sourceId: string;
}

export interface AyahRef {
  surahNumber: number;
  ayahNumber: number;
}

export interface TranslationEntry {
  id: string;
  locale: string;
  text: string;
  sourceId: string;
  reviewerStatus: ReviewerStatus;
}

export interface TafsirEntry {
  id: string;
  locale: string;
  text: string;
  sourceId: string;
  reviewerStatus: ReviewerStatus;
  explanation?: string;
}

export interface AyahRecord {
  id: string;
  ref: AyahRef;
  arabicText: {
    text: string;
    sourceId: string;
    reviewerStatus: ReviewerStatus;
  };
  transliteration?: string;
  translations: TranslationEntry[];
  tafsirEntries: TafsirEntry[];
  wordMeanings?: WordMeaning[];
}

export interface SurahRecord {
  id: string;
  surahNumber: number;
  arabicName: string;
  transliteratedName: string;
  englishName: string;
  ayahCount: number;
  revelationOrder?: number;
  revelationPlace: 'makkah' | 'madinah';
  sourceMetadata: {
    quranTextSourceId: string;
    translationSourceIds: string[];
    tafsirSourceIds: string[];
    reviewerStatus: ReviewerStatus;
    reviewerName?: string;
    notes?: string;
  };
}

export type LearningGoal = 'memorize' | 'understand' | 'reflect' | 'quiz';
export type ContextKind = 'historical_context' | 'occasion_of_revelation' | 'tafsir_summary';

export type LevelDifficulty = 'easy' | 'medium' | 'hard';
export type RoadmapSort = 'mushaf' | 'revelation' | 'difficulty' | 'path';

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  surahIds: string[];
  levelIds: string[];
  sourceMetadata: {
    reviewerStatus: ReviewerStatus;
    sourceIds: string[];
    notes?: string;
  };
}

export interface Level {
  id: string;
  pathId: string;
  surahId: string;
  title: string;
  description?: string;
  durationMinutes: number;
  ayahRefs: AyahRef[];
  difficulty: LevelDifficulty;
  goals: LearningGoal[];
  steps: LevelStep[];
  unlockRules?: {
    requiresLevelIds?: string[];
  };
  metadata?: {
    isFinalReview?: boolean;
  };
}

export interface LevelStep {
  id: string;
  title: string;
  blocks: LevelBlock[];
}

export type LevelBlock =
  | AyahRefBlock
  | TafsirRefBlock
  | ContextBlock
  | WordExplorerBlock
  | QuestionBlock
  | SummaryLevelBlock;

export interface AyahRefBlock {
  id: string;
  type: 'ayah_ref';
  ayahRef: AyahRef;
  translationLocale?: string;
}

export interface TafsirRefBlock {
  id: string;
  type: 'tafsir_ref';
  ayahRef: AyahRef;
  tafsirEntryId: string;
}

export interface ContextBlock {
  id: string;
  type: 'context';
  kind: ContextKind;
  title: string;
  text: string;
  sourceIds: string[];
  reviewerStatus: ReviewerStatus;
}

export interface WordExplorerBlock {
  id: string;
  type: 'word_explorer';
  ayahRefs: AyahRef[];
}

export interface QuestionBlock {
  id: string;
  type: 'question';
  question: string;
  questionType: 'multiple-choice' | 'true-false' | 'fill-blank' | 'match';
  options?: string[];
  blankText?: string;
  matchPairs?: Array<{
    id: string;
    arabic: string;
    meaning: string;
  }>;
  correctAnswer: string | number;
  explanation?: string;
  sourceIds: string[];
  reviewerStatus: ReviewerStatus;
}

export interface SummaryLevelBlock {
  id: string;
  type: 'summary';
  title: string;
  points: string[];
  sourceIds: string[];
  reviewerStatus: ReviewerStatus;
}

// ─── Lesson Block Types ────────────────────────────────────────────────────

export type LessonBlockType =
  | 'ayah'
  | 'tafsir'
  | 'word-meaning'
  | 'story'
  | 'quiz'
  | 'reflection'
  | 'image'
  | 'audio'
  | 'summary';

export interface LessonBlock {
  id: string;
  type: LessonBlockType;
  content: unknown;
  metadata?: Record<string, unknown>;
}

export interface AyahLessonBlock extends LessonBlock {
  type: 'ayah';
  content: {
    quranText: QuranText;
    wordBreakdown?: WordMeaning[];
    audioUrl?: string;
    imageUrls?: string[];
  };
}

export interface TafsirLessonBlock extends LessonBlock {
  type: 'tafsir';
  content: {
    tafsir: TafsirContent;
    relatedAyahs?: string[];
  };
}

export interface WordMeaningLessonBlock extends LessonBlock {
  type: 'word-meaning';
  content: {
    words: WordMeaning[];
    focusWordIndex?: number;
  };
}

export interface StoryLessonBlock extends LessonBlock {
  type: 'story';
  content: {
    title: string;
    description: string;
    imageUrl?: string;
  };
}

export interface QuizLessonBlock extends LessonBlock {
  type: 'quiz';
  content: {
    question: string;
    type: 'multiple-choice' | 'true-false' | 'fill-blank' | 'match';
    options?: string[];
    correctAnswer: string | number;
    explanation?: string;
    difficulty: 'easy' | 'medium' | 'hard';
  };
}

export interface ImageLessonBlock extends LessonBlock {
  type: 'image';
  content: {
    url: string;
    caption?: string;
    altText?: string;
  };
}

export interface AudioLessonBlock extends LessonBlock {
  type: 'audio';
  content: {
    url: string;
    title?: string;
    duration?: number;
  };
}

export interface SummaryLessonBlock extends LessonBlock {
  type: 'summary';
  content: {
    title: string;
    points: string[];
    arabicText?: string;
  };
}

export interface ReflectionLessonBlock extends LessonBlock {
  type: 'reflection';
  content: {
    prompt: string;
    hint?: string;
  };
}

// ─── Lesson ────────────────────────────────────────────────────────────────

export interface Lesson {
  id: string;
  packageId: string;
  title: string;
  description?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  durationMinutes?: number;
  blocks: LessonBlock[];
  prerequisites?: string[];
  tags?: string[];
  metadata?: {
    ayahNumber?: number;
    surahName?: string;
    surahNumber?: number;
    juzNumber?: number;
    hizbNumber?: number;
    isIntro?: boolean;
    isFinalReview?: boolean;
    sourceMetadata?: {
      quranTextSourceId: string;
      translationSourceId: string;
      tafsirSourceId?: string;
      wordMeaningSourceId?: string;
      reviewerStatus: ReviewerStatus;
      reviewerName?: string;
      notes?: string;
    };
  };
}

// ─── Package ───────────────────────────────────────────────────────────────

export interface ContentPackage {
  id: string;
  version: string;
  title: string;
  description: string;
  type: 'surah' | 'juz' | 'topic' | 'course';
  /** Temporary compatibility projection. New packages may omit this. */
  lessons?: Lesson[];
  sources: ContentSource[];
  surahs?: SurahRecord[];
  ayat?: AyahRecord[];
  learningPaths?: LearningPath[];
  levels?: Level[];
  assets?: {
    images?: string[];
    audio?: string[];
    videos?: string[];
  };
  metadata: {
    totalLessons: number;
    totalDuration?: number;
    language: string;
    targetAudience: 'children' | 'teens' | 'adults' | 'family';
  };
}

// ─── Repository ────────────────────────────────────────────────────────────

export interface ContentRepository {
  packages: ContentPackage[];
  lessons: Lesson[];
  sources: ContentSource[];
  surahs: SurahRecord[];
  ayat: AyahRecord[];
  learningPaths: LearningPath[];
  levels: Level[];
  getPackageById(id: string): ContentPackage | undefined;
  getLessonById(id: string): Lesson | undefined;
  getSourceById(id: string): ContentSource | undefined;
  getSurahById(id: string): SurahRecord | undefined;
  getLevelById(id: string): Level | undefined;
  getAyahByRef(ref: AyahRef): AyahRecord | undefined;
  getAyatByRefs(refs: AyahRef[]): AyahRecord[];
  getNextLevel(levelId: string): Level | undefined;
  getLearningPathById(id: string): LearningPath | undefined;
  getCurrentLearningPath(): LearningPath | undefined;
  getLevelsForLearningPath(pathId: string, sort?: RoadmapSort): Level[];
  getSurahs(sort?: RoadmapSort): SurahRecord[];
}

// ─── Progress (legacy shape used in storage.ts) ───────────────────────────

export interface LessonProgress {
  lessonId: string;
  packageId: string;
  completed: boolean;
  startedAt: Date;
  completedAt?: Date;
  score?: number;
  attempts?: number;
  currentBlockIndex?: number;
  blockProgress?: Record<string, unknown>;
}

export interface PackageProgress {
  packageId: string;
  totalLessons: number;
  completedLessons: number;
  overallProgress: number;
  lessons: LessonProgress[];
  startedAt: Date;
  completedAt?: Date;
}
