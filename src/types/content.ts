// Content Types for Quran Habit App
import type { LearningActivity } from './activities';
import type { ContentGovernance } from './governance';
import type { Reciter, RecitationTrack } from './media';
import type { LocalePublication, SupportedLocale } from '../../packages/api-contracts/src';

export const CORE_PACKAGE_TEXT_KEYS = [
  'app.title', 'app.loading', 'app.errorLearningPathNotFound', 'roadmap.levels', 'roadmap.pathProgress', 'roadmap.loadingProgress', 'roadmap.progressUnavailable',
  'lesson.loadingLevel', 'lesson.levelNotFound', 'lesson.backToRoadmap', 'lesson.leaveLevel', 'lesson.leaveMessage', 'lesson.keepLearning', 'lesson.leave', 'lesson.progressUnavailable', 'lesson.continue', 'lesson.completeLevel',
  'completion.loading', 'completion.levelNotFound', 'completion.progressUnavailable', 'completion.alhamdulillah', 'completion.completed', 'completion.rewardsEarned', 'completion.alreadyCounted', 'completion.levelCompleted', 'completion.pathXp', 'completion.saved', 'completion.startNextLevel', 'completion.backToRoadmap',
  'activity.recall', 'activity.reveal', 'activity.revealAndRate', 'activity.compareAndRate', 'activity.again', 'activity.hard', 'activity.remembered', 'activity.selectedAnswer', 'activity.buildAnswer', 'activity.matchTranslationHint',
  'activity.typeFromMemory', 'activity.typedAnswerLabel', 'activity.showArabicKeyboard', 'activity.hideArabicKeyboard', 'activity.arabicKeyboard', 'activity.keyboardSpace', 'activity.keyboardBackspace',
  'review.title', 'review.due', 'review.start', 'review.noneDue', 'review.complete', 'review.next', 'review.backToRoadmap',
  'question.quiz', 'question.checkAnswer', 'question.checking', 'question.tryAgain', 'question.correct', 'question.answerIs', 'question.fillAnswer', 'question.typeAnswer', 'question.checkMatches', 'question.matchHint', 'question.true', 'question.false',
  'content.translationUnavailable', 'content.arabicSource', 'content.translationSource', 'content.source', 'content.sourceUnavailable', 'content.unsupported', 'content.tafsir', 'content.explanation', 'content.draftPendingReview', 'content.toggleDetails', 'content.wordByWord', 'content.translation', 'content.listen', 'content.audioUnavailable', 'content.context.historical_context', 'content.context.occasion_of_revelation', 'content.context.tafsir_summary',
] as const;

export type PackageTextKey = typeof CORE_PACKAGE_TEXT_KEYS[number] | (string & {});

export interface PackageTextCatalog {
  locale: string;
  entries: Record<string, string>;
}

export interface PackageLocalization {
  defaultLocale: string;
  catalogs: PackageTextCatalog[];
}

export type MediaAssetKind = 'image' | 'svg' | 'animation';

export interface MediaAsset {
  id: string;
  kind: MediaAssetKind;
  uri: string;
  altText: string;
  sourceIds: string[];
  license: string;
  checksum: string;
  reviewerStatus: ReviewerStatus;
  reducedMotionAssetId?: string;
}

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

interface WordMeaningBase {
  /** Stable resource ID used by activities and Studio selections. */
  id: string;
  transliteration: string;
  meaning: string;
  root?: string;
  sourceId: string;
  reviewerStatus: ReviewerStatus;
}

export type WordMeaning = WordMeaningBase & (
  | {
      /** Schema v2 resolves Arabic exclusively from the canonical token. */
      wordTokenId: string;
      arabic?: never;
    }
  | {
      /** Schema v1 compatibility shape; canonical text wins when both exist. */
      wordTokenId?: string;
      arabic: string;
    }
);

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

export type QuranDivisionKind = 'juz' | 'hizb' | 'rub_el_hizb' | 'thumun_al_hizb';
export type QuranDivisionQueryKind = QuranDivisionKind | 'rub';

export interface QuranDivision {
  id: string;
  editionId: QuranEditionId;
  kind: QuranDivisionKind;
  number: number;
  range: QuranRange;
  sourceId: string;
  sourceVersion: string;
  contentHash?: string;
}

