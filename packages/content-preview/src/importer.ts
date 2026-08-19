import type { LocalePublication, SupportedLocale } from '../../../packages/api-contracts/src';
import basePackage from '../../../src/content/packages/surah-al-fil/v1';
import { sha256Hex } from '../../../src/lib/audio/sha256';
import { stableStringify } from '../../../src/lib/content/governance';
import type {
  AyahRecord,
  ContentPackage,
  ContentSource,
  Level,
  LearningPath,
  QuranEdition,
  SurahRecord,
  TafsirEntry,
  TranslationEntry,
  WordMeaning,
  WordToken,
} from '../../../src/types/content';
import type { RecitationTrack, Reciter } from '../../../src/types/media';
import type { LearningActivity } from '../../../src/types/activities';
import {
  EXPECTED_AYAH_COUNTS,
  MP3QURAN_PERMISSION_URL,
  MP3QURAN_RECITER_ID,
  MP3QURAN_SOURCE_ID,
  PREVIEW_PACKAGE_ID,
  PREVIEW_PACKAGE_VERSION,
  PREVIEW_REVISION_ID,
  PREVIEW_SURAH_NUMBERS,
  QURANENC_RESOURCES,
  TANZIL_LICENSE_URL,
  TANZIL_LICENSE_RAW_URL,
  TANZIL_ATTRIBUTION,
  TANZIL_DOWNLOAD_OPTIONS,
  TANZIL_DOWNLOAD_URL,
  TANZIL_SOURCE_URL,
  TANZIL_TEXT_TYPE,
  TANZIL_TEXT_VERSION,
} from './constants';
import type { PreviewGeneratedFiles, PreviewSourceInputs, QuranEncResourceMetadata, QuranEncRow, TanzilSourceMetadata } from './types';

const TANZIL_SOURCE_ID = 'tanzil-quran-uthmani';
const ENGLISH_SOURCE_ID = 'quranenc-english-rowwad';
const FRENCH_SOURCE_ID = 'quranenc-french-rashid';
const STRUCTURE_SOURCE_ID = 'quran-foundation-structure-v4';
const WORD_MEANING_SOURCE_ID = 'quran-foundation-word-meanings-v4';
const TAFSIR_SOURCE_ID = 'quran-foundation-tafsir-muyassar';
const EDITION_ID = 'hafs-an-asim';
type PreviewLocale = 'en' | 'fr';

export function parseTanzilText(input: string): Map<string, string> {
  const sourceLines = input.split(/\r?\n/).filter(line => line.length > 0 && !line.startsWith('#'));
  const pipeFormatted = sourceLines.every(line => /^\d+\|\d+\|/.test(line));
  if (!pipeFormatted) return parseSequentialTanzilLines(sourceLines);

  const records = new Map<string, string>();
  sourceLines.forEach((line, lineIndex) => {
    const firstSeparator = line.indexOf('|');
    const secondSeparator = line.indexOf('|', firstSeparator + 1);
    const surah = Number(line.slice(0, firstSeparator));
    const ayah = Number(line.slice(firstSeparator + 1, secondSeparator));
    const text = line.slice(secondSeparator + 1);
    if (!Number.isInteger(surah) || !Number.isInteger(ayah)) throw new Error(`Tanzil input line ${lineIndex + 1} has invalid Quran coordinates.`);
    addTanzilRecord(records, surah, ayah, text, lineIndex + 1);
  });
  return records;
}

export function parseQuranEncPayload(value: unknown, resourceKey: string, surahNumber: number): QuranEncRow[] {
  if (!isRecord(value) || !Array.isArray(value.result)) throw new Error(`QuranEnc ${resourceKey} Surah ${surahNumber} payload must contain a result array.`);
  const seen = new Set<number>();
  const rows = value.result.map((row, index) => {
    if (!isRecord(row) || typeof row.sura !== 'string' || typeof row.aya !== 'string' || typeof row.translation !== 'string') {
      throw new Error(`QuranEnc ${resourceKey} Surah ${surahNumber} row ${index + 1} is incomplete.`);
    }
    const aya = Number(row.aya);
    if (Number(row.sura) !== surahNumber || !Number.isInteger(aya)) throw new Error(`QuranEnc ${resourceKey} contains an invalid coordinate in Surah ${surahNumber}.`);
    if (seen.has(aya)) throw new Error(`QuranEnc ${resourceKey} contains duplicate ayah ${surahNumber}:${aya}.`);
    if (!row.translation.trim()) throw new Error(`QuranEnc ${resourceKey} contains blank translation ${surahNumber}:${aya}.`);
    if (row.footnotes !== undefined && typeof row.footnotes !== 'string') throw new Error(`QuranEnc ${resourceKey} footnotes for ${surahNumber}:${aya} must be text.`);
    seen.add(aya);
    return { sura: row.sura, aya: row.aya, translation: row.translation, ...(row.footnotes !== undefined ? { footnotes: row.footnotes } : {}) };
  });
  const expected = EXPECTED_AYAH_COUNTS[surahNumber];
  if (rows.length !== expected || Array.from({ length: expected }, (_, index) => index + 1).some(ayah => !seen.has(ayah))) {
    throw new Error(`QuranEnc ${resourceKey} Surah ${surahNumber} does not contain exact ayat 1-${expected}.`);
  }
  return rows;
}

