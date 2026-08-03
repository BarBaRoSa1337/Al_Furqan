import { createHash } from 'node:crypto';
import type { SourceAttribution, SupportedLocale } from '../../../packages/api-contracts/src';
import surahAlFilPackage, { HAFS_AN_ASIM_ID } from '../../../src/content/packages/surah-al-fil/v1';
import type {
  AyahRecord,
  ContentPackage,
  ContentSource,
  LearningPath,
  Level,
  SurahCurriculum,
  SurahRecord,
  TranslationEntry,
  WordToken,
} from '../../../src/types/content';
import type { RecitationTrack } from '../../../src/types/media';
import type { Mp3QuranClient, Mp3QuranStream } from './mp3Quran';
import type { QuranEncClient, QuranEncResult } from './quranEnc';
import type { ProviderResult, QuranFoundationClient } from './quranFoundation';

const COURSE_SURAH_NUMBERS = Array.from({ length: 10 }, (_, index) => index + 105);
const QURAN_SOURCE_ID = 'quran-foundation-hafs-uthmani-v4';
const TRANSLATION_SOURCE_ID = 'quranenc-english-rowwad';
const AUDIO_SOURCE_ID = 'mp3quran-husary-hafs-118';
const STRUCTURE_SOURCE_ID = 'quran-foundation-structure-v4';
const RECITER_ID = 'mahmoud-khalil-al-husary';

interface ProviderWord {
  position: number;
  text_uthmani: string;
  char_type_name?: string;
  transliteration?: string | { text?: string };
}

interface ProviderVerse {
  verse_key: string;
  text_uthmani: string;
  words: ProviderWord[];
}

interface ProviderVerseResponse { verse: ProviderVerse }
interface QuranEncRow { sura: string; aya: string; translation: string; footnotes?: string }
interface QuranEncPayload { result: QuranEncRow[] }

export interface RuntimeCourseDependencies {
  quranFoundation: QuranFoundationClient;
  quranEnc: QuranEncClient;
  mp3Quran: Mp3QuranClient;
}

