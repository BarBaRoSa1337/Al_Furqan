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
import type { RecitationTrack, Reciter } from '../../../src/types/media';
import type {
  QuranContentProvider,
  QuranProviderChapter,
  QuranProviderChapterInfo,
  QuranProviderRecitation,
  QuranProviderResource,
  QuranProviderResourceConfig,
  QuranProviderResourceCatalog,
  QuranProviderResult,
  QuranProviderTafsir,
  QuranProviderVerse,
} from './quranContentProvider';
import type { QuranEncClient, QuranEncResult } from './quranEnc';

const COURSE_SURAH_NUMBERS = Array.from({ length: 10 }, (_, index) => index + 105);
const QURAN_SOURCE_ID = 'quran-foundation-hafs-uthmani-v4';
const QF_TRANSLATION_SOURCE_ID = 'quran-foundation-translation';
const AUDIO_SOURCE_ID = 'quran-foundation-recitation';
const STRUCTURE_SOURCE_ID = 'quran-foundation-structure-v4';
const CHAPTER_INFO_SOURCE_ID = 'quran-foundation-chapter-info';
const TAFSIR_SOURCE_ID = 'quran-foundation-tafsir';
const RECITER_ID = 'mahmoud-khalil-al-husary';
const QF_AUDIO_HOSTS = ['verses.quran.com', 'audio.qurancdn.com'] as const;

export interface RuntimeCourseDependencies {
  quranFoundation: QuranContentProvider;
  quranEnc?: QuranEncClient;
  resources: QuranProviderResourceConfig;
}

interface RuntimeTranslationSource {
  contentSource: ContentSource;
  attribution: SourceAttribution;
}

interface RuntimeTranslationValue {
  text: string;
  providerFootnotes?: Record<string, string>;
  footnotes?: string;
}

interface RuntimeChapterContent {
  verses: QuranProviderResult<QuranProviderVerse[]>;
  translations: Map<string, RuntimeTranslationValue>;
  translationSource: RuntimeTranslationSource;
}