export function resolveQuranEncMetadata(value: unknown, resourceKey: string, locale: PreviewLocale): QuranEncResourceMetadata {
  const registry = Array.isArray(value) ? value : isRecord(value) && Array.isArray(value.translations) ? value.translations : undefined;
  if (!registry) throw new Error(`QuranEnc ${locale} registry must contain a translations array.`);
  const candidate = registry.find(item => isRecord(item) && item.key === resourceKey);
  if (!isRecord(candidate)) throw new Error(`QuranEnc registry does not contain resource "${resourceKey}".`);
  const version = requiredString(candidate, 'version', resourceKey);
  const updateDate = requiredStringOrNumber(candidate, 'last_update', resourceKey);
  const title = requiredString(candidate, 'title', resourceKey);
  const description = requiredString(candidate, 'description', resourceKey);
  const resource = QURANENC_RESOURCES[locale];
  if (resource.key !== resourceKey) throw new Error(`QuranEnc resource-key mismatch: expected ${resource.key}, received ${resourceKey}.`);
  return {
    key: resourceKey,
    version,
    title,
    description,
    publisher: resource.author,
    attributionText: `${resource.author}, provided by QuranEnc. Translation and footnotes are unmodified.`,
    updateDate,
    raw: candidate,
  };
}

export function parseTanzilMetadata(value: unknown): TanzilSourceMetadata {
  if (!isRecord(value)
    || value.schemaVersion !== 1
    || value.provider !== 'Tanzil Project'
    || value.textVersion !== TANZIL_TEXT_VERSION
    || value.textType !== TANZIL_TEXT_TYPE
    || value.sourceUrl !== TANZIL_SOURCE_URL
    || value.downloadUrl !== TANZIL_DOWNLOAD_URL
    || value.licenseUrl !== TANZIL_LICENSE_URL
    || typeof value.retrievedAt !== 'string'
    || value.attributionText !== TANZIL_ATTRIBUTION
    || value.modificationAllowed !== false
    || !isRecord(value.downloadOptions)
    || !isRecord(value.files)) {
    throw new Error('Tanzil source metadata is malformed.');
  }
  for (const [key, expected] of Object.entries(TANZIL_DOWNLOAD_OPTIONS)) {
    if (value.downloadOptions[key] !== expected) throw new Error(`Tanzil source metadata has invalid download option ${key}.`);
  }
  const textFile = value.files['quran-uthmani.txt'];
  const licenseFile = value.files['LICENSE.txt'];
  if (!isSourceFileEvidence(textFile)) throw new Error('Tanzil source metadata is missing valid evidence for quran-uthmani.txt.');
  if (!isSourceFileEvidence(licenseFile)) throw new Error('Tanzil source metadata is missing valid evidence for LICENSE.txt.');
  if (textFile.url !== TANZIL_DOWNLOAD_URL || licenseFile.url !== TANZIL_LICENSE_RAW_URL) {
    throw new Error('Tanzil source metadata does not reference the official source files.');
  }
  if (!isDate(value.retrievedAt)) throw new Error('Tanzil retrieval date must be an ISO date.');
  return value as unknown as TanzilSourceMetadata;
}