export async function buildShortSurahRuntimeCourse(
  locale: SupportedLocale,
  dependencies: RuntimeCourseDependencies,
): Promise<{ package: ContentPackage; attributions: SourceAttribution[] } | undefined> {
  // Other locales remain unavailable until complete package UI catalogs are reviewed.
  if (locale !== 'en') return undefined;
  const selectedSurahs = COURSE_SURAH_NUMBERS.map(number => {
    const record = surahAlFilPackage.surahs.find(surah => surah.surahNumber === number);
    if (!record) throw new Error(`Canonical Surah metadata ${number} is unavailable`);
    return record;
  });
  const verseRefs = selectedSurahs.flatMap(surah => Array.from(
    { length: surah.ayahCount },
    (_, index) => ({ surahNumber: surah.surahNumber, ayahNumber: index + 1 }),
  ));
  const verseResults = await mapConcurrent(verseRefs, 6, ref => dependencies.quranFoundation.get<ProviderVerseResponse>(
    `/verses/by_key/${ref.surahNumber}:${ref.ayahNumber}`,
    new URLSearchParams({
      fields: 'text_uthmani,verse_key',
      words: 'true',
      word_fields: 'text_uthmani,position,transliteration,char_type_name',
    }),
  ));
  const [translationResults, audioResults] = await Promise.all([
    mapConcurrent(COURSE_SURAH_NUMBERS, 3, number => dependencies.quranEnc.getSurah(TRANSLATION_SOURCE_ID, number)),
    mapConcurrent(COURSE_SURAH_NUMBERS, 3, number => dependencies.mp3Quran.resolveHusaryHafs(number)),
  ]);
  const translationRows = translationResults.flatMap(result => readTranslationRows(result));
  const wordTokens = verseResults.flatMap(result => normalizeTokens(result.data.verse));
  const ayat = verseResults.map(result => normalizeAyah(result, wordTokens, translationRows));
  const tracks = audioResults.flatMap(normalizeTracks);
  const surahs = surahAlFilPackage.surahs.map(surah => COURSE_SURAH_NUMBERS.includes(surah.surahNumber)
    ? runtimeSurah(surah)
    : surah);
  const { path, levels } = buildCourseCurriculum(surahs, ayat, wordTokens);
  const structureSource = requireSource(STRUCTURE_SOURCE_ID);
  const audioSource = requireSource(AUDIO_SOURCE_ID);
  const sources = [quranSource(), quranEncSource(), structureSource, audioSource];
  const contentPackage: ContentPackage = {
    ...surahAlFilPackage,
    version: '4.1',
    revisionId: 'surah-al-fil-v1-r16-runtime-en',
    title: 'Al-Fil to An-Nas',
    description: 'Canonical memorization practice from Surah Al-Fil through Surah An-Nas.',
    type: 'course',
    editions: surahAlFilPackage.editions.map(edition => ({ ...edition, textSourceId: QURAN_SOURCE_ID, version: 'content-api-v4' })),
    surahs,
    ayat,
    wordTokens,
    themes: [],
    recitationTracks: tracks,
    localization: { ...surahAlFilPackage.localization, defaultLocale: 'en' },
    learningPaths: [path],
    levels,
    sources,
    localePublications: [
      { locale: 'en', status: 'draft', version: '4.1-candidate', availableAlternatives: [] },
      { locale: 'ar', status: 'unavailable', version: '0', availableAlternatives: ['en'] },
      { locale: 'fr', status: 'unavailable', version: '0', availableAlternatives: ['en'] },
    ],
    creationMethod: 'provider_verbatim',
    governance: {
      evidence: surahAlFilPackage.governance?.evidence ?? [],
      approvals: surahAlFilPackage.governance?.approvals ?? [],
      licenseGrants: (surahAlFilPackage.governance?.licenseGrants ?? []).map(grant => grant.sourceId === AUDIO_SOURCE_ID
        ? { ...grant, resourceIds: tracks.map(track => track.id) }
        : grant),
    },
    metadata: {
      totalLevels: levels.length,
      totalDuration: levels.reduce((total, level) => total + level.durationMinutes, 0),
      language: 'en',
      targetAudience: 'family',
      defaultLearningPathId: path.id,
    },
  };
  const firstVerse = verseResults[0];
  return {
    package: contentPackage,
    attributions: [
      { provider: 'quran-foundation', sourceId: QURAN_SOURCE_ID, resourceId: 'uthmani-hafs-105-114', version: firstVerse.sourceVersion, publisher: 'Quran Foundation', attributionText: 'Uthmani Hafs Quran text and word tokens provided by Quran Foundation.', fetchedAt: firstVerse.fetchedAt, expiresAt: firstVerse.expiresAt },
      { provider: 'quranenc', sourceId: TRANSLATION_SOURCE_ID, resourceId: translationResults[0].providerResourceId, version: translationResults[0].version, publisher: translationResults[0].publisher, attributionText: translationResults[0].attributionText },
      { provider: 'mp3quran', sourceId: AUDIO_SOURCE_ID, resourceId: 'reciter-118-mushaf-118-surahs-105-114', version: 'api-v3', publisher: 'MP3Quran.net', attributionText: audioResults[0].attributionText },
    ],
  };
}

function normalizeTokens(verse: ProviderVerse): WordToken[] {
  const [surahNumber, ayahNumber] = verse.verse_key.split(':').map(Number);
  const words = verse.words.filter(word => word.char_type_name !== 'end' && word.text_uthmani?.trim());
  if (!verse.text_uthmani?.trim() || words.length === 0) throw new Error(`Quran Foundation verse ${verse.verse_key} is incomplete`);
  return words.map((word, index) => ({
    id: `${verse.verse_key}:word:${index + 1}`,
    editionId: HAFS_AN_ASIM_ID,
    ayahRef: { surahNumber, ayahNumber },
    position: index + 1,
    arabicText: word.text_uthmani,
    sourceId: QURAN_SOURCE_ID,
    sourceVersion: 'content-api-v4',
  }));
}