export async function buildShortSurahRuntimeCourse(
  locale: SupportedLocale,
  dependencies: RuntimeCourseDependencies,
): Promise<{ package: ContentPackage; attributions: SourceAttribution[] } | undefined> {
  // Other locales remain unavailable until complete package UI catalogs are reviewed.
  if (locale !== 'en') return undefined;
  const [chapterResult, catalogResult] = await Promise.all([
    dependencies.quranFoundation.listChapters(locale),
    dependencies.quranFoundation.listResources(locale),
  ]);

  validateResourceSelection(catalogResult.data, dependencies.resources, dependencies.quranEnc);
  const selectedChapters = COURSE_SURAH_NUMBERS.map(number => {
    const chapter = chapterResult.data.find(candidate => candidate.id === number);
    if (!chapter) throw new Error(`Quran Foundation chapter ${number} is unavailable`);
    return chapter;
  });
  validateChapterCounts(selectedChapters);

  const chapterContents = await mapConcurrent(COURSE_SURAH_NUMBERS, 4, number => getChapterContent(
    number,
    locale,
    dependencies,
    catalogResult.data,
  ));
  const translationSource = requireConsistentTranslationSource(chapterContents);
  const verseResults = chapterContents.map(content => content.verses);
  const chapterInfoResults = dependencies.resources.chapterInfoId
    ? await optionalProviderBatch(() => mapConcurrent(COURSE_SURAH_NUMBERS, 4, number => dependencies.quranFoundation.getChapterInfo(
      number,
      locale,
      dependencies.resources.chapterInfoId!,
    )))
    : undefined;
  const recitationResults = dependencies.resources.recitationId
    ? await optionalProviderBatch(() => mapConcurrent(COURSE_SURAH_NUMBERS, 3, number => dependencies.quranFoundation.getChapterRecitation(
      number,
      dependencies.resources.recitationId!,
    )))
    : undefined;

  const verses = verseResults.flatMap(result => result.data);
  validateVerses(selectedChapters, verses);
  const tafsirResults = dependencies.resources.tafsirId
    ? await optionalProviderBatch(() => mapConcurrent(verses, 4, verse => {
      const [chapter, ayah] = verse.verseKey.split(':').map(Number);
      return dependencies.quranFoundation.getTafsir(chapter, ayah, dependencies.resources.tafsirId!);
    }))
    : undefined;
  const wordTokens = verses.flatMap(normalizeTokens);
  const translationValues = new Map(chapterContents.flatMap(content => [...content.translations]));
  const ayat = verses.map((verse, index) => normalizeAyah(
    verse,
    wordTokens,
    translationValues.get(verse.verseKey),
    translationSource.contentSource,
    dependencies.resources,
    tafsirResults?.[index].data,
  ));
  const tracks = recitationResults?.flatMap((result, index) => normalizeTracks(
    COURSE_SURAH_NUMBERS[index],
    result.data,
    dependencies.resources.recitationId!,
  )) ?? [];
  const chapterInfos = new Map<number, QuranProviderChapterInfo>();
  chapterInfoResults?.forEach((result, index) => {
    if (result.data) chapterInfos.set(COURSE_SURAH_NUMBERS[index], result.data);
  });
  const surahs = surahAlFilPackage.surahs.map(surah => {
    const chapter = selectedChapters.find(candidate => candidate.id === surah.surahNumber);
    return chapter ? runtimeSurah(chapter, dependencies.resources, translationSource.contentSource.id) : surah;
  });
  const { path, levels } = buildCourseCurriculum(
    surahs,
    ayat,
    wordTokens,
    chapterInfos,
    dependencies.resources,
    tracks.length > 0,
    translationSource.contentSource.id,
  );
  const selectedRecitation = dependencies.resources.recitationId
    ? requireResource(catalogResult.data.recitations, dependencies.resources.recitationId, 'recitation')
    : undefined;
  const sources = providerSources(dependencies.resources, catalogResult.data, translationSource.contentSource);
  const reciters = selectedRecitation ? [runtimeReciter(selectedRecitation, dependencies.resources.recitationId!)] : [];
  const contentPackage: ContentPackage = {
    ...surahAlFilPackage,
    version: '4.1',
    revisionId: 'surah-al-fil-v1-r17-runtime-en',
    previousRevisionIds: ['surah-al-fil-v1-r16-runtime-en', 'surah-al-fil-v1-r16'],
    title: 'Al-Fil to An-Nas',
    description: 'Canonical memorization practice from Surah Al-Fil through Surah An-Nas.',
    type: 'course',
    editions: surahAlFilPackage.editions.map(edition => ({ ...edition, textSourceId: QURAN_SOURCE_ID, version: 'content-api-v4' })),
    surahs,
    ayat,
    wordTokens,
    themes: [],
    reciters,
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
      licenseGrants: (surahAlFilPackage.governance?.licenseGrants ?? []).filter(grant => sources.some(source => source.id === grant.sourceId)),
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
  const attributions: SourceAttribution[] = sources.map(source => (
    source.id === translationSource.contentSource.id
      ? translationSource.attribution
      : {
          provider: 'quran-foundation' as const,
          sourceId: source.id,
          resourceId: source.resourceKey ?? source.id,
          version: source.version,
          publisher: source.publisher ?? 'Quran Foundation',
          attributionText: source.notes ?? 'Content provided by Quran Foundation.',
          fetchedAt: firstVerse.fetchedAt,
          expiresAt: firstVerse.expiresAt,
        }
  ));
  return {
    package: contentPackage,
    attributions,
  };
}

function normalizeTokens(verse: QuranProviderVerse): WordToken[] {
  const [surahNumber, ayahNumber] = verse.verseKey.split(':').map(Number);
  const words = verse.words?.filter(word => word.charTypeName !== 'end' && word.textUthmani?.trim()) ?? [];
  if (!verse.textUthmani?.trim() || words.length === 0) throw new Error(`Quran Foundation verse ${verse.verseKey} is incomplete`);
  return words.map((word, index) => ({
    id: `${verse.verseKey}:word:${index + 1}`,
    editionId: HAFS_AN_ASIM_ID,
    ayahRef: { surahNumber, ayahNumber },
    position: index + 1,
    arabicText: word.textUthmani!,
    sourceId: QURAN_SOURCE_ID,
    sourceVersion: 'content-api-v4',
  }));
}

function normalizeAyah(
  verse: QuranProviderVerse,
  tokens: WordToken[],
  translation: RuntimeTranslationValue | undefined,
  translationSource: ContentSource,
  resources: QuranProviderResourceConfig,
  tafsir?: QuranProviderTafsir,
): AyahRecord {
  const [surahNumber, ayahNumber] = verse.verseKey.split(':').map(Number);
  const verseTokens = tokens.filter(token => token.ayahRef.surahNumber === surahNumber && token.ayahRef.ayahNumber === ayahNumber);
  if (!translation?.text.trim()) throw new Error(`Translation ${verse.verseKey} is unavailable`);
  const providerFootnotes = translation.providerFootnotes ?? {};
  const providerResourceId = translationSource.resourceKey ?? String(resources.translationId);
  const translations: TranslationEntry[] = [{
    id: `${translationSource.id}:${providerResourceId}:${verse.verseKey}`,
    locale: 'en',
    text: translationSource.id === QF_TRANSLATION_SOURCE_ID ? displayProviderText(translation.text) : translation.text,
    providerText: translation.text,
    ...(translation.providerFootnotes ? { providerFootnotes } : {}),
    sourceId: translationSource.id,
    reviewerStatus: 'draft',
    providerResourceId,
    resourceVersion: translationSource.version,
    publisher: translationSource.author ?? translationSource.publisher,
    attributionText: translationSource.attributionText,
    transcriptInfo: translationSource.transcriptInfo,
    footnotes: translation.footnotes ?? Object.values(providerFootnotes).join('\n\n'),
    contentHash: createHash('sha256').update(JSON.stringify({
      text: translation.text,
      footnotes: translation.footnotes ?? providerFootnotes,
    })).digest('hex'),
  }];
  const providerWords = verse.words?.filter(word => word.charTypeName !== 'end' && word.textUthmani?.trim()) ?? [];
  const wordMeanings = providerWords.flatMap((word, index) => {
    const meaning = providerText(word.translation);
    if (!meaning) return [];
    return [{ id: `${QURAN_SOURCE_ID}:meaning:${verse.verseKey}:${index + 1}`, wordTokenId: verseTokens[index].id, transliteration: providerText(word.transliteration) ?? '', meaning, locale: 'en', sourceId: QURAN_SOURCE_ID, reviewerStatus: 'draft' as const }];
  });
  const rawTafsir = providerText(tafsir?.text);
  const tafsirEntries = rawTafsir ? [{
    id: `${TAFSIR_SOURCE_ID}:${resources.tafsirId}:${verse.verseKey}`, locale: 'en', text: displayProviderText(rawTafsir), providerText: rawTafsir,
    providerResourceId: String(resources.tafsirId), contentHash: createHash('sha256').update(rawTafsir).digest('hex'), sourceId: TAFSIR_SOURCE_ID, reviewerStatus: 'draft' as const,
    citation: { sourceId: TAFSIR_SOURCE_ID, locator: `resource ${resources.tafsirId}, ayah ${verse.verseKey}` },
  }] : [];
  return {
    id: verse.verseKey,
    editionId: HAFS_AN_ASIM_ID,
    ref: { surahNumber, ayahNumber },
    arabicText: { text: verse.textUthmani!, sourceId: QURAN_SOURCE_ID, reviewerStatus: 'draft' },
    wordTokenIds: verseTokens.map(token => token.id),
    sourceId: QURAN_SOURCE_ID,
    sourceVersion: 'content-api-v4',
    checksum: createHash('sha256').update(verse.textUthmani!).digest('hex'),
    transliteration: (verse.words ?? [])
      .filter(word => word.charTypeName !== 'end')
      .map(word => word.transliteration?.text)
      .filter(Boolean)
      .join(' '),
    translations,
    tafsirEntries,
    ...(wordMeanings.length === verseTokens.length ? { wordMeanings } : {}),
  };
}

function providerText(value: string | { text?: string } | undefined): string | undefined {
  const text = typeof value === 'string' ? value : value?.text;
  return text?.trim() ? text : undefined;
}

function displayProviderText(value: string): string {
  return value.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>|<\/h[1-6]>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\n{3,}/g, '\n\n').trim();
}