export function buildPreviewPackages(inputs: PreviewSourceInputs): PreviewGeneratedFiles {
  validateSourceEvidence(inputs);
  const tanzil = parseTanzilText(inputs.tanzilText);
  const english = resolveQuranEncMetadata(inputs.englishMetadata, QURANENC_RESOURCES.en.key, 'en');
  const french = resolveQuranEncMetadata(inputs.frenchMetadata, QURANENC_RESOURCES.fr.key, 'fr');
  validateRetrieval(inputs.englishRetrieval, english);
  validateRetrieval(inputs.frenchRetrieval, french);
  const surahs = PREVIEW_SURAH_NUMBERS.map(getSourceSurah);
  const englishRows = readAllTranslations(inputs.englishSurahs, english.key);
  const frenchRows = readAllTranslations(inputs.frenchSurahs, french.key);
  const wordTokens: WordToken[] = [];
  const ayat: AyahRecord[] = [];

  surahs.forEach(surah => {
    for (let ayahNumber = 1; ayahNumber <= surah.ayahCount; ayahNumber += 1) {
      const key = `${surah.surahNumber}:${ayahNumber}`;
      const arabicText = tanzil.get(key);
      const en = englishRows.get(key);
      const fr = frenchRows.get(key);
      if (arabicText === undefined) throw new Error(`Tanzil input is missing ayah ${key}.`);
      if (!en || !fr) throw new Error(`QuranEnc translation inputs are missing ayah ${key}.`);
      const ref = { surahNumber: surah.surahNumber, ayahNumber };
      const tokenIds = splitExactWords(arabicText).map((arabicText, index) => {
        const id = `${key}:word:${index + 1}`;
        wordTokens.push({ id, editionId: EDITION_ID, ayahRef: ref, position: index + 1, arabicText, sourceId: TANZIL_SOURCE_ID, sourceVersion: inputs.tanzilMetadata.textVersion });
        return id;
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawWordMeanings = inputs.wordMeanings[key] as any;
      const wordMeanings: WordMeaning[] = rawWordMeanings?.verse?.words ? tokenIds.map((tokenId, index) => {
        const word = rawWordMeanings.verse.words[index];
        const meaning = word?.translation?.text;
        if (!meaning) return undefined;
        return {
          id: `quran-foundation-word-meanings-v4:meaning:${key}:${index + 1}`,
          wordTokenId: tokenId,
          transliteration: word.transliteration?.text ?? '',
          meaning,
          sourceId: WORD_MEANING_SOURCE_ID,
          reviewerStatus: 'draft',
        } as WordMeaning;
      }).filter((w): w is WordMeaning => w !== undefined) : [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawTafsirData = inputs.tafsirs[surah.surahNumber.toString()] as any;
      let tafsirEntries: TafsirEntry[] = [];
      const tafsirObj = rawTafsirData?.tafsirs?.[key] || (rawTafsirData?.verses?.[key] && rawTafsirData) || rawTafsirData?.[key];
      if (tafsirObj?.text) {
        const plainText = tafsirObj.text.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
        tafsirEntries = [{
          id: `${TAFSIR_SOURCE_ID}:${key}`,
          locale: 'ar',
          text: plainText,
          providerText: tafsirObj.text,
          providerResourceId: '16',
          contentHash: hashText(plainText),
          sourceId: TAFSIR_SOURCE_ID,
          reviewerStatus: 'draft' as const,
          citation: { sourceId: TAFSIR_SOURCE_ID, locator: `resource 16, ayah ${key}` }
        }];
      }

      ayat.push({
        id: key,
        editionId: EDITION_ID,
        ref,
        arabicText: { text: arabicText, sourceId: TANZIL_SOURCE_ID, reviewerStatus: 'draft' },
        wordTokenIds: tokenIds,
        sourceId: TANZIL_SOURCE_ID,
        sourceVersion: inputs.tanzilMetadata.textVersion,
        checksum: hashText(arabicText),
        translations: [translationFor(en, 'en', ENGLISH_SOURCE_ID, english), translationFor(fr, 'fr', FRENCH_SOURCE_ID, french)],
        tafsirEntries,
        wordMeanings,
      });
    }
  });

  return {
    packages: {
      en: buildLocalePackage('en', inputs, surahs, ayat, wordTokens, english, french),
      fr: buildLocalePackage('fr', inputs, surahs, ayat, wordTokens, english, french),
    },
    sourceMetadata: { tanzil: inputs.tanzilMetadata, english, french },
    sourceSurahs: surahs,
  };
}

export function getPackagePayloadJson(pkg: ContentPackage): string {
  return `${stableStringify(pkg)}\n`;
}

function buildLocalePackage(
  locale: PreviewLocale,
  inputs: PreviewSourceInputs,
  surahs: SurahRecord[],
  ayat: AyahRecord[],
  wordTokens: WordToken[],
  english: QuranEncResourceMetadata,
  french: QuranEncResourceMetadata,
): ContentPackage {
  const pathId = 'surah-al-fil-path-v1';
  const { levels, curricula } = buildCurriculum(pathId, locale, surahs, ayat, wordTokens);
  const selectedSourceId = locale === 'en' ? ENGLISH_SOURCE_ID : FRENCH_SOURCE_ID;
  const path: LearningPath = {
    id: pathId,
    title: 'Al-Fil to An-Nas',
    description: 'Local source-backed preview for ten short Surahs.',
    surahIds: surahs.map(surah => surah.id),
    levelIds: levels.map(level => level.id),
    surahCurricula: curricula,
    discovery: { alignment: { type: 'custom_ranges', ranges: surahs.map(surah => ({ start: { surahNumber: surah.surahNumber, ayahNumber: 1 }, end: { surahNumber: surah.surahNumber, ayahNumber: surah.ayahCount } })) }, themeIds: [], contentTypes: ['surah_course'], studyLocales: [locale], audiences: ['teen', 'adult', 'family'] },
    sourceMetadata: { reviewerStatus: 'draft', sourceIds: [TANZIL_SOURCE_ID, selectedSourceId, STRUCTURE_SOURCE_ID], notes: 'Development preview only. No editorial or Islamic approval asserted.' },
  };
  const sources = sourceRecords(inputs, english, french);
  const editions: QuranEdition[] = [{ id: EDITION_ID, qiraah: 'asim', riwayah: 'hafs', displayName: 'Hafs an Asim', textSourceId: TANZIL_SOURCE_ID, fontProfileId: 'madani-mushaf', version: inputs.tanzilMetadata.textVersion, checksum: hashText(inputs.tanzilText) }];
  const publications: LocalePublication[] = [
    { locale: 'en', status: 'draft', version: english.version, availableAlternatives: ['fr'] },
    { locale: 'fr', status: 'draft', version: french.version, availableAlternatives: ['en'] },
    { locale: 'ar', status: 'unavailable', version: '0', availableAlternatives: ['en', 'fr'] },
  ];
  const reciters = previewReciters();
  const recitationTracks = previewTracks(inputs);
  const audioGovernance = basePackage.governance;
  return {
    id: PREVIEW_PACKAGE_ID,
    version: PREVIEW_PACKAGE_VERSION,
    schemaVersion: 4,
    revisionId: `${PREVIEW_REVISION_ID}-${locale}`,
    previousRevisionIds: [`surahs-105-114-local-preview-v1-${locale}`],
    title: 'Al-Fil to An-Nas Local Preview',
    description: 'Development preview. Religious review and production publication intentionally absent.',
    type: 'course',
    sources,
    editions,
    surahs,
    ayat,
    wordTokens,
    divisions: [],
    reciters,
    recitationTracks,
    localization: basePackage.localization,
    mediaAssets: [],
    learningPaths: [path],
    levels,
    localePublications: publications,
    creationMethod: 'provider_verbatim',
    governance: audioGovernance ? {
      evidence: audioGovernance.evidence,
      approvals: [],
      licenseGrants: audioGovernance.licenseGrants
        .filter(grant => grant.sourceId === MP3QURAN_SOURCE_ID)
        .map(grant => ({ ...grant, resourceIds: recitationTracks.map(track => track.id) })),
    } : undefined,
    metadata: { totalLevels: levels.length, totalDuration: levels.reduce((sum, level) => sum + level.durationMinutes, 0), language: locale, targetAudience: 'family', defaultLearningPathId: pathId },
  };
}

function buildOrderAyahActivity(ayah: AyahRecord, passageId: string, orderId: string): LearningActivity {
  const tokenIds = ayah.wordTokenIds;
  if (tokenIds.length <= 4) {
    return {
      id: orderId,
      kind: 'order_tokens',
      placement: 'lesson',
      ayahRefs: [ayah.ref],
      instruction: 'Order the exact Quran words.',
      required: true,
      difficulty: 2,
      knowledgeRefs: [passageId],
      sourceIds: [TANZIL_SOURCE_ID],
      reviewerStatus: 'draft',
      languageIndependent: true,
      reviewSchedule: { intervalDays: [1, 3, 7] },
      config: { itemIds: [...tokenIds].reverse(), correctOrderIds: tokenIds },
    };
  }

  const chunkSize = tokenIds.length >= 8 ? 3 : 2;
  const segments: { id: string; tokenIds: string[] }[] = [];
  for (let i = 0; i < tokenIds.length; i += chunkSize) {
    const chunk = tokenIds.slice(i, i + chunkSize);
    segments.push({
      id: `${orderId}-seg-${segments.length + 1}`,
      tokenIds: chunk,
    });
  }

  const segmentIds = segments.map(s => s.id);
  return {
    id: orderId,
    kind: 'order_segments',
    placement: 'lesson',
    ayahRefs: [ayah.ref],
    instruction: 'Order the Quran phrases to rebuild the ayah.',
    required: true,
    difficulty: 2,
    knowledgeRefs: [passageId],
    sourceIds: [TANZIL_SOURCE_ID],
    reviewerStatus: 'draft',
    languageIndependent: true,
    reviewSchedule: { intervalDays: [1, 3, 7] },
    config: { itemIds: [...segmentIds].reverse(), correctOrderIds: segmentIds, segments },
  };
}

function buildCurriculum(pathId: string, locale: PreviewLocale, surahs: SurahRecord[], ayat: AyahRecord[], tokens: WordToken[]): { levels: Level[]; curricula: NonNullable<LearningPath['surahCurricula']> } {
  const levels: Level[] = [];
  const curricula: NonNullable<LearningPath['surahCurricula']> = [];
  const translationSourceId = locale === 'en' ? ENGLISH_SOURCE_ID : FRENCH_SOURCE_ID;
  surahs.forEach(surah => {
    const introId = courseLevelId(surah.surahNumber, 'introduction');
    levels.push({ id: introId, pathId, surahId: surah.id, title: `Discover ${surah.transliteratedName}`, description: `${surah.ayahCount} ayat`, durationMinutes: 5, ayahRefs: [], difficulty: 'easy', goals: ['memorize'], steps: [{ id: `${introId}-overview`, kind: 'surah_introduction', title: 'Surah introduction', blocks: [{ id: `${introId}-overview-block`, type: 'surah_overview', surahId: surah.id }] }] });
    const lessonIds = [introId];
    const surahAyat = ayat.filter(ayah => ayah.ref.surahNumber === surah.surahNumber);
    const ayahLessons = surahAyat.map(ayah => {
      const ayahNumber = ayah.ref.ayahNumber;
      const id = courseLevelId(surah.surahNumber, 'ayah', ayahNumber);
      const passageId = `${id}-passage`;
      const orderId = `${id}-order`;
      const matchId = `${id}-translation-match`;
      const understandingStepId = `${id}-understanding`;
      const tokenIds = ayah.wordTokenIds;
      const translationOptions = surahAyat.map(candidate => {
        const entry = requireTranslation(candidate, locale);
        return { id: entry.id, text: entry.text };
      });
      const level: Level = {
        id, pathId, surahId: surah.id, title: `Ayah ${ayahNumber}`, description: 'Listen, understand, rebuild, and review the ayah.', durationMinutes: 7, ayahRefs: [ayah.ref], difficulty: 'easy', goals: ['memorize', 'understand'], completionRules: { requireMemoryActivity: true, requireUnderstandingActivity: true },
        steps: [
          { id: `${id}-read`, kind: 'read', title: 'Listen and read', blocks: [{ id: passageId, type: 'ayah_ref', ayahRef: ayah.ref, translationLocale: locale }, { id: `${id}-audio`, type: 'audio', ayahRefs: [ayah.ref], reciterId: MP3QURAN_RECITER_ID }] },
          { id: `${id}-translation`, kind: 'translation', title: 'Translation', blocks: [{ id: `${id}-translation-block`, type: 'translation', ayahRefs: [ayah.ref], locale, translationEntryIds: [requireTranslation(ayah, locale).id] }] },
          ayah.wordMeanings && ayah.wordMeanings.length === tokenIds.length
            ? { id: `${id}-word-meaning`, kind: 'word_meaning', title: 'Word meanings', blocks: [{ id: `${id}-word-explorer`, type: 'word_explorer', ayahRefs: [ayah.ref] }] }
            : { id: `${id}-word-meaning`, kind: 'word_meaning', title: 'Word meanings', required: false, blocks: [{ id: `${id}-word-meaning-locked`, type: 'source_locked', capability: 'word_meaning', sourceId: WORD_MEANING_SOURCE_ID, reason: 'credentials_required', alternativeStepId: understandingStepId, locale }] },
          ayah.tafsirEntries && ayah.tafsirEntries.length > 0
            ? { id: `${id}-tafsir`, kind: 'tafsir', title: 'Tafsir', blocks: [{ id: `${id}-tafsir-block`, type: 'tafsir_ref', ayahRef: ayah.ref, tafsirEntryId: ayah.tafsirEntries[0].id }] }
            : { id: `${id}-tafsir`, kind: 'tafsir', title: 'Tafsir', required: false, blocks: [{ id: `${id}-tafsir-locked`, type: 'source_locked', capability: 'tafsir', sourceId: TAFSIR_SOURCE_ID, reason: 'credentials_required', alternativeStepId: understandingStepId, locale }] },
          { id: `${id}-memory`, kind: 'memory_practice', title: 'Build the ayah', blocks: [{ id: orderId, type: 'activity', activity: buildOrderAyahActivity(ayah, passageId, orderId) }] },
          { id: understandingStepId, kind: 'understanding_practice', title: 'Match the translation', blocks: [{ id: matchId, type: 'activity', activity: { id: matchId, kind: 'multiple_choice', placement: 'lesson', ayahRefs: [ayah.ref], instruction: 'Choose the unchanged translation for this ayah.', required: true, difficulty: 2, knowledgeRefs: [passageId, `${id}-translation-block`], sourceIds: [translationSourceId], reviewerStatus: 'draft', reviewSchedule: { intervalDays: [1, 3, 7] }, config: { options: translationOptions, correctOptionId: requireTranslation(ayah, locale).id } } }] },
          { id: `${id}-extra-gap-step`, kind: 'memory_practice', title: 'Extra: Complete the ayah', required: false, blocks: [{ id: `${id}-extra-gap`, type: 'activity', activity: { id: `${id}-extra-gap`, kind: 'fill_gap', placement: 'lesson', ayahRefs: [ayah.ref], instruction: 'Choose the missing ending token.', required: false, difficulty: 2, knowledgeRefs: [passageId], sourceIds: [TANZIL_SOURCE_ID], reviewerStatus: 'draft', languageIndependent: true, reviewSchedule: { intervalDays: [1, 3, 7] }, config: { tokenBankIds: [...tokenIds].reverse(), correctTokenIds: [tokenIds.at(-1)!] } } }] },
          { id: `${id}-extra-type-step`, kind: 'memory_practice', title: 'Extra: Write from memory', required: false, blocks: [{ id: `${id}-extra-type`, type: 'activity', activity: { id: `${id}-extra-type`, kind: 'type_missing_text', placement: 'lesson', ayahRefs: [ayah.ref], instruction: 'Write the ayah from memory. Harakat are optional.', required: false, difficulty: 3, knowledgeRefs: [passageId], sourceIds: [TANZIL_SOURCE_ID], reviewerStatus: 'draft', languageIndependent: true, reviewSchedule: { intervalDays: [1, 3, 7] }, config: { target: { kind: 'ayah', ayahRef: ayah.ref }, comparisonMode: 'letters_and_order', ignoreHarakat: true } } }] },
        ],
      };
      levels.push(level);
      lessonIds.push(id);
      return { id, ref: ayah.ref };
    });
    const refs = ayahLessons.map(item => item.ref);
    const reviewId = courseLevelId(surah.surahNumber, 'review');
    const passageId = `${reviewId}-passage`;
    const matchSegments = surahAyat.map(ayah => ({
      ayahSegment: { id: `${reviewId}-ayah-${ayah.ref.ayahNumber}`, tokenIds: ayah.wordTokenIds },
      translationSegment: { id: `${reviewId}-translation-${ayah.ref.ayahNumber}`, text: requireTranslation(ayah, locale).text, translationEntryId: requireTranslation(ayah, locale).id },
    }));
    levels.push({
      id: reviewId, pathId, surahId: surah.id, title: 'Surah Review', description: 'Order the ayat and match their exact translations.', durationMinutes: 8, ayahRefs: refs, difficulty: 'medium', goals: ['memorize', 'quiz'], metadata: { isFinalReview: true }, completionRules: { requireMemoryActivity: true, requireUnderstandingActivity: true },
      steps: [
        { id: `${reviewId}-read`, kind: 'read', title: 'Review the Surah', blocks: [{ id: passageId, type: 'quran_passage', ayahRefs: refs }] },
        { id: `${reviewId}-order-step`, kind: 'memory_practice', title: 'Order the ayat', blocks: [{ id: `${reviewId}-order`, type: 'activity', activity: { id: `${reviewId}-order`, kind: 'order_ayat', placement: 'surah_review', ayahRefs: refs, instruction: 'Put all ayat in Quran order.', required: true, difficulty: 3, knowledgeRefs: [passageId], sourceIds: [TANZIL_SOURCE_ID], reviewerStatus: 'draft', languageIndependent: true, reviewSchedule: { intervalDays: [1, 3, 7] }, config: { correctOrderRefs: refs } } }] },
        { id: `${reviewId}-match-step`, kind: 'understanding_practice', title: 'Match translations', blocks: [{ id: `${reviewId}-match`, type: 'activity', activity: { id: `${reviewId}-match`, kind: 'match_ayah_translation', placement: 'surah_review', ayahRefs: refs, instruction: 'Match each ayah to its unchanged translation.', required: true, difficulty: 3, knowledgeRefs: [passageId], sourceIds: [translationSourceId], reviewerStatus: 'draft', reviewSchedule: { intervalDays: [1, 3, 7] }, config: { ayahSegments: matchSegments.map(item => item.ayahSegment), translationSegments: matchSegments.map(item => item.translationSegment), pairs: matchSegments.map(item => ({ ayahSegmentId: item.ayahSegment.id, translationSegmentId: item.translationSegment.id })) } } }] },
        { id: `${reviewId}-recap-step`, kind: 'summary', title: 'Verified Recap', required: false, blocks: [{ id: `${reviewId}-recap-locked`, type: 'source_locked', capability: 'verified_recap', sourceId: translationSourceId, reason: 'license_restricted', alternativeStepId: `${reviewId}-match-step`, locale }] },
      ],
    });
    lessonIds.push(reviewId);
    const segmentId = surah.surahNumber === 105 ? 'al-fil-final-review' : `surah-${surah.surahNumber}-final`;
    curricula.push({
      id: surah.surahNumber === 105 ? 'surah-al-fil-curriculum-v1' : `surah-${surah.surahNumber}-curriculum-v1`,
      surahId: surah.id,
      lessons: [{ levelId: introId, kind: 'introduction' }, ...ayahLessons.map(item => ({ levelId: item.id, kind: 'ayah' as const, ayahRange: { start: item.ref, end: item.ref } })), { levelId: reviewId, kind: 'final_review', ayahRange: { start: refs[0], end: refs.at(-1)! }, reviewSegmentId: segmentId }],
      reviewSegments: [{ id: segmentId, coveredLessonIds: lessonIds.slice(1, -1), reviewLevelId: reviewId }],
      completionEquivalences: surah.surahNumber === 105 ? [{ sourceLevelId: 'al-fil-level-1-context-ayah-1', equivalentLevelIds: ['al-fil-level-introduction'] }] : undefined,
      completionMigrations: surah.surahNumber === 105 ? [
        { id: 'al-fil-split-ayat-3-4-v1', historicalLevelId: 'al-fil-level-3-ayat-3-4', completedLevelIds: ['al-fil-level-3-ayah-3', 'al-fil-level-4-ayah-4'] },
        { id: 'al-fil-split-ayah-5-review-v1', historicalLevelId: 'al-fil-level-4-ayah-5-review', completedLevelIds: ['al-fil-level-5-ayah-5', 'al-fil-level-final-review'] },
      ] : undefined,
    });
  });
  return { levels, curricula };
}

function sourceRecords(inputs: PreviewSourceInputs, english: QuranEncResourceMetadata, french: QuranEncResourceMetadata): ContentSource[] {
  const structure = basePackage.sources.find(source => source.id === STRUCTURE_SOURCE_ID);
  if (!structure) throw new Error('Repository Quran structure source is unavailable.');
  return [
    { id: TANZIL_SOURCE_ID, name: 'Tanzil Uthmani Quran text', publisher: 'Tanzil Project', version: inputs.tanzilMetadata.textVersion, language: 'ar', reviewerStatus: 'draft', license: 'CC BY 3.0', sourceUrl: TANZIL_SOURCE_URL, attributionText: inputs.tanzilMetadata.attributionText, retrievedAt: inputs.tanzilMetadata.retrievedAt, evidenceReference: TANZIL_LICENSE_URL, notes: 'Arabic text preserved unchanged from the terms-accepted official Tanzil source.' },
    translationSource(ENGLISH_SOURCE_ID, english, 'en', inputs.englishRetrieval.retrievedAt),
    translationSource(FRENCH_SOURCE_ID, french, 'fr', inputs.frenchRetrieval.retrievedAt),
    { id: WORD_MEANING_SOURCE_ID, name: 'Quran Foundation word-by-word meanings', publisher: 'Quran Foundation', version: 'content-api-v4', language: 'multilingual', reviewerStatus: 'draft', license: 'Backend access and seven-day cache policy', sourceUrl: 'https://api-docs.quran.com/docs/content_apis_versioned/4.0.0/verses-by-range/', notes: 'Protected backend resource. Not bundled in local preview.' },
    { id: TAFSIR_SOURCE_ID, name: 'Tafsir Al-Muyassar', author: 'King Fahd Complex for the Printing of the Holy Quran', publisher: 'Quran Foundation', version: 'resource-16', language: 'ar', reviewerStatus: 'draft', license: 'Backend access and public Islamic educational use', sourceUrl: 'https://api-docs.quran.com/docs/content_apis_versioned/4.0.0/tafsir/', resourceKey: '16', notes: 'Concise source-verified Arabic commentary.' },
    requireBaseSource(MP3QURAN_SOURCE_ID),
    { ...structure, sourceUrl: 'https://api-docs.quran.com/', notes: `${structure.notes ?? ''} Reused only for structural Surah metadata in development preview.` },
  ];
}

function requireBaseSource(id: string): ContentSource {
  const source = basePackage.sources.find(candidate => candidate.id === id);
  if (!source) throw new Error(`Built-in source ${id} is unavailable.`);
  return source;
}

function previewReciters(): Reciter[] {
  const reciter = basePackage.reciters.find(candidate => candidate.id === MP3QURAN_RECITER_ID);
  if (!reciter) throw new Error('Built-in Al-Husary reciter metadata is unavailable.');
  return [{ ...reciter }];
}

function previewTracks(inputs: PreviewSourceInputs): RecitationTrack[] {
  if (!isDate(inputs.audio.retrievedAt)) throw new Error('MP3Quran retrieval date is invalid.');
  if (inputs.audio.streams.length !== PREVIEW_SURAH_NUMBERS.length) throw new Error('MP3Quran preview metadata must cover Surahs 105-114.');
  return inputs.audio.streams.flatMap(stream => {
    if (!PREVIEW_SURAH_NUMBERS.includes(stream.surahId as typeof PREVIEW_SURAH_NUMBERS[number])) throw new Error(`Unexpected MP3Quran Surah ${stream.surahId}.`);
    if (stream.reciterId !== 118 || stream.mushafId !== 118 || stream.riwayahId !== 1 || stream.deliveryMode !== 'stream_only' || stream.providerVersion !== 'api-v3' || stream.permissionEvidenceUrl !== MP3QURAN_PERMISSION_URL) throw new Error(`MP3Quran identity mismatch for Surah ${stream.surahId}.`);
    const streamUrl = new URL(stream.uri);
    if (streamUrl.protocol !== 'https:' || stream.approvedHostnames.length !== 1 || stream.approvedHostnames[0] !== 'server13.mp3quran.net' || streamUrl.hostname !== 'server13.mp3quran.net') throw new Error(`MP3Quran host mismatch for Surah ${stream.surahId}.`);
    if (stream.segments.length !== EXPECTED_AYAH_COUNTS[stream.surahId]) throw new Error(`MP3Quran timing coverage mismatch for Surah ${stream.surahId}.`);
    stream.segments.forEach((segment, index) => {
      if (segment.ayah !== index + 1 || segment.startMs < 0 || segment.endMs <= segment.startMs) throw new Error(`MP3Quran timing is invalid for Surah ${stream.surahId}, ayah ${index + 1}.`);
    });
    return stream.segments.map(segment => ({
      id: `husary-${stream.surahId}-${segment.ayah}`,
      providerResourceId: `mp3quran:118:118:${stream.surahId}:${segment.ayah}`,
      providerReciterId: '118', providerMushafId: '118', providerRiwayahId: '1', providerSurahId: stream.surahId,
      reciterId: MP3QURAN_RECITER_ID, editionId: EDITION_ID,
      ayahRef: { surahNumber: stream.surahId, ayahNumber: segment.ayah }, sourceId: MP3QURAN_SOURCE_ID,
      license: 'Direct MP3Quran streaming only', deliveryMode: 'stream_only', approvedHostnames: [...stream.approvedHostnames],
      startMs: segment.startMs, endMs: segment.endMs, durationMs: segment.endMs - segment.startMs,
      format: 'mp3', asset: { kind: 'remote', uri: stream.uri },
    }));
  });
}

function translationSource(id: string, metadata: QuranEncResourceMetadata, locale: PreviewLocale, retrievedAt: string): ContentSource {
  return { id, name: metadata.title, author: metadata.publisher, publisher: 'QuranEnc', version: metadata.version, language: locale, reviewerStatus: 'draft', license: 'QuranEnc published republication conditions', sourceUrl: `https://quranenc.com/${locale}/browse/${metadata.key}`, resourceKey: metadata.key, attributionText: metadata.attributionText, transcriptInfo: metadata.description, retrievedAt, lastUpdatedAt: providerDateToIso(metadata.updateDate), evidenceReference: 'https://quranenc.com/nqo/home/api', notes: 'Provider text and footnotes preserved unchanged.' };
}

function translationFor(row: QuranEncRow, locale: PreviewLocale, sourceId: string, metadata: QuranEncResourceMetadata): TranslationEntry {
  return { id: `${sourceId}:${row.sura}:${row.aya}`, locale, text: row.translation, sourceId, reviewerStatus: 'draft', providerResourceId: metadata.key, resourceVersion: metadata.version, publisher: metadata.publisher, attributionText: metadata.attributionText, transcriptInfo: metadata.description, footnotes: row.footnotes ?? '', contentHash: hashText(`${row.translation}\u0000${row.footnotes ?? ''}`) };
}

function readAllTranslations(inputs: Record<number, unknown>, resourceKey: string): Map<string, QuranEncRow> {
  const rows = new Map<string, QuranEncRow>();
  PREVIEW_SURAH_NUMBERS.forEach(number => parseQuranEncPayload(inputs[number], resourceKey, number).forEach(row => rows.set(`${number}:${row.aya}`, row)));
  return rows;
}

function getSourceSurah(number: number): SurahRecord {
  const surah = basePackage.surahs.find(candidate => candidate.surahNumber === number);
  if (!surah) throw new Error(`Repository structure metadata is missing Surah ${number}.`);
  if (surah.ayahCount !== EXPECTED_AYAH_COUNTS[number]) throw new Error(`Surah ${number} structure count mismatch.`);
  return { ...surah, navigationOnly: false, sourceMetadata: { quranTextSourceId: TANZIL_SOURCE_ID, translationSourceIds: [ENGLISH_SOURCE_ID, FRENCH_SOURCE_ID], tafsirSourceIds: [], reviewerStatus: 'draft', notes: `Chapter structure retained from ${STRUCTURE_SOURCE_ID}; Quran text from Tanzil.` } };
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

function parseSequentialTanzilLines(lines: string[]): Map<string, string> {
  const orderedSurahs = [...basePackage.surahs].sort((a, b) => a.surahNumber - b.surahNumber);
  const expectedTotal = orderedSurahs.reduce((total, surah) => total + surah.ayahCount, 0);
  if (lines.length !== expectedTotal) throw new Error(`Tanzil input must use surah|ayah|text format or contain exactly ${expectedTotal} ayah lines.`);
  const records = new Map<string, string>();
  let lineIndex = 0;
  orderedSurahs.forEach(surah => {
    for (let ayah = 1; ayah <= surah.ayahCount; ayah += 1) {
      addTanzilRecord(records, surah.surahNumber, ayah, lines[lineIndex], lineIndex + 1);
      lineIndex += 1;
    }
  });
  return records;
}

function addTanzilRecord(records: Map<string, string>, surah: number, ayah: number, text: string, line: number): void {
  if (!text.trim()) throw new Error(`Tanzil input line ${line} has blank Arabic text.`);
  if (!/[\u0600-\u06ff]/u.test(text)) throw new Error(`Tanzil input line ${line} does not contain Arabic Quran text.`);
  const key = `${surah}:${ayah}`;
  if (records.has(key)) throw new Error(`Tanzil input contains duplicate ayah ${key}.`);
  records.set(key, text);
}

function validateSourceEvidence(inputs: PreviewSourceInputs): void {
  if (!/(creative commons attribution 3\.0|cc\s*by\s*3\.0)/i.test(inputs.tanzilLicense)) throw new Error('Tanzil LICENSE.txt must preserve the complete CC BY 3.0 notice.');
  parseTanzilMetadata(inputs.tanzilMetadata);
}

function validateRetrieval(evidence: PreviewSourceInputs['englishRetrieval'], metadata: QuranEncResourceMetadata): void {
  if (evidence.resourceKey !== metadata.key) throw new Error(`QuranEnc retrieval evidence key mismatch for ${metadata.key}.`);
  if (evidence.version !== metadata.version || evidence.lastUpdate !== metadata.updateDate) throw new Error(`QuranEnc retrieval evidence version mismatch for ${metadata.key}.`);
  if (!isDate(evidence.retrievedAt)) throw new Error(`QuranEnc retrieval date is invalid for ${metadata.key}.`);
}

function requireTranslation(ayah: AyahRecord, locale: PreviewLocale): TranslationEntry {
  const entry = ayah.translations.find(item => item.locale === locale);
  if (!entry) throw new Error(`Translation ${locale} missing for ${ayah.id}.`);
  return entry;
}

function splitExactWords(value: string): string[] {
  const words = value.match(/\S+/gu) ?? [];
  if (words.length === 0) throw new Error('Tanzil ayah contains no word tokens.');
  return words;
}

function requiredString(value: Record<string, unknown>, key: string, resourceKey: string): string {
  const candidate = value[key];
  if (typeof candidate !== 'string' || !candidate.trim()) throw new Error(`QuranEnc registry resource "${resourceKey}" is missing ${key}.`);
  return candidate;
}

function isSourceFileEvidence(value: unknown): value is { url: string; sha256: string } {
  return isRecord(value)
    && typeof value.url === 'string'
    && typeof value.sha256 === 'string'
    && /^[a-f0-9]{64}$/i.test(value.sha256);
}

function requiredStringOrNumber(value: Record<string, unknown>, key: string, resourceKey: string): string | number {
  const candidate = value[key];
  if ((typeof candidate !== 'string' || !candidate.trim()) && (typeof candidate !== 'number' || !Number.isFinite(candidate))) throw new Error(`QuranEnc registry resource "${resourceKey}" is missing ${key}.`);
  return candidate;
}

function providerDateToIso(value: string | number): string {
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error(`QuranEnc last_update is invalid: ${value}.`);
  return date.toISOString();
}

function hashText(value: string): string {
  return sha256Hex(new TextEncoder().encode(value));
}

function isDate(value: string): boolean {
  return value.trim().length > 0 && Number.isFinite(new Date(value).getTime());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