function normalizeAyah(
  result: ProviderResult<ProviderVerseResponse>,
  tokens: WordToken[],
  translationRows: QuranEncRow[],
): AyahRecord {
  const verse = result.data.verse;
  const [surahNumber, ayahNumber] = verse.verse_key.split(':').map(Number);
  const verseTokens = tokens.filter(token => token.ayahRef.surahNumber === surahNumber && token.ayahRef.ayahNumber === ayahNumber);
  const translationRow = translationRows.find(row => Number(row.sura) === surahNumber && Number(row.aya) === ayahNumber);
  if (!translationRow?.translation.trim()) throw new Error(`QuranEnc translation ${verse.verse_key} is unavailable`);
  const translations: TranslationEntry[] = [{
    id: `${TRANSLATION_SOURCE_ID}:${verse.verse_key}`,
    locale: 'en',
    text: translationRow.translation,
    sourceId: TRANSLATION_SOURCE_ID,
    reviewerStatus: 'draft',
    providerResourceId: 'english_rwwad',
    resourceVersion: '1.0.19',
    publisher: 'Rowwad Translation Center',
    attributionText: 'Rowwad Translation Center, provided by QuranEnc. Provider text is unmodified.',
    footnotes: translationRow.footnotes ?? '',
  }];
  return {
    id: verse.verse_key,
    editionId: HAFS_AN_ASIM_ID,
    ref: { surahNumber, ayahNumber },
    arabicText: { text: verse.text_uthmani, sourceId: QURAN_SOURCE_ID, reviewerStatus: 'draft' },
    wordTokenIds: verseTokens.map(token => token.id),
    sourceId: QURAN_SOURCE_ID,
    sourceVersion: result.sourceVersion,
    checksum: createHash('sha256').update(verse.text_uthmani).digest('hex'),
    transliteration: verse.words
      .filter(word => word.char_type_name !== 'end')
      .map(word => typeof word.transliteration === 'string' ? word.transliteration : word.transliteration?.text)
      .filter(Boolean)
      .join(' '),
    translations,
    tafsirEntries: [],
  };
}

function normalizeTracks(stream: Mp3QuranStream): RecitationTrack[] {
  const expected = surahAlFilPackage.surahs.find(surah => surah.surahNumber === stream.surahId)?.ayahCount;
  if (!expected || stream.segments.length !== expected) throw new Error(`MP3Quran timings for Surah ${stream.surahId} are incomplete`);
  return stream.segments.map(segment => ({
    id: `husary-${stream.surahId}-${segment.ayah}`,
    providerResourceId: `mp3quran:118:118:${stream.surahId}:${segment.ayah}`,
    providerReciterId: '118', providerMushafId: '118', providerRiwayahId: '1', providerSurahId: stream.surahId,
    reciterId: RECITER_ID, editionId: HAFS_AN_ASIM_ID,
    ayahRef: { surahNumber: stream.surahId, ayahNumber: segment.ayah },
    sourceId: AUDIO_SOURCE_ID, license: 'Direct MP3Quran streaming only', deliveryMode: 'stream_only',
    approvedHostnames: [...stream.approvedHostnames], startMs: segment.startMs, endMs: segment.endMs,
    durationMs: segment.endMs - segment.startMs, format: 'mp3', asset: { kind: 'remote', uri: stream.uri },
  }));
}