async function optionalProviderBatch<T>(operation: () => Promise<T>): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    if (isOptionalResourceUnavailable(error)) return undefined;
    throw error;
  }
}

function isOptionalResourceUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /^resource unavailable$/i.test(error.message.trim()) || /(?:^|\s)(?:404|not found)(?:\s|$)/i.test(error.message);
}

function normalizeTracks(surahNumber: number, recitations: QuranProviderRecitation[], recitationId: number): RecitationTrack[] {
  const expected = surahAlFilPackage.surahs.find(surah => surah.surahNumber === surahNumber)?.ayahCount;
  if (!expected || recitations.length !== expected) throw new Error(`Quran Foundation recitation for Surah ${surahNumber} is incomplete`);
  return recitations.map(recitation => {
    const [trackSurah, ayah] = recitation.verseKey.split(':').map(Number);
    if (trackSurah !== surahNumber || !Number.isInteger(ayah) || ayah < 1 || ayah > expected) throw new Error(`Quran Foundation recitation ${recitation.verseKey} is invalid`);
    const uri = new URL(recitation.audioUrl);
    if (uri.protocol !== 'https:' || !QF_AUDIO_HOSTS.includes(uri.hostname as typeof QF_AUDIO_HOSTS[number])) throw new Error(`Quran Foundation recitation host is not approved`);
    return {
    id: `qf-${recitationId}-${surahNumber}-${ayah}`,
    providerResourceId: `quran-foundation:${recitationId}:${recitation.verseKey}`,
    providerReciterId: String(recitationId), providerMushafId: String(recitationId), providerRiwayahId: 'hafs', providerSurahId: surahNumber,
    reciterId: RECITER_ID, editionId: HAFS_AN_ASIM_ID,
    ayahRef: { surahNumber, ayahNumber: ayah },
    sourceId: AUDIO_SOURCE_ID, license: 'Quran Foundation Developer Terms; direct streaming only', deliveryMode: 'stream_only',
    approvedHostnames: [...QF_AUDIO_HOSTS], format: recitation.format ?? 'mp3', asset: { kind: 'remote', uri: recitation.audioUrl },
  };
  });
}

