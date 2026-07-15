// Content Types for Quran Habit App
import type { LearningActivity } from './activities';

// ─── Source & Governance ───────────────────────────────────────────────────

export type ReviewerStatus = 'draft' | 'reviewed' | 'approved';

export interface ContentSource {
  id: string;
  name: string;
  author?: string;
  publisher?: string;
  version: string;
  language: string;
  reviewerStatus: ReviewerStatus;
  reviewerName?: string;
  reviewDate?: string;
  license?: string;
  notes?: string;
}

// ─── Core Quran Content ────────────────────────────────────────────────────

export type QuranEditionId = 'hafs-an-asim';

export interface QuranEdition {
  id: QuranEditionId;
  qiraah: 'asim';
  riwayah: 'hafs';
  displayName: string;
  textSourceId: string;
  fontProfileId: string;
  version: string;
  checksum?: string;
}

export interface WordMeaning {
  /** Stable canonical token reference. Arabic remains temporary renderer compatibility data. */
  wordTokenId?: string;
  arabic: string;
  transliteration: string;
  meaning: string;
  root?: string;
  sourceId: string;
  reviewerStatus: ReviewerStatus;
}

export interface AyahRef {
  surahNumber: number;
  ayahNumber: number;
}

export interface QuranPosition extends AyahRef {
  wordIndex?: number;
}

export interface QuranRange {
  start: QuranPosition;
  end: QuranPosition;
}

export type QuranDivisionKind = 'juz' | 'hizb' | 'rub';

export interface QuranDivision {
  id: string;
  editionId: QuranEditionId;
  kind: QuranDivisionKind;
  number: number;
  range: QuranRange;
  sourceId: string;
  sourceVersion: string;
}

export interface WordToken {
  id: string;
  editionId: QuranEditionId;
  ayahRef: AyahRef;
  position: number;
  arabicText: string;
  sourceId: string;
  sourceVersion: string;
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
  editionId: QuranEditionId;
  ref: AyahRef;
  arabicText: {
    text: string;
    sourceId: string;
    reviewerStatus: ReviewerStatus;
  };
  wordTokenIds: string[];
  sourceId: string;
  sourceVersion: string;
  checksum: string;
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
  | ActivityLevelBlock
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

export interface ActivityLevelBlock {
  id: string;
  type: 'activity';
  activity: LearningActivity;
}

interface QuestionBlockBase {
  id: string;
  type: 'question';
  question: string;
  explanation?: string;
  sourceIds: string[];
  reviewerStatus: ReviewerStatus;
}

export interface MultipleChoiceQuestionBlock extends QuestionBlockBase {
  questionType: 'multiple-choice';
  options: string[];
  correctAnswer: number;
}

export interface TrueFalseQuestionBlock extends QuestionBlockBase {
  questionType: 'true-false';
  correctAnswer: 0 | 1;
}

export interface FillBlankQuestionBlock extends QuestionBlockBase {
  questionType: 'fill-blank';
  blankText: string;
  correctAnswer: string;
  caseSensitive?: boolean;
}

export interface MatchQuestionBlock extends QuestionBlockBase {
  questionType: 'match';
  matchPairs: Array<{
    id: string;
    arabic: string;
    meaning: string;
  }>;
}

export type QuestionBlock =
  | MultipleChoiceQuestionBlock
  | TrueFalseQuestionBlock
  | FillBlankQuestionBlock
  | MatchQuestionBlock;

export interface SummaryLevelBlock {
  id: string;
  type: 'summary';
  title: string;
  points: string[];
  sourceIds: string[];
  reviewerStatus: ReviewerStatus;
}

// ─── Package ───────────────────────────────────────────────────────────────

export interface ContentPackage {
  id: string;
  version: string;
  title: string;
  description: string;
  type: 'surah' | 'juz' | 'topic' | 'course';
  sources: ContentSource[];
  editions: QuranEdition[];
  surahs: SurahRecord[];
  ayat: AyahRecord[];
  wordTokens: WordToken[];
  divisions: QuranDivision[];
  learningPaths: LearningPath[];
  levels: Level[];
  assets?: {
    images?: string[];
    audio?: string[];
    videos?: string[];
  };
  metadata: {
    totalLevels: number;
    totalDuration?: number;
    language: string;
    targetAudience: 'children' | 'teens' | 'adults' | 'family';
  };
}

// ─── Repository ────────────────────────────────────────────────────────────

export interface ContentRepository {
  packages: ContentPackage[];
  sources: ContentSource[];
  editions: QuranEdition[];
  surahs: SurahRecord[];
  ayat: AyahRecord[];
  wordTokens: WordToken[];
  divisions: QuranDivision[];
  learningPaths: LearningPath[];
  levels: Level[];
  getPackageById(id: string): ContentPackage | undefined;
  getSourceById(id: string): ContentSource | undefined;
  getEdition(id: QuranEditionId): QuranEdition | undefined;
  getSurahById(id: string): SurahRecord | undefined;
  getSurahByNumber(number: number): SurahRecord | undefined;
  getLevelById(id: string): Level | undefined;
  getAyahByRef(ref: AyahRef, editionId?: QuranEditionId): AyahRecord | undefined;
  getAyatByRefs(refs: AyahRef[], editionId?: QuranEditionId): AyahRecord[];
  getWordToken(id: string): WordToken | undefined;
  listDivisions(kind: QuranDivisionKind, editionId?: QuranEditionId): QuranDivision[];
  getDivision(kind: QuranDivisionKind, number: number, editionId?: QuranEditionId): QuranDivision | undefined;
  listAyahRefsInDivision(kind: QuranDivisionKind, number: number, editionId?: QuranEditionId): AyahRef[];
  listSurahsInDivision(kind: QuranDivisionKind, number: number, editionId?: QuranEditionId): SurahRecord[];
  getDivisionsForAyah(ref: AyahRef, editionId?: QuranEditionId): QuranDivision[];
  getNextLevel(levelId: string): Level | undefined;
  getLearningPathById(id: string): LearningPath | undefined;
  getCurrentLearningPath(): LearningPath | undefined;
  getLevelsForLearningPath(pathId: string, sort?: RoadmapSort): Level[];
  getSurahs(sort?: RoadmapSort): SurahRecord[];
}