function buildCourseCurriculum(surahs: SurahRecord[], ayat: AyahRecord[], tokens: WordToken[]): { path: LearningPath; levels: Level[] } {
  const pathId = 'surah-al-fil-path-v1';
  const selected = surahs.filter(surah => COURSE_SURAH_NUMBERS.includes(surah.surahNumber));
  const levels: Level[] = [];
  const curricula: SurahCurriculum[] = [];
  let previousLevelId: string | undefined;
  selected.forEach(surah => {
    const slug = `surah-${surah.surahNumber}`;
    const introId = courseLevelId(surah.surahNumber, 'introduction');
    const intro = introductionLevel(pathId, surah, introId, previousLevelId);
    levels.push(intro);
    const lessonIds: string[] = [introId];
    previousLevelId = introId;
    for (let ayahNumber = 1; ayahNumber <= surah.ayahCount; ayahNumber += 1) {
      const level = ayahLevel(pathId, surah, courseLevelId(surah.surahNumber, 'ayah', ayahNumber), ayahNumber, previousLevelId, ayat, tokens);
      levels.push(level);
      lessonIds.push(level.id);
      previousLevelId = level.id;
    }
    const review = reviewLevel(pathId, surah, courseLevelId(surah.surahNumber, 'review'), previousLevelId, tokens);
    levels.push(review);
    lessonIds.push(review.id);
    previousLevelId = review.id;
    curricula.push({
      id: `${slug}-curriculum-v1`, surahId: surah.id,
      lessons: [
        { levelId: intro.id, kind: 'introduction' },
        ...Array.from({ length: surah.ayahCount }, (_, index) => ({
          levelId: courseLevelId(surah.surahNumber, 'ayah', index + 1), kind: 'ayah' as const,
          ayahRange: { start: { surahNumber: surah.surahNumber, ayahNumber: index + 1 }, end: { surahNumber: surah.surahNumber, ayahNumber: index + 1 } },
        })),
        { levelId: review.id, kind: 'final_review', ayahRange: { start: { surahNumber: surah.surahNumber, ayahNumber: 1 }, end: { surahNumber: surah.surahNumber, ayahNumber: surah.ayahCount } }, reviewSegmentId: `${slug}-final` },
      ],
      reviewSegments: [{ id: `${slug}-final`, coveredLessonIds: lessonIds.slice(1, -1), reviewLevelId: review.id }],
      completionMigrations: surah.surahNumber === 105 ? [
        { id: 'al-fil-split-ayat-3-4-v1', historicalLevelId: 'al-fil-level-3-ayat-3-4', completedLevelIds: ['al-fil-level-3-ayah-3', 'al-fil-level-4-ayah-4'] },
        { id: 'al-fil-split-ayah-5-review-v1', historicalLevelId: 'al-fil-level-4-ayah-5-review', completedLevelIds: ['al-fil-level-5-ayah-5', 'al-fil-level-final-review'] },
      ] : undefined,
    });
  });
  const path: LearningPath = {
    id: pathId,
    title: 'Al-Fil to An-Nas',
    description: 'Canonical memorization practice for ten short Surahs.',
    surahIds: selected.map(surah => surah.id),
    levelIds: levels.map(level => level.id),
    surahCurricula: curricula,
    discovery: { alignment: { type: 'custom_ranges', ranges: selected.map(surah => ({ start: { surahNumber: surah.surahNumber, ayahNumber: 1 }, end: { surahNumber: surah.surahNumber, ayahNumber: surah.ayahCount } })) }, themeIds: [], contentTypes: ['surah_course'], studyLocales: ['en'], audiences: ['teen', 'adult', 'family'] },
    sourceMetadata: { reviewerStatus: 'draft', sourceIds: [QURAN_SOURCE_ID, TRANSLATION_SOURCE_ID], notes: 'Provider-verbatim canonical practice. No authored tafsir or reflection.' },
  };
  return { path, levels };
}

function introductionLevel(pathId: string, surah: SurahRecord, id: string, previousLevelId?: string): Level {
  return {
    id, pathId, surahId: surah.id, title: `Discover ${surah.transliteratedName}`,
    description: `${surah.transliteratedName} has ${surah.ayahCount} ayat.`, durationMinutes: 5, ayahRefs: [], difficulty: 'easy', goals: ['memorize'],
    unlockRules: previousLevelId ? { requiresLevelIds: [previousLevelId] } : undefined,
    steps: [{ id: `${id}-overview`, kind: 'surah_introduction', title: 'Surah introduction', blocks: [{ id: `${id}-overview-block`, type: 'surah_overview', surahId: surah.id }] }],
  };
}