export interface AyahStructureIndex {
  editionId: QuranEditionId;
  ayahRef: AyahRef;
  juzNumber: number;
  hizbNumber: number;
  rubElHizbNumber: number;
  thumunAlHizbNumber?: number;
  pageNumber?: number;
  rukuNumber?: number;
  manzilNumber?: number;
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
  /** Provider text is immutable; updates create a new reviewed resource version. */
  providerResourceId?: string;
  resourceVersion?: string;
  publisher?: string;
  attributionText?: string;
  transcriptInfo?: string;
  footnotes?: string;
  contentHash?: string;
}

export interface TafsirEntry {
  id: string;
  locale: string;
  text: string;
  sourceId: string;
  reviewerStatus: ReviewerStatus;
  explanation?: string;
  citation?: {
    sourceId: string;
    locator: string;
    edition?: string;
  };
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
  /** True when the package supplies canonical navigation metadata without Quran text records. */
  navigationOnly?: boolean;
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
export type CourseContentType = 'surah_course' | 'thematic_course' | 'review_course';
export type DiscoveryAudience = 'teen' | 'adult' | 'family';
export type CurriculumAlignment =
  | { type: 'surah'; surahNumber: number }
  | { type: 'ayah_range'; range: QuranRange }
  | { type: 'juz'; number: number }
  | { type: 'hizb'; number: number }
  | { type: 'rub_el_hizb'; number: number }
  | { type: 'custom_ranges'; ranges: QuranRange[] };

export interface Theme {
  id: string;
  parentId?: string;
  title: Record<string, string>;
  aliases?: Record<string, string[]>;
  description?: Record<string, string>;
  sourceIds: string[];
  reviewerStatus: ReviewerStatus;
}

export interface DiscoveryMetadata {
  alignment: CurriculumAlignment;
  themeIds: string[];
  contentTypes: CourseContentType[];
  studyLocales: string[];
  audiences: DiscoveryAudience[];
}

export interface ContentScope {
  activePackageIds: string[];
  editionId: QuranEditionId;
  studyLocale: string;
}

export type QuranLookup =
  | { type: 'surah'; surahNumber: number }
  | { type: 'ayah'; ayahRef: AyahRef }
  | { type: 'ayah_range'; range: QuranRange }
  | { type: 'juz'; number: number }
  | { type: 'hizb'; number: number }
  | { type: 'rub_el_hizb'; number: number };

export interface DiscoveryFilters {
  quranLookup?: QuranLookup;
  themeIds?: string[];
  contentTypes?: CourseContentType[];
  learningGoals?: LearningGoal[];
  studyLocale?: string;
  maximumMinutesPerLevel?: number;
  audience?: DiscoveryAudience;
  downloadedOnly?: boolean;
  approvedOnly?: boolean;
}

export type ParsedDiscoveryQuery =
  | { kind: 'quran_lookup'; lookup: QuranLookup }
  | { kind: 'text'; normalizedText: string }
  | { kind: 'empty' };

export interface DiscoveryDiagnostic {
  code: string;
  message: string;
}

export interface DiscoveryQueryResult {
  query: ParsedDiscoveryQuery;
  diagnostics: DiscoveryDiagnostic[];
}

export interface QuranReferenceResult {
  lookup: QuranLookup;
  label: string;
  ayahRefs: AyahRef[];
  lessonAvailability: 'preview' | 'published' | 'no_published_lesson';
}

export interface LearningPathDiscoveryResult {
  packageId: string;
  path: LearningPath;
  levels: Level[];
}

export interface DiscoverySearchResult {
  quranReferences: QuranReferenceResult[];
  learningPaths: LearningPathDiscoveryResult[];
  diagnostics: DiscoveryDiagnostic[];
}

export type ContextKind = 'historical_context' | 'occasion_of_revelation' | 'tafsir_summary';
export type LevelStepKind =
  | 'surah_introduction'
  | 'context'
  | 'read'
  | 'translation'
  | 'word_meaning'
  | 'tafsir'
  | 'memorize'
  | 'memory_practice'
  | 'understanding_practice'
  | 'summary';

export type LevelDifficulty = 'easy' | 'medium' | 'hard';
export type RoadmapSort = 'mushaf' | 'revelation' | 'difficulty' | 'path';

export type SurahLessonKind =
  | 'introduction'
  | 'ayah'
  | 'ayah_range'
  | 'segment_review'
  | 'final_review';

export interface SurahLesson {
  levelId: string;
  kind: SurahLessonKind;
  ayahRange?: QuranRange;
  reviewSegmentId?: string;
}

export interface ReviewSegment {
  id: string;
  coveredLessonIds: string[];
  reviewLevelId: string;
}

export interface CurriculumCompletionEquivalence {
  sourceLevelId: string;
  equivalentLevelIds: string[];
}

export interface CurriculumCompletionMigration {
  id: string;
  historicalLevelId: string;
  completedLevelIds: string[];
}

/** Structural curriculum metadata. Canonical Surah records never own lessons. */
export interface SurahCurriculum {
  id: string;
  surahId: string;
  representativeAssetId?: string;
  lessons: SurahLesson[];
  reviewSegments: ReviewSegment[];
  completionEquivalences?: CurriculumCompletionEquivalence[];
  /** One-time progress fan-out for historical lesson IDs removed by a curriculum revision. */
  completionMigrations?: CurriculumCompletionMigration[];
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  surahIds: string[];
  levelIds: string[];
  /** Required by schema v4. Older packages are adapted at registration time. */
  surahCurricula?: SurahCurriculum[];
  discovery?: DiscoveryMetadata;
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
  discovery?: DiscoveryMetadata;
  steps: LevelStep[];
  completionRules?: {
    requireMemoryActivity: boolean;
    requireUnderstandingActivity: boolean;
  };
  unlockRules?: {
    requiresLevelIds?: string[];
  };
  metadata?: {
    isFinalReview?: boolean;
  };
}

export interface LevelStep {
  id: string;
  /** Required in package schema v2; optional here so schema v1 packages can be adapted. */
  kind?: LevelStepKind;
  title: string;
  /** Optional context may be authored without becoming a completion requirement. */
  required?: boolean;
  blocks: LevelBlock[];
}

export type ContentBlock =
  | SurahOverviewBlock
  | QuranPassageBlock
  | TranslationBlock
  | WordMeaningBlock
  | AyahRefBlock
  | TafsirRefBlock
  | ContextBlock
  | WordExplorerBlock
  | AudioBlock
  | MediaBlock
  | QuestionBlock
  | SummaryLevelBlock;

export type PracticeActivityBlock = ActivityLevelBlock;
export type LevelBlock = ContentBlock | PracticeActivityBlock;

export interface SurahOverviewBlock {
  id: string;
  type: 'surah_overview';
  surahId: string;
}

export interface AyahRefBlock {
  id: string;
  type: 'ayah_ref';
  ayahRef: AyahRef;
  translationLocale?: string;
}

export interface QuranPassageBlock {
  id: string;
  type: 'quran_passage';
  ayahRefs: AyahRef[];
  showTransliteration?: boolean;
}

export interface TranslationBlock {
  id: string;
  type: 'translation';
  ayahRefs: AyahRef[];
  locale: string;
  translationEntryIds?: string[];
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

export interface WordMeaningBlock {
  id: string;
  type: 'word_meaning';
  wordMeaningIds: string[];
}

export interface AudioBlock {
  id: string;
  type: 'audio';
  ayahRefs: AyahRef[];
  reciterId?: string;
  required?: boolean;
}

export interface MediaBlock {
  id: string;
  type: 'media';
  assetId: string;
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
  /** Schema v4 distinguishes source-backed recap from original reflection. */
  variant?: 'verified_recap' | 'reflection';
}

export interface AuthoredSurahSummary {
  packageId: string;
  path: LearningPath;
  curriculum: SurahCurriculum;
  surah: SurahRecord;
  levels: Level[];
}

// ─── Package ───────────────────────────────────────────────────────────────

export interface ContentPackage {
  id: string;
  version: string;
  schemaVersion: number;
  revisionId: string;
  title: string;
  description: string;
  type: 'surah' | 'juz' | 'topic' | 'course';
  sources: ContentSource[];
  editions: QuranEdition[];
  surahs: SurahRecord[];
  ayat: AyahRecord[];
  wordTokens: WordToken[];
  divisions: QuranDivision[];
  structureIndex?: AyahStructureIndex[];
  themes?: Theme[];
  reciters: Reciter[];
  recitationTracks: RecitationTrack[];
  localization: PackageLocalization;
  mediaAssets: MediaAsset[];
  learningPaths: LearningPath[];
  levels: Level[];
  /** Optional for legacy/development packages; mandatory at the production boundary. */
  governance?: ContentGovernance;
  /** Schema v3 publishes complete lesson locales, never mixed religious blocks. */
  localePublications?: LocalePublication[];
  creationMethod?: 'human_authored' | 'provider_verbatim' | 'mixed_human_and_provider';
  metadata: {
    totalLevels: number;
    totalDuration?: number;
    language: SupportedLocale | string;
    targetAudience: 'children' | 'teens' | 'adults' | 'family';
    defaultLearningPathId?: string;
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
  reciters: Reciter[];
  recitationTracks: RecitationTrack[];
  learningPaths: LearningPath[];
  levels: Level[];
  getPackageById(id: string): ContentPackage | undefined;
  getPackageForLevel(levelId: string): ContentPackage | undefined;
  getPackageForBlock(blockId: string): ContentPackage | undefined;
  getActivePackage(): ContentPackage | undefined;
  getText(key: PackageTextKey, locale?: string): string;
  registerPackage(pkg: ContentPackage, activate?: boolean, origin?: 'built_in' | 'downloaded' | 'runtime'): void;
  removePackage(id: string): void;
  getSourceById(id: string, scope?: ContentScope): ContentSource | undefined;
  getEdition(id: QuranEditionId): QuranEdition | undefined;
  getSurahById(id: string): SurahRecord | undefined;
  getSurahByNumber(number: number, scope?: ContentScope): SurahRecord | undefined;
  getLevelById(id: string): Level | undefined;
  getActivityById(id: string): LearningActivity | undefined;
  getActivityForLevel(levelId: string, activityId: string): LearningActivity | undefined;
  getLevelForActivity(id: string): Level | undefined;
  getAyahByRef(ref: AyahRef, editionId?: QuranEditionId, scope?: ContentScope): AyahRecord | undefined;
  getAyatByRefs(refs: AyahRef[], editionId?: QuranEditionId, scope?: ContentScope): AyahRecord[];
  getWordToken(id: string, scope?: ContentScope): WordToken | undefined;
  getReciterById(id: string): Reciter | undefined;
  getRecitationTrackByAyah(ref: AyahRef, reciterId?: string, editionId?: QuranEditionId): RecitationTrack | undefined;
  listDivisions(kind: QuranDivisionQueryKind, editionId?: QuranEditionId, scope?: ContentScope): QuranDivision[];
  getDivision(kind: QuranDivisionQueryKind, number: number, editionId?: QuranEditionId, scope?: ContentScope): QuranDivision | undefined;
  listAyahRefsInDivision(kind: QuranDivisionQueryKind, number: number, editionId?: QuranEditionId, scope?: ContentScope): AyahRef[];
  listSurahsInDivision(kind: QuranDivisionQueryKind, number: number, editionId?: QuranEditionId, scope?: ContentScope): SurahRecord[];
  getDivisionsForAyah(ref: AyahRef, editionId?: QuranEditionId, scope?: ContentScope): QuranDivision[];
  getAyahsInRange(range: QuranRange, scope?: ContentScope): AyahRecord[];
  getAyahStructure(ref: AyahRef, scope?: ContentScope): AyahStructureIndex | undefined;
  parseDiscoveryQuery(query: string, scope?: ContentScope): DiscoveryQueryResult;
  searchQuranMetadata(query: string, scope?: ContentScope): QuranReferenceResult[];
  listLearningPaths(filters?: DiscoveryFilters, scope?: ContentScope): LearningPathDiscoveryResult[];
  listLevels(filters?: DiscoveryFilters, scope?: ContentScope): Level[];
  findLearningContentForQuranLookup(lookup: QuranLookup, scope?: ContentScope): LearningPathDiscoveryResult[];
  searchDiscovery(query: string, filters?: DiscoveryFilters, scope?: ContentScope): DiscoverySearchResult;
  getNextLevel(levelId: string): Level | undefined;
  getLearningPathById(id: string): LearningPath | undefined;
  getCurrentLearningPath(): LearningPath | undefined;
  getLevelsForLearningPath(pathId: string, sort?: RoadmapSort): Level[];
  listAuthoredSurahs(pathId?: string): AuthoredSurahSummary[];
  getSurahCurriculum(pathId: string, surahId: string): SurahCurriculum | undefined;
  getLevelsForSurah(pathId: string, surahId: string): Level[];
  getSurahs(sort?: RoadmapSort): SurahRecord[];
}