function buildCourseCurriculum(
  surahs: SurahRecord[],
  ayat: AyahRecord[],
  tokens: WordToken[],
  chapterInfos: Map<number, QuranProviderChapterInfo>,
  resources: QuranProviderResourceConfig,
  audioAvailable: boolean,
  translationSourceId: string,
): { path: LearningPath; levels: Level[] } {
  const pathId = 'surah-al-fil-path-v1';
  const selected = surahs.filter(surah => COURSE_SURAH_NUMBERS.includes(surah.surahNumber));
  const levels: Level[] = [];
  const curricula: SurahCurriculum[] = [];
  let previousLevelId: string | undefined;
  selected.forEach(surah => {
    const slug = `surah-${surah.surahNumber}`;
    const introId = courseLevelId(surah.surahNumber, 'introduction');
    const intro = introductionLevel(pathId, surah, introId, previousLevelId, chapterInfos.get(surah.surahNumber), resources);
    levels.push(intro);
    const lessonIds: string[] = [introId];
    previousLevelId = introId;
    for (let ayahNumber = 1; ayahNumber <= surah.ayahCount; ayahNumber += 1) {
      const level = ayahLevel(pathId, surah, courseLevelId(surah.surahNumber, 'ayah', ayahNumber), ayahNumber, previousLevelId, ayat, tokens, audioAvailable, translationSourceId);
      levels.push(level);
      lessonIds.push(level.id);
      previousLevelId = level.id;
    }
    const review = reviewLevel(pathId, surah, courseLevelId(surah.surahNumber, 'review'), previousLevelId, tokens, translationSourceId);
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
    sourceMetadata: { reviewerStatus: 'draft', sourceIds: [QURAN_SOURCE_ID, translationSourceId, ...(resources.tafsirId ? [TAFSIR_SOURCE_ID] : [])], notes: 'Provider-verbatim canonical practice with capability locks when protected resources are unavailable.' },
  };
  return { path, levels };
}

function introductionLevel(
  pathId: string,
  surah: SurahRecord,
  id: string,
  previousLevelId: string | undefined,
  chapterInfo: QuranProviderChapterInfo | undefined,
  resources: QuranProviderResourceConfig,
): Level {
  const overviewStepId = `${id}-overview`;
  return {
    id, pathId, surahId: surah.id, title: `Discover ${surah.transliteratedName}`,
    description: `${surah.transliteratedName} has ${surah.ayahCount} ayat.`, durationMinutes: 5, ayahRefs: [], difficulty: 'easy', goals: ['memorize'],
    steps: [
      { id: overviewStepId, kind: 'surah_introduction', title: 'Surah introduction', blocks: [{ id: `${id}-overview-block`, type: 'surah_overview', surahId: surah.id }] },
      ...(chapterInfo
        ? [{ id: `${id}-context`, kind: 'context' as const, title: 'Chapter information', required: false, blocks: [{ id: `${id}-context-block`, type: 'context' as const, kind: 'chapter_information' as const, title: 'About this Surah', text: displayProviderText(chapterInfo.shortText || chapterInfo.text), sourceIds: [CHAPTER_INFO_SOURCE_ID], reviewerStatus: 'draft' as const }] }]
        : []),
    ],
  };
}

function ayahLevel(
  pathId: string,
  surah: SurahRecord,
  id: string,
  ayahNumber: number,
  previousLevelId: string,
  ayat: AyahRecord[],
  tokens: WordToken[],
  audioAvailable: boolean,
  translationSourceId: string,
): Level {
  const ref = { surahNumber: surah.surahNumber, ayahNumber };
  const passageId = `${id}-passage`;
  const tokenIds = tokens.filter(token => token.ayahRef.surahNumber === surah.surahNumber && token.ayahRef.ayahNumber === ayahNumber).map(token => token.id);
  const ayah = ayat.find(candidate => candidate.ref.surahNumber === surah.surahNumber && candidate.ref.ayahNumber === ayahNumber);
  const translationId = ayah?.translations[0]?.id;
  const understandingStepId = `${id}-understanding`;
  const translationOptions = ayat.filter(candidate => candidate.ref.surahNumber === surah.surahNumber).map(candidate => ({ id: candidate.translations[0].id, text: candidate.translations[0].text }));
  if (!translationId || tokenIds.length === 0) throw new Error(`Runtime curriculum data for ${surah.surahNumber}:${ayahNumber} is incomplete`);
  return {
    id, pathId, surahId: surah.id, title: `Ayah ${ayahNumber}`, description: `Listen, read, and rebuild Ayah ${ayahNumber}.`,
    durationMinutes: 7, ayahRefs: [ref], difficulty: 'easy', goals: ['memorize', 'understand'],
    completionRules: { requireMemoryActivity: true, requireUnderstandingActivity: true },
    steps: [
      { id: `${id}-read`, kind: 'read', title: 'Read / Listen', blocks: [
        { id: passageId, type: 'quran_passage', ayahRefs: [ref], showTransliteration: true },
        ...(audioAvailable ? [{ id: `${id}-audio`, type: 'audio' as const, ayahRefs: [ref], reciterId: RECITER_ID }] : []),
      ] },
      ...(!audioAvailable ? [{ id: `${id}-audio-step`, kind: 'read' as const, title: 'Listen', required: false, blocks: [{ id: `${id}-audio-locked`, type: 'source_locked' as const, capability: 'audio' as const, sourceId: AUDIO_SOURCE_ID, reason: 'provider_unavailable' as const, alternativeStepId: `${id}-memorize`, locale: 'ar' }] }] : []),
      { id: `${id}-translation-step`, kind: 'translation', title: 'Translation', blocks: [{ id: `${id}-translation`, type: 'translation', ayahRefs: [ref], locale: 'en', translationEntryIds: [translationId] }] },
      ayah.wordMeanings?.length === tokenIds.length
        ? { id: `${id}-word-meaning`, kind: 'word_meaning', title: 'Word meanings', blocks: [{ id: `${id}-word-explorer`, type: 'word_explorer', ayahRefs: [ref] }] }
        : { id: `${id}-word-meaning`, kind: 'word_meaning', title: 'Word meanings', required: false, blocks: [{ id: `${id}-word-meaning-locked`, type: 'source_locked', capability: 'word_meaning', sourceId: QURAN_SOURCE_ID, reason: 'provider_unavailable', alternativeStepId: understandingStepId, locale: 'en' }] },
      ayah.tafsirEntries[0]
        ? { id: `${id}-tafsir`, kind: 'tafsir', title: 'Tafsir', blocks: [{ id: `${id}-tafsir-block`, type: 'tafsir_ref', ayahRef: ref, tafsirEntryId: ayah.tafsirEntries[0].id }] }
        : { id: `${id}-tafsir`, kind: 'tafsir', title: 'Tafsir', required: false, blocks: [{ id: `${id}-tafsir-locked`, type: 'source_locked', capability: 'tafsir', sourceId: TAFSIR_SOURCE_ID, reason: 'provider_unavailable', alternativeStepId: understandingStepId, locale: 'en' }] },
      { id: `${id}-memorize`, kind: 'memorize', title: 'Build the Ayah', blocks: [{ id: `${id}-order`, type: 'activity', activity: { id: `${id}-order`, kind: 'order_tokens', placement: 'lesson', ayahRefs: [ref], instruction: `Build Ayah ${ayahNumber} from the word bank.`, required: true, difficulty: 2, knowledgeRefs: [passageId], sourceIds: [QURAN_SOURCE_ID], reviewerStatus: 'draft', languageIndependent: true, reviewSchedule: { intervalDays: [1, 3, 7] }, config: { itemIds: [...tokenIds].reverse(), correctOrderIds: tokenIds } } }] },
      { id: understandingStepId, kind: 'understanding_practice', title: 'Match the Translation', blocks: [{ id: `${id}-translation-match`, type: 'activity', activity: { id: `${id}-translation-match`, kind: 'multiple_choice', placement: 'lesson', ayahRefs: [ref], instruction: 'Choose the unchanged translation for this ayah.', required: true, difficulty: 2, knowledgeRefs: [passageId, `${id}-translation`], sourceIds: [translationSourceId], reviewerStatus: 'draft', reviewSchedule: { intervalDays: [1, 3, 7] }, config: { options: translationOptions, correctOptionId: translationId } } }] },
      { id: `${id}-extra-gap-step`, kind: 'memory_practice', title: 'Extra: Complete the Ayah', required: false, blocks: [{ id: `${id}-gap`, type: 'activity', activity: { id: `${id}-gap`, kind: 'fill_gap', placement: 'lesson', ayahRefs: [ref], instruction: `Choose the missing ending token from Ayah ${ayahNumber}.`, required: false, difficulty: 2, knowledgeRefs: [passageId], sourceIds: [QURAN_SOURCE_ID], reviewerStatus: 'draft', languageIndependent: true, reviewSchedule: { intervalDays: [1, 3, 7] }, config: { tokenBankIds: [...tokenIds].reverse(), correctTokenIds: [tokenIds.at(-1)!] } } }] },
      { id: `${id}-extra-type-step`, kind: 'memory_practice', title: 'Extra: Write from Memory', required: false, blocks: [{ id: `${id}-extra-type`, type: 'activity', activity: { id: `${id}-extra-type`, kind: 'type_missing_text', placement: 'lesson', ayahRefs: [ref], instruction: 'Write the ayah from memory. Harakat are optional.', required: false, difficulty: 3, knowledgeRefs: [passageId], sourceIds: [QURAN_SOURCE_ID], reviewerStatus: 'draft', languageIndependent: true, reviewSchedule: { intervalDays: [1, 3, 7] }, config: { target: { kind: 'ayah', ayahRef: ref }, comparisonMode: 'letters_and_order', ignoreHarakat: true } } }] },
      ...(ayah.wordMeanings?.length === tokenIds.length ? [{ id: `${id}-extra-meaning-step`, kind: 'understanding_practice' as const, title: 'Extra: Vocabulary Practice', required: false, blocks: [{ id: `${id}-extra-meaning`, type: 'activity' as const, activity: { id: `${id}-extra-meaning`, kind: 'match_word_meaning' as const, placement: 'lesson' as const, ayahRefs: [ref], instruction: 'Match each Quran word to its source meaning.', required: false, difficulty: 2 as const, knowledgeRefs: [`${id}-word-explorer`], sourceIds: [QURAN_SOURCE_ID], reviewerStatus: 'draft' as const, reviewSchedule: { intervalDays: [1, 3, 7] }, config: { pairs: ayah.wordMeanings.flatMap(meaning => meaning.wordTokenId ? [{ promptTokenId: meaning.wordTokenId, meaningId: meaning.id }] : []) } } }] }] : []),
    ],
  };
}

function reviewLevel(
  pathId: string,
  surah: SurahRecord,
  id: string,
  previousLevelId: string,
  tokens: WordToken[],
  translationSourceId: string,
): Level {
  const refs = Array.from({ length: surah.ayahCount }, (_, index) => ({ surahNumber: surah.surahNumber, ayahNumber: index + 1 }));
  const finalTokens = tokens.filter(token => token.ayahRef.surahNumber === surah.surahNumber && token.ayahRef.ayahNumber === surah.ayahCount).map(token => token.id);
  return {
    id, pathId, surahId: surah.id, title: 'Surah Review', description: `Validate your recall of ${surah.transliteratedName}.`,
    durationMinutes: 8, ayahRefs: refs, difficulty: 'hard', goals: ['memorize', 'quiz'], metadata: { isFinalReview: true },
    completionRules: { requireMemoryActivity: true, requireUnderstandingActivity: true },
    steps: [
      { id: `${id}-read`, kind: 'read', title: 'Review the Surah', blocks: [{ id: `${id}-passage`, type: 'quran_passage', ayahRefs: refs, showTransliteration: false }] },
      { id: `${id}-order-step`, kind: 'memory_practice', title: 'Order the Ayat', blocks: [{ id: `${id}-order`, type: 'activity', activity: { id: `${id}-order`, kind: 'order_ayat', placement: 'surah_review', ayahRefs: refs, instruction: `Put all ayat of ${surah.transliteratedName} in Quran order.`, required: true, difficulty: 3, knowledgeRefs: [`${id}-passage`], sourceIds: [QURAN_SOURCE_ID], reviewerStatus: 'draft', languageIndependent: true, reviewSchedule: { intervalDays: [1, 3, 7] }, config: { correctOrderRefs: refs } } }] },
      { id: `${id}-checkpoint`, kind: 'understanding_practice', title: 'Final Checkpoint', blocks: [{ id: `${id}-continue`, type: 'activity', activity: { id: `${id}-continue`, kind: 'choose_continuation', placement: 'surah_review', ayahRefs: refs, instruction: 'Choose the correct continuation of the final ayah.', required: true, difficulty: 3, knowledgeRefs: [`${id}-passage`], sourceIds: [QURAN_SOURCE_ID], reviewerStatus: 'draft', languageIndependent: true, reviewSchedule: { intervalDays: [1, 3, 7] }, config: { promptTokenIds: [finalTokens[0]], optionIds: [`${id}-correct`, `${id}-reversed`], correctOptionId: `${id}-correct`, segments: [{ id: `${id}-correct`, tokenIds: finalTokens.slice(1) }, { id: `${id}-reversed`, tokenIds: finalTokens.slice(1).reverse() }] } } }] },
      { id: `${id}-recap-step`, kind: 'summary', title: 'Verified Recap', required: false, blocks: [{ id: `${id}-recap-locked`, type: 'source_locked', capability: 'verified_recap', sourceId: translationSourceId, reason: 'license_restricted', alternativeStepId: `${id}-checkpoint`, locale: 'en' }] },
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

function runtimeSurah(chapter: QuranProviderChapter, resources: QuranProviderResourceConfig, translationSourceId: string): SurahRecord {
  const revelationPlace = chapter.revelationPlace?.toLowerCase();
  if (revelationPlace !== 'makkah' && revelationPlace !== 'madinah') throw new Error(`Quran Foundation chapter ${chapter.id} revelation place is invalid`);
  if (!chapter.nameArabic.trim() || !chapter.nameSimple?.trim() || !chapter.translatedName?.name?.trim()) throw new Error(`Quran Foundation chapter ${chapter.id} metadata is incomplete`);
  return {
    id: `surah-${chapter.id}`,
    navigationOnly: false,
    surahNumber: chapter.id,
    arabicName: chapter.nameArabic,
    transliteratedName: chapter.nameSimple,
    englishName: chapter.translatedName.name,
    ayahCount: chapter.versesCount,
    revelationOrder: chapter.revelationOrder,
    revelationPlace,
    sourceMetadata: {
      quranTextSourceId: QURAN_SOURCE_ID,
      translationSourceIds: [translationSourceId],
      tafsirSourceIds: resources.tafsirId ? [TAFSIR_SOURCE_ID] : [],
      reviewerStatus: 'draft',
      notes: 'Canonical Quran content is fetched through the Furqan backend; translation provenance is recorded separately.',
    },
  };
}

function runtimeReciter(resource: QuranProviderResource, resourceId: number): Reciter {
  return {
    id: RECITER_ID,
    displayName: resource.reciterName ?? resource.name ?? `Quran Foundation recitation ${resourceId}`,
    providerResourceId: String(resourceId),
    providerReciterId: String(resourceId),
    editionId: HAFS_AN_ASIM_ID,
    sourceId: AUDIO_SOURCE_ID,
    license: 'Quran Foundation Developer Terms; direct streaming only',
    reviewerStatus: 'draft',
  };
}

function providerSources(
  resources: QuranProviderResourceConfig,
  catalog: QuranProviderResourceCatalog,
  translationSource: ContentSource,
): ContentSource[] {
  const sources: ContentSource[] = [
    {
      id: QURAN_SOURCE_ID,
      name: 'Quran Foundation Uthmani Hafs',
      publisher: 'Quran Foundation',
      version: 'content-api-v4',
      language: 'ar',
      reviewerStatus: 'draft',
      license: 'Quran Foundation Developer Terms; server cache capped at seven days; mobile persistence prohibited.',
      sourceUrl: 'https://api-docs.quran.foundation/docs/category/content-apis/',
      notes: 'Uthmani Hafs Quran text and word data provided by Quran Foundation.',
    },
    {
      id: STRUCTURE_SOURCE_ID,
      name: 'Quran Foundation chapter metadata',
      publisher: 'Quran Foundation',
      version: 'content-api-v4',
      language: 'multilingual',
      reviewerStatus: 'draft',
      license: 'Quran Foundation Developer Terms',
      sourceUrl: 'https://api-docs.quran.foundation/docs/category/content-apis/',
      notes: 'Chapter names, verse counts, revelation order, and revelation place provided by Quran Foundation.',
    },
    translationSource,
  ];
  sources.push(resources.tafsirId
    ? providerResourceSource(TAFSIR_SOURCE_ID, 'tafsir', requireResource(catalog.tafsirs, resources.tafsirId, 'tafsir'), resources.tafsirId)
    : unavailableProviderSource(TAFSIR_SOURCE_ID, 'tafsir'));
  sources.push(resources.chapterInfoId
    ? providerResourceSource(CHAPTER_INFO_SOURCE_ID, 'chapter information', requireResource(catalog.chapterInfos, resources.chapterInfoId, 'chapter information'), resources.chapterInfoId)
    : unavailableProviderSource(CHAPTER_INFO_SOURCE_ID, 'chapter information'));
  sources.push(resources.recitationId
    ? providerResourceSource(AUDIO_SOURCE_ID, 'recitation', requireResource(catalog.recitations, resources.recitationId, 'recitation'), resources.recitationId)
    : unavailableProviderSource(AUDIO_SOURCE_ID, 'recitation'));
  return sources;
}

function providerResourceSource(id: string, kind: string, resource: QuranProviderResource, resourceId: number): ContentSource {
  return {
    id,
    name: resource.name ?? resource.reciterName ?? `Quran Foundation ${kind} ${resourceId}`,
    author: resource.authorName,
    publisher: 'Quran Foundation',
    version: `content-api-v4-resource-${resourceId}`,
    language: resource.languageName ?? (kind === 'recitation' ? 'ar' : 'en'),
    reviewerStatus: 'draft',
    license: 'Quran Foundation Developer Terms; server cache capped at seven days.',
    sourceUrl: 'https://api-docs.quran.foundation/docs/category/content-apis/',
    resourceKey: String(resourceId),
    notes: `${kind} provided by Quran Foundation. Provider wording and attribution are retained; production approval remains required.`,
  };
}

function unavailableProviderSource(id: string, kind: string): ContentSource {
  return {
    id,
    name: `Quran Foundation ${kind}`,
    publisher: 'Quran Foundation',
    version: 'unconfigured',
    language: kind === 'recitation' ? 'ar' : 'en',
    reviewerStatus: 'draft',
    license: 'Quran Foundation Developer Terms',
    sourceUrl: 'https://api-docs.quran.foundation/docs/category/content-apis/',
    notes: `No Quran Foundation ${kind} resource is configured. Preview renders an explicit unavailable state.`,
  };
}

function validateResourceSelection(
  catalog: QuranProviderResourceCatalog,
  resources: QuranProviderResourceConfig,
  quranEnc?: QuranEncClient
): void {
  const hasTranslation = catalog.translations.some(c => c.id === resources.translationId);
  if (!hasTranslation && !quranEnc) {
    throw new Error(`Configured Quran Foundation translation resource ${resources.translationId} is unavailable`);
  }
  if (hasTranslation) requireEnglishResource(catalog.translations, resources.translationId, 'translation');
  if (resources.tafsirId) requireEnglishResource(catalog.tafsirs, resources.tafsirId, 'tafsir');
  if (resources.chapterInfoId) requireEnglishResource(catalog.chapterInfos, resources.chapterInfoId, 'chapter information');
  if (resources.recitationId) requireResource(catalog.recitations, resources.recitationId, 'recitation');
}

function requireEnglishResource(resources: QuranProviderResource[], id: number, kind: string): QuranProviderResource {
  const resource = requireResource(resources, id, kind);
  if (resource.languageName?.toLowerCase() !== 'english') {
    throw new Error(`Configured Quran Foundation ${kind} resource ${id} is not English`);
  }
  return resource;
}

function requireResource(resources: QuranProviderResource[], id: number, kind: string): QuranProviderResource {
  const resource = resources.find(candidate => candidate.id === id);
  if (!resource) throw new Error(`Configured Quran Foundation ${kind} resource ${id} is unavailable`);
  return resource;
}

const EXPECTED_AYAH_COUNTS: Record<number, number> = {
  105: 5, 106: 4, 107: 7, 108: 3, 109: 6,
  110: 3, 111: 5, 112: 4, 113: 5, 114: 6,
};

function validateChapterCounts(chapters: QuranProviderChapter[]): void {
  for (const chapter of chapters) {
    if (chapter.versesCount !== EXPECTED_AYAH_COUNTS[chapter.id]) {
      throw new Error(`Quran Foundation chapter ${chapter.id} has unexpected ayah count ${chapter.versesCount}`);
    }
  }
}

function validateVerses(chapters: QuranProviderChapter[], verses: QuranProviderVerse[]): void {
  const keys = new Set<string>();
  for (const chapter of chapters) {
    const chapterVerses = verses.filter(verse => Number(verse.chapterId ?? verse.verseKey.split(':')[0]) === chapter.id);
    if (chapterVerses.length !== chapter.versesCount) throw new Error(`Quran Foundation chapter ${chapter.id} verse payload is incomplete`);
    for (let ayah = 1; ayah <= chapter.versesCount; ayah += 1) {
      const key = `${chapter.id}:${ayah}`;
      const verse = chapterVerses.find(candidate => candidate.verseKey === key);
      if (!verse || keys.has(key)) throw new Error(`Quran Foundation verse ${key} is missing or duplicated`);
      keys.add(key);
    }
  }
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

async function getChapterContent(
  surahNumber: number,
  locale: SupportedLocale,
  dependencies: RuntimeCourseDependencies,
  catalog: QuranProviderResourceCatalog,
): Promise<RuntimeChapterContent> {
  const qfTranslation = catalog.translations.find(candidate => candidate.id === dependencies.resources.translationId);
  if (!qfTranslation) return executeQuranEncFallback(surahNumber, locale, dependencies);

  const verses = await dependencies.quranFoundation.getChapterVerses(surahNumber, locale, {
    translationId: dependencies.resources.translationId,
  });
  const translations = new Map<string, RuntimeTranslationValue>();
  for (const verse of verses.data) {
    const translation = verse.translations?.find(entry => entry.resourceId === dependencies.resources.translationId);
    if (!translation?.text.trim()) throw new Error(`Quran Foundation translation ${verse.verseKey} is unavailable`);
    translations.set(verse.verseKey, {
      text: translation.text,
      providerFootnotes: translation.footNotes ?? {},
    });
  }
  const source = providerResourceSource(QF_TRANSLATION_SOURCE_ID, 'translation', qfTranslation, dependencies.resources.translationId);
  return {
    verses,
    translations,
    translationSource: {
      contentSource: source,
      attribution: {
        provider: 'quran-foundation',
        sourceId: source.id,
        resourceId: String(dependencies.resources.translationId),
        version: source.version,
        publisher: source.publisher ?? 'Quran Foundation',
        attributionText: source.notes ?? 'Translation provided by Quran Foundation.',
        fetchedAt: verses.fetchedAt,
        expiresAt: verses.expiresAt,
      },
    },
  };
}

async function executeQuranEncFallback(
  surahNumber: number,
  locale: SupportedLocale,
  dependencies: RuntimeCourseDependencies,
): Promise<RuntimeChapterContent> {
  if (!dependencies.quranEnc) throw new Error(`Configured Quran Foundation translation resource ${dependencies.resources.translationId} is unavailable`);
  const fallbackKey = locale === 'fr' ? 'quranenc-french-rashid' : 'quranenc-english-rowwad';
  const [encResult, verses] = await Promise.all([
    dependencies.quranEnc.getSurah(fallbackKey, surahNumber),
    dependencies.quranFoundation.getChapterVerses(surahNumber, locale, {}),
  ]);
  const translations = new Map(encResult.data.map(row => [
    `${surahNumber}:${Number(row.aya)}`,
    { text: row.translation, footnotes: row.footnotes ?? '' },
  ]));
  const source = quranEncTranslationSource(encResult);
  return {
    verses,
    translations,
    translationSource: {
      contentSource: source,
      attribution: {
        provider: 'quranenc',
        sourceId: source.id,
        resourceId: encResult.providerResourceId,
        version: encResult.version,
        publisher: encResult.publisher,
        attributionText: encResult.attributionText,
        fetchedAt: encResult.retrievedAt,
      },
    },
  };
}

function quranEncTranslationSource(result: QuranEncResult): ContentSource {
  return {
    id: result.resourceId,
    name: result.title,
    author: result.publisher,
    publisher: 'QuranEnc',
    version: result.version,
    language: result.locale,
    reviewerStatus: 'draft',
    license: 'QuranEnc published republication conditions',
    sourceUrl: result.attributionUrl,
    resourceKey: result.providerResourceId,
    attributionText: result.attributionText,
    transcriptInfo: result.description,
    retrievedAt: result.retrievedAt,
    lastUpdatedAt: result.lastUpdatedAt,
    evidenceReference: 'https://quranenc.com/nqo/home/api',
    notes: 'Provider translation and footnotes are preserved unchanged.',
  };
}

function requireConsistentTranslationSource(contents: RuntimeChapterContent[]): RuntimeTranslationSource {
  const first = contents[0]?.translationSource;
  if (!first) throw new Error('Runtime translation source is unavailable');
  if (contents.some(content => content.translationSource.contentSource.id !== first.contentSource.id
    || content.translationSource.contentSource.version !== first.contentSource.version)) {
    throw new Error('Runtime course cannot mix translation providers or versions');
  }
  return first;
}