function ayahLevel(pathId: string, surah: SurahRecord, id: string, ayahNumber: number, previousLevelId: string, ayat: AyahRecord[], tokens: WordToken[]): Level {
  const ref = { surahNumber: surah.surahNumber, ayahNumber };
  const passageId = `${id}-passage`;
  const tokenIds = tokens.filter(token => token.ayahRef.surahNumber === surah.surahNumber && token.ayahRef.ayahNumber === ayahNumber).map(token => token.id);
  const ayah = ayat.find(candidate => candidate.ref.surahNumber === surah.surahNumber && candidate.ref.ayahNumber === ayahNumber);
  const translationId = ayah?.translations[0]?.id;
  if (!translationId || tokenIds.length === 0) throw new Error(`Runtime curriculum data for ${surah.surahNumber}:${ayahNumber} is incomplete`);
  return {
    id, pathId, surahId: surah.id, title: `Ayah ${ayahNumber}`, description: `Listen, read, and rebuild Ayah ${ayahNumber}.`,
    durationMinutes: 6, ayahRefs: [ref], difficulty: 'easy', goals: ['memorize', 'understand'],
    completionRules: { requireMemoryActivity: true, requireUnderstandingActivity: true }, unlockRules: { requiresLevelIds: [previousLevelId] },
    steps: [
      { id: `${id}-read`, kind: 'read', title: 'Read / Listen', blocks: [{ id: passageId, type: 'quran_passage', ayahRefs: [ref], showTransliteration: true }, { id: `${id}-audio`, type: 'audio', ayahRefs: [ref], reciterId: RECITER_ID }] },
      { id: `${id}-translation-step`, kind: 'translation', title: 'Translation', blocks: [{ id: `${id}-translation`, type: 'translation', ayahRefs: [ref], locale: 'en', translationEntryIds: [translationId] }] },
      { id: `${id}-memorize`, kind: 'memorize', title: 'Build the Ayah', blocks: [{ id: `${id}-order`, type: 'activity', activity: { id: `${id}-order`, kind: 'order_tokens', placement: 'lesson', ayahRefs: [ref], instruction: `Build Ayah ${ayahNumber} from the word bank.`, required: true, difficulty: 2, knowledgeRefs: [passageId], sourceIds: [QURAN_SOURCE_ID], reviewerStatus: 'draft', languageIndependent: true, reviewSchedule: { intervalDays: [1, 3, 7] }, config: { itemIds: [...tokenIds].reverse(), correctOrderIds: tokenIds } } }] },
      { id: `${id}-understanding`, kind: 'understanding_practice', title: 'Complete the Ayah', blocks: [{ id: `${id}-gap`, type: 'activity', activity: { id: `${id}-gap`, kind: 'fill_gap', placement: 'lesson', ayahRefs: [ref], instruction: `Choose the missing ending token from Ayah ${ayahNumber}.`, required: true, difficulty: 2, knowledgeRefs: [passageId], sourceIds: [QURAN_SOURCE_ID], reviewerStatus: 'draft', languageIndependent: true, reviewSchedule: { intervalDays: [1, 3, 7] }, config: { tokenBankIds: [...tokenIds].reverse(), correctTokenIds: [tokenIds.at(-1)!] } } }] },
    ],
  };
}

function reviewLevel(pathId: string, surah: SurahRecord, id: string, previousLevelId: string, tokens: WordToken[]): Level {
  const refs = Array.from({ length: surah.ayahCount }, (_, index) => ({ surahNumber: surah.surahNumber, ayahNumber: index + 1 }));
  const finalTokens = tokens.filter(token => token.ayahRef.surahNumber === surah.surahNumber && token.ayahRef.ayahNumber === surah.ayahCount).map(token => token.id);
  return {
    id, pathId, surahId: surah.id, title: 'Surah Review', description: `Validate your recall of ${surah.transliteratedName}.`,
    durationMinutes: 8, ayahRefs: refs, difficulty: 'hard', goals: ['memorize', 'quiz'], metadata: { isFinalReview: true },
    completionRules: { requireMemoryActivity: true, requireUnderstandingActivity: true }, unlockRules: { requiresLevelIds: [previousLevelId] },
    steps: [
      { id: `${id}-read`, kind: 'read', title: 'Review the Surah', blocks: [{ id: `${id}-passage`, type: 'quran_passage', ayahRefs: refs, showTransliteration: false }] },
      { id: `${id}-order-step`, kind: 'memory_practice', title: 'Order the Ayat', blocks: [{ id: `${id}-order`, type: 'activity', activity: { id: `${id}-order`, kind: 'order_ayat', placement: 'surah_review', ayahRefs: refs, instruction: `Put all ayat of ${surah.transliteratedName} in Quran order.`, required: true, difficulty: 3, knowledgeRefs: [`${id}-passage`], sourceIds: [QURAN_SOURCE_ID], reviewerStatus: 'draft', languageIndependent: true, reviewSchedule: { intervalDays: [1, 3, 7] }, config: { correctOrderRefs: refs } } }] },
      { id: `${id}-checkpoint`, kind: 'understanding_practice', title: 'Final Checkpoint', blocks: [{ id: `${id}-continue`, type: 'activity', activity: { id: `${id}-continue`, kind: 'choose_continuation', placement: 'surah_review', ayahRefs: refs, instruction: 'Choose the correct continuation of the final ayah.', required: true, difficulty: 3, knowledgeRefs: [`${id}-passage`], sourceIds: [QURAN_SOURCE_ID], reviewerStatus: 'draft', languageIndependent: true, reviewSchedule: { intervalDays: [1, 3, 7] }, config: { promptTokenIds: [finalTokens[0]], optionIds: [`${id}-correct`, `${id}-reversed`], correctOptionId: `${id}-correct`, segments: [{ id: `${id}-correct`, tokenIds: finalTokens.slice(1) }, { id: `${id}-reversed`, tokenIds: finalTokens.slice(1).reverse() }] } } }] },
    ],
  };
}

function courseLevelId(surahNumber: number, kind: 'introduction' | 'ayah' | 'review', ayahNumber?: number): string {
  if (surahNumber === 105) {
    if (kind === 'introduction') return 'al-fil-level-introduction';
    if (kind === 'review') return 'al-fil-level-final-review';
    if (ayahNumber === 1) return 'al-fil-level-1-context-ayah-1';
    if (ayahNumber === 2) return 'al-fil-level-2-ayah-2';
    return `al-fil-level-${ayahNumber}-ayah-${ayahNumber}`;
  }
  if (kind === 'introduction') return `surah-${surahNumber}-introduction`;
  if (kind === 'review') return `surah-${surahNumber}-final-review`;
  return `surah-${surahNumber}-ayah-${ayahNumber}`;
}

function runtimeSurah(surah: SurahRecord): SurahRecord {
  return { ...surah, navigationOnly: false, sourceMetadata: { quranTextSourceId: QURAN_SOURCE_ID, translationSourceIds: [TRANSLATION_SOURCE_ID], tafsirSourceIds: [], reviewerStatus: 'draft', notes: 'Canonical runtime content fetched through the Furqan backend.' } };
}

function readTranslationRows(result: QuranEncResult): QuranEncRow[] {
  const data = result.data as Partial<QuranEncPayload>;
  if (!Array.isArray(data.result)) throw new Error(`QuranEnc ${result.resourceId} payload is invalid`);
  return data.result;
}

function quranSource(): ContentSource {
  return { id: QURAN_SOURCE_ID, name: 'Quran Foundation Uthmani Hafs', publisher: 'Quran Foundation', version: 'content-api-v4', language: 'ar', reviewerStatus: 'draft', license: 'Provider terms: backend cache capped at seven days; mobile persistence prohibited.', notes: 'Runtime-only canonical text and words. Production approval remains required.' };
}

function quranEncSource(): ContentSource {
  return { id: TRANSLATION_SOURCE_ID, name: 'Rowwad English Translation', author: 'Rowwad Translation Center', publisher: 'QuranEnc', version: '1.0.19', language: 'en', reviewerStatus: 'draft', license: 'QuranEnc provider terms require evidence review - production disabled', notes: 'Verbatim pinned provider payload.' };
}

function requireSource(id: string): ContentSource {
  const source = surahAlFilPackage.sources.find(candidate => candidate.id === id);
  if (!source) throw new Error(`Base source ${id} is unavailable`);
  return source;
}

async function mapConcurrent<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index]);
    }
  }));
  return results;
}
