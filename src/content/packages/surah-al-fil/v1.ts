// Surah Al-Fil Content Package - Version 1
// Canonical Quran content is separate from curriculum levels.
// Tafsir/context summaries remain draft until scholar review.

import {
  AyahRecord,
  ContentPackage,
  ContentSource,
  DiscoveryMetadata,
  QuranEdition,
  Theme,
  WordToken,
  LearningPath,
  Level,
  SurahRecord,
} from '../../../types/content';
import type { RecitationTrack, Reciter } from '../../../types/media';
import { importQuranStructureSnapshot } from '../../../lib/content/structureImporter';
import husaryAudioManifest from '../../audio/hafs/husary-surah-105.json';
import fullStructureSnapshot from '../../structure/hafs/full.json';

const QURAN_ARABIC_SOURCE_ID = 'quran-arabic-madani';
const TRANSLATION_SOURCE_ID = 'quran-translation-sahih-international';
const TAFSIR_SOURCE_ID = 'tafsir-ibn-kathir-summarised';
const STRUCTURE_SOURCE_ID = 'quran-foundation-structure-v4';
const AUDIO_SOURCE_ID = 'quran-foundation-husary-audio-v4';
const HUSARY_RECITER_ID = 'mahmoud-khalil-al-husary';
export const HAFS_AN_ASIM_ID = 'hafs-an-asim' as const;

export const hafsAnAsimEdition: QuranEdition = {
  id: HAFS_AN_ASIM_ID,
  qiraah: 'asim',
  riwayah: 'hafs',
  displayName: 'Hafs an Asim',
  textSourceId: QURAN_ARABIC_SOURCE_ID,
  fontProfileId: 'madani-mushaf',
  version: '1.0',
};

const quranArabicSource: ContentSource = {
  id: QURAN_ARABIC_SOURCE_ID,
  name: 'Quran Arabic - Madani Mushaf',
  author: 'King Fahd Quran Printing Complex',
  publisher: 'King Fahd Quran Printing Complex',
  version: '1.0',
  language: 'ar',
  reviewerStatus: 'draft',
  license: 'Unverified - production distribution disabled',
  notes: 'Canonical text provenance and public-app distribution rights require evidence-bound technical, scholarly, and legal approval.',
};

const quranTranslationSource: ContentSource = {
  id: TRANSLATION_SOURCE_ID,
  name: 'Quran Translation - Sahih International',
  author: 'Saheeh International',
  publisher: 'Saheeh International',
  version: '1.0',
  language: 'en',
  reviewerStatus: 'draft',
  license: 'Unverified - production distribution disabled',
  notes: 'No public-domain or public-app distribution evidence is attached. Keep this translation development-only.',
};

const tafsirSource: ContentSource = {
  id: TAFSIR_SOURCE_ID,
  name: 'Tafsir Ibn Kathir (Summarised)',
  author: 'Ibn Kathir, abridged by Darussalam',
  publisher: 'Darussalam',
  version: '1.0',
  language: 'en',
  reviewerStatus: 'draft',
  notes: 'Summaries pending scholar review before publication.',
  license: 'Unverified - production distribution disabled',
};

const structureSource: ContentSource = {
  id: STRUCTURE_SOURCE_ID,
  name: 'Quran Foundation Content API - Quran structure metadata',
  publisher: 'Quran Foundation',
  version: fullStructureSnapshot.source.version,
  language: 'en',
  reviewerStatus: 'draft',
  notes: 'Development-only snapshot. Technical approval and permission for storage beyond provider cache limits are not attached.',
  license: 'Provider terms require evidence review - production disabled',
};

const audioSource: ContentSource = {
  id: AUDIO_SOURCE_ID,
  name: 'Quran Foundation ayah recitation - Mahmoud Khalil Al-Husary',
  publisher: 'Quran Foundation / QuranicAudio',
  version: husaryAudioManifest.source.version,
  language: 'ar',
  reviewerStatus: 'draft',
  notes: 'Development streaming only. QuranicAudio personal-use language does not establish public-app distribution or persistence rights.',
  license: 'Unverified - persistence and production distribution disabled',
};

const sources = [quranArabicSource, quranTranslationSource, tafsirSource, structureSource, audioSource];
const fullStructure = importQuranStructureSnapshot(fullStructureSnapshot);

const themes: Theme[] = [{
  id: 'theme-stories',
  title: { en: 'Quran stories' },
  aliases: { en: ['stories', 'history'] },
  description: { en: 'Source-backed lessons centered on events narrated or referenced in the Quran.' },
  sourceIds: [TAFSIR_SOURCE_ID],
  reviewerStatus: 'draft',
}];

const alFilDiscovery: DiscoveryMetadata = {
  alignment: { type: 'surah', surahNumber: 105 },
  themeIds: ['theme-stories'],
  contentTypes: ['surah_course'],
  studyLocales: ['en'],
  audiences: ['teen', 'adult', 'family'],
};

const localization = {
  defaultLocale: 'en',
  catalogs: [{
    locale: 'en',
    entries: {
      'app.title': 'Furqan', 'app.loading': 'Loading...', 'app.errorLearningPathNotFound': 'Learning path not found',
      'roadmap.levels': '{count} Levels', 'roadmap.pathProgress': 'Path progress', 'roadmap.loadingProgress': 'Loading progress...', 'roadmap.progressUnavailable': 'Progress could not be loaded.',
      'lesson.loadingLevel': 'Loading level...', 'lesson.levelNotFound': 'Level not found.', 'lesson.backToRoadmap': 'Back to Roadmap', 'lesson.leaveLevel': 'Leave level?', 'lesson.leaveMessage': 'Completed steps are saved. You can continue later.', 'lesson.keepLearning': 'Keep Learning', 'lesson.leave': 'Leave', 'lesson.progressUnavailable': 'Progress unavailable', 'lesson.continue': 'Continue', 'lesson.completeLevel': 'Complete Level', 'lesson.correctFeedback': 'Correct. Keep this in mind.', 'lesson.retryFeedback': 'We will revisit this shortly.', 'lesson.reviewRound': 'Review round: {count} remaining',
      'completion.loading': 'Loading completion...', 'completion.levelNotFound': 'Level not found.', 'completion.progressUnavailable': 'Progress unavailable', 'completion.alhamdulillah': 'Alhamdulillah!', 'completion.completed': 'You completed {title}', 'completion.rewardsEarned': 'Rewards Earned', 'completion.alreadyCounted': 'Already counted earlier', 'completion.levelCompleted': 'Level completed', 'completion.pathXp': '  •  +{xp} path XP', 'completion.saved': 'Completion already saved.', 'completion.startNextLevel': 'Start Next Level', 'completion.backToRoadmap': 'Back to Roadmap',
      'activity.recall': 'Recall', 'activity.reveal': 'Reveal', 'activity.revealAndRate': 'Reveal and rate', 'activity.compareAndRate': 'Compare your recall with the Quran passage, then rate it.', 'activity.again': 'Again', 'activity.hard': 'Hard', 'activity.remembered': 'Remembered', 'activity.selectedAnswer': 'Your answer', 'activity.buildAnswer': 'Tap choices to build your answer', 'activity.matchTranslationHint': 'Tap an ayah segment, then tap its translation', 'activity.typeFromMemory': 'Write from memory. Harakat are optional for this exercise.', 'activity.typedAnswerLabel': 'Arabic answer from memory', 'activity.showArabicKeyboard': 'Show Arabic keyboard', 'activity.hideArabicKeyboard': 'Hide Arabic keyboard', 'activity.arabicKeyboard': 'Arabic keyboard', 'activity.keyboardSpace': 'Space', 'activity.keyboardBackspace': 'Backspace',
      'review.title': 'Spaced Review', 'review.due': '{count} review activities due', 'review.start': 'Start Review', 'review.noneDue': 'No reviews are due right now.', 'review.complete': 'Review complete', 'review.next': 'Next Review', 'review.backToRoadmap': 'Back to Roadmap',
      'question.quiz': 'Quiz', 'question.checkAnswer': 'Check Answer', 'question.checking': 'Saving...', 'question.tryAgain': 'Try Again', 'question.correct': 'Correct!', 'question.answerIs': 'The answer is: {answer}', 'question.fillAnswer': 'Fill in the blank answer', 'question.typeAnswer': 'Type your answer...', 'question.checkMatches': 'Check Matches', 'question.matchHint': 'Tap an Arabic word, then tap its meaning', 'question.true': 'True', 'question.false': 'False',
      'content.translationUnavailable': 'Translation unavailable.', 'content.arabicSource': 'Arabic source', 'content.translationSource': 'Translation source', 'content.source': 'Source', 'content.sourceUnavailable': 'Source unavailable', 'content.unsupported': 'This content is unavailable in this app version.', 'content.tafsir': 'Tafsir', 'content.explanation': 'Explanation', 'content.draftPendingReview': 'Draft religious explanation pending review', 'content.toggleDetails': 'Toggle details', 'content.shareWisdom': 'Share {title}', 'content.wordByWord': 'Word Meaning', 'content.translation': 'Translation', 'content.listen': 'Listen', 'content.audioUnavailable': 'Recitation audio is not included in this package.', 'content.context.historical_context': 'Historical context', 'content.context.occasion_of_revelation': 'Occasion of revelation', 'content.context.tafsir_summary': 'Tafsir summary',
    },
  }],
};

export const surahAlFilRecord: SurahRecord = {
  id: 'surah-al-fil',
  surahNumber: 105,
  arabicName: 'الفيل',
  transliteratedName: 'Al-Fil',
  englishName: 'The Elephant',
  ayahCount: 5,
  revelationOrder: 19,
  revelationPlace: 'makkah',
  sourceMetadata: {
    quranTextSourceId: QURAN_ARABIC_SOURCE_ID,
    translationSourceIds: [TRANSLATION_SOURCE_ID],
    tafsirSourceIds: [TAFSIR_SOURCE_ID],
    reviewerStatus: 'draft',
    notes: 'Arabic and translation are source-attributed. Summaries remain draft until review.',
  },
};

const structureSurahs: SurahRecord[] = fullStructure.surahs.map(surah => ({
  id: `surah-${surah.number}`,
  navigationOnly: true,
  surahNumber: surah.number,
  arabicName: surah.arabicName,
  transliteratedName: surah.transliteratedName,
  englishName: surah.englishName,
  ayahCount: surah.ayahCount,
  revelationOrder: surah.revelationOrder,
  revelationPlace: surah.revelationPlace,
  sourceMetadata: {
    quranTextSourceId: STRUCTURE_SOURCE_ID,
    translationSourceIds: [],
    tafsirSourceIds: [],
    reviewerStatus: 'draft',
    notes: 'Canonical navigation metadata only; Arabic text is not included for this Surah.',
  },
}));

const translation = (id: string, text: string) => ({
  id,
  locale: 'en',
  text,
  sourceId: TRANSLATION_SOURCE_ID,
  reviewerStatus: 'approved' as const,
});

const tafsir = (id: string, text: string, explanation?: string) => ({
  id,
  locale: 'en',
  text,
  sourceId: TAFSIR_SOURCE_ID,
  reviewerStatus: 'draft' as const,
  explanation,
});

const tokenId = (ayahNumber: number, position: number) => `105:${ayahNumber}:word:${position}`;

const canonicalWords: { ayahNumber: number; words: string[] }[] = [
  { ayahNumber: 1, words: ['أَلَمْ', 'تَرَ', 'كَيْفَ', 'فَعَلَ', 'رَبُّكَ', 'بِأَصْحَابِ', 'ٱلْفِيلِ'] },
  { ayahNumber: 2, words: ['أَلَمْ', 'يَجْعَلْ', 'كَيْدَهُمْ', 'فِى', 'تَضْلِيلٍ'] },
  { ayahNumber: 3, words: ['وَأَرْسَلَ', 'عَلَيْهِمْ', 'طَيْرًا', 'أَبَابِيلَ'] },
  { ayahNumber: 4, words: ['تَرْمِيهِم', 'بِحِجَارَةٍ', 'مِّن', 'سِجِّيلٍ'] },
  { ayahNumber: 5, words: ['فَجَعَلَهُمْ', 'كَعَصْفٍ', 'مَّأْكُولٍ'] },
];

export const surahAlFilWordTokens: WordToken[] = canonicalWords.flatMap(({ ayahNumber, words }) => words.map((arabicText, index) => ({
  id: tokenId(ayahNumber, index + 1),
  editionId: HAFS_AN_ASIM_ID,
  ayahRef: { surahNumber: 105, ayahNumber },
  position: index + 1,
  arabicText,
  sourceId: QURAN_ARABIC_SOURCE_ID,
  sourceVersion: '1.0',
})));

const wordTokenIds = (ayahNumber: number) => surahAlFilWordTokens
  .filter(token => token.ayahRef.ayahNumber === ayahNumber)
  .map(token => token.id);

const husaryReciter: Reciter = {
  id: HUSARY_RECITER_ID,
  displayName: husaryAudioManifest.reciter.displayName,
  providerResourceId: husaryAudioManifest.reciter.providerResourceId,
  editionId: HAFS_AN_ASIM_ID,
  sourceId: AUDIO_SOURCE_ID,
  license: 'Unverified - development streaming only',
  reviewerStatus: 'draft',
};

const husaryTracks: RecitationTrack[] = husaryAudioManifest.tracks.map(track => {
  const [surahNumber, ayahNumber] = track.verseKey.split(':').map(Number);
  return {
    id: `husary-${surahNumber}-${ayahNumber}`,
    providerResourceId: track.providerResourceId,
    reciterId: HUSARY_RECITER_ID,
    editionId: HAFS_AN_ASIM_ID,
    ayahRef: { surahNumber, ayahNumber },
    sourceId: AUDIO_SOURCE_ID,
    license: 'Unverified - development streaming only',
    checksum: track.checksum,
    byteSize: track.byteSize,
    format: 'mp3',
    asset: {
      kind: 'remote',
      uri: track.uri,
    },
  };
});

const word = (wordTokenId: string, transliteration: string, meaning: string, root?: string) => ({
  id: `${wordTokenId}:meaning`,
  wordTokenId,
  transliteration,
  meaning,
  root,
  sourceId: TRANSLATION_SOURCE_ID,
  reviewerStatus: 'approved' as const,
});

export const surahAlFilAyat: AyahRecord[] = [
  {
    id: '105:1',
    editionId: HAFS_AN_ASIM_ID,
    ref: { surahNumber: 105, ayahNumber: 1 },
    wordTokenIds: wordTokenIds(1),
    sourceId: QURAN_ARABIC_SOURCE_ID,
    sourceVersion: '1.0',
    checksum: 'f91b44aa8aadad8e9e1e72724b15f9f679ae871914b1ee8bc481f9c3dbdef0b2',
    arabicText: {
      text: 'أَلَمْ تَرَ كَيْفَ فَعَلَ رَبُّكَ بِأَصْحَابِ ٱلْفِيلِ',
      sourceId: QURAN_ARABIC_SOURCE_ID,
      reviewerStatus: 'approved',
    },
    transliteration: 'Alam tara kayfa fa\'ala rabbuka bi-as\'habi l-feel',
    translations: [
      translation(
        '105-1-sahih-en',
        'Have you not considered how your Lord dealt with the companions of the elephant?'
      ),
    ],
    tafsirEntries: [
      tafsir(
        '105-1-ibn-kathir-summary',
        'Allah opens with a rhetorical question that invites reflection on a sign of His power and protection.',
        '"The companions of the elephant" refers to Abraha\'s army that came from Yemen with war elephants, intending to demolish the Kaaba.'
      ),
    ],
    wordMeanings: [
      word(tokenId(1, 1), 'Alam', 'Have not / Did not'),
      word(tokenId(1, 2), 'tara', 'you see / consider'),
      word(tokenId(1, 3), 'kayfa', 'how'),
      word(tokenId(1, 4), "fa'ala", 'He dealt / did'),
      word(tokenId(1, 5), 'Rabbuka', 'your Lord'),
      word(tokenId(1, 6), "bi-as'habi", 'with the companions of'),
      word(tokenId(1, 7), 'al-feel', 'the elephant'),
    ],
  },
  {
    id: '105:2',
    editionId: HAFS_AN_ASIM_ID,
    ref: { surahNumber: 105, ayahNumber: 2 },
    wordTokenIds: wordTokenIds(2),
    sourceId: QURAN_ARABIC_SOURCE_ID,
    sourceVersion: '1.0',
    checksum: '4695b751b2752b02fc411f3481d552ffdbae4c6125c2feb1a96f84eff0ae01c3',
    arabicText: {
      text: 'أَلَمْ يَجْعَلْ كَيْدَهُمْ فِى تَضْلِيلٍ',
      sourceId: QURAN_ARABIC_SOURCE_ID,
      reviewerStatus: 'approved',
    },
    transliteration: "Alam yaj'al kaydahum fee tadleel",
    translations: [translation('105-2-sahih-en', 'Did He not make their plan into misguidance?')],
    tafsirEntries: [
      tafsir(
        '105-2-ibn-kathir-summary',
        'Despite Abraha\'s planning and army, Allah made their scheme futile.',
        'The elephant Mahmud refused to march toward Makkah. This is presented in tafsir as an early sign of Allah\'s intervention.'
      ),
    ],
    wordMeanings: [
      word(tokenId(2, 1), 'Alam', 'Did He not'),
      word(tokenId(2, 2), "yaj'al", 'make / render'),
      word(tokenId(2, 3), 'kaydahum', 'their plan / scheme'),
      word(tokenId(2, 4), 'fee', 'into / in'),
      word(tokenId(2, 5), 'tadleel', 'misguidance / ruin / failure'),
    ],
  },
  {
    id: '105:3',
    editionId: HAFS_AN_ASIM_ID,
    ref: { surahNumber: 105, ayahNumber: 3 },
    wordTokenIds: wordTokenIds(3),
    sourceId: QURAN_ARABIC_SOURCE_ID,
    sourceVersion: '1.0',
    checksum: '28fc4a80e7e164328f51003c4b3639ff13538c783c7d7e12bb5aa947ffd34d69',
    arabicText: {
      text: 'وَأَرْسَلَ عَلَيْهِمْ طَيْرًا أَبَابِيلَ',
      sourceId: QURAN_ARABIC_SOURCE_ID,
      reviewerStatus: 'approved',
    },
    transliteration: 'Wa-arsala alayhim tayran ababeel',
    translations: [translation('105-3-sahih-en', 'And He sent against them birds in flocks,')],
    tafsirEntries: [
      tafsir(
        '105-3-ibn-kathir-summary',
        'Allah sent birds in successive groups against the army.',
        'The word "ababeel" describes groups coming one after another.'
      ),
    ],
    wordMeanings: [
      word(tokenId(3, 1), 'Wa-arsala', 'And He sent'),
      word(tokenId(3, 2), 'alayhim', 'against them / upon them'),
      word(tokenId(3, 3), 'tayran', 'birds'),
      word(tokenId(3, 4), 'ababeel', 'in flocks / in groups'),
    ],
  },
  {
    id: '105:4',
    editionId: HAFS_AN_ASIM_ID,
    ref: { surahNumber: 105, ayahNumber: 4 },
    wordTokenIds: wordTokenIds(4),
    sourceId: QURAN_ARABIC_SOURCE_ID,
    sourceVersion: '1.0',
    checksum: '3b4399b60633a76491e33e1c726c275f06eca86cdc6f3792bbe828eacbf2913e',
    arabicText: {
      text: 'تَرْمِيهِم بِحِجَارَةٍ مِّن سِجِّيلٍ',
      sourceId: QURAN_ARABIC_SOURCE_ID,
      reviewerStatus: 'approved',
    },
    transliteration: 'Tarmeehim bihijaaratin min sijjeel',
    translations: [translation('105-4-sahih-en', 'Striking them with stones of hard clay,')],
    tafsirEntries: [
      tafsir(
        '105-4-ibn-kathir-summary',
        'The stones are described as hardened baked clay.',
        'Their smallness contrasted with the destruction they caused, showing that power belongs to Allah.'
      ),
    ],
    wordMeanings: [
      word(tokenId(4, 1), 'Tarmeehim', 'striking them / pelting them'),
      word(tokenId(4, 2), 'bihijaaratin', 'with stones'),
      word(tokenId(4, 3), 'min', 'of / from'),
      word(tokenId(4, 4), 'sijjeel', 'hard baked clay', 'س-ج-ل'),
    ],
  },
  {
    id: '105:5',
    editionId: HAFS_AN_ASIM_ID,
    ref: { surahNumber: 105, ayahNumber: 5 },
    wordTokenIds: wordTokenIds(5),
    sourceId: QURAN_ARABIC_SOURCE_ID,
    sourceVersion: '1.0',
    checksum: '9f1e9227bc04511fbd0ad946f0d323d531fdb7fd0b38022d3db5b5f25630ecd2',
    arabicText: {
      text: 'فَجَعَلَهُمْ كَعَصْفٍ مَّأْكُولٍ',
      sourceId: QURAN_ARABIC_SOURCE_ID,
      reviewerStatus: 'approved',
    },
    transliteration: "Faja'alahum ka'asfin ma'kool",
    translations: [translation('105-5-sahih-en', 'And He made them like eaten straw.')],
    tafsirEntries: [
      tafsir(
        '105-5-ibn-kathir-summary',
        'The Surah closes with a vivid image of complete destruction: eaten straw, hollow and worthless.',
        'This describes what became of Abraha\'s army after Allah destroyed it.'
      ),
    ],
    wordMeanings: [
      word(tokenId(5, 1), "Faja'alahum", 'And He made them'),
      word(tokenId(5, 2), "ka'asfin", 'like straw / chaff'),
      word(tokenId(5, 3), "ma'kool", 'eaten / devoured'),
    ],
  },
];

export const surahAlFilLearningPath: LearningPath = {
  id: 'surah-al-fil-path-v1',
  title: 'Surah Al-Fil',
  description:
    'Learn Surah Al-Fil through short sessions with Arabic, translation, word meanings, tafsir, context, and quizzes.',
  surahIds: [surahAlFilRecord.id],
  levelIds: [
    'al-fil-level-1-context-ayah-1',
    'al-fil-level-2-ayah-2',
    'al-fil-level-3-ayat-3-4',
    'al-fil-level-4-ayah-5-review',
  ],
  discovery: alFilDiscovery,
  sourceMetadata: {
    reviewerStatus: 'draft',
    sourceIds: [QURAN_ARABIC_SOURCE_ID, TRANSLATION_SOURCE_ID, TAFSIR_SOURCE_ID],
    notes: 'MVP learning path for Surah Al-Fil. Derived explanations pending review.',
  },
};

export const surahAlFilLevels: Level[] = [
  {
    id: 'al-fil-level-1-context-ayah-1',
    pathId: surahAlFilLearningPath.id,
    surahId: surahAlFilRecord.id,
    title: 'Context + Ayah 1',
    description: 'Understand the story setting and begin Ayah 1.',
    durationMinutes: 7,
    ayahRefs: [{ surahNumber: 105, ayahNumber: 1 }],
    difficulty: 'easy',
    goals: ['memorize', 'understand', 'reflect', 'quiz'],
    discovery: alFilDiscovery,
    completionRules: { requireMemoryActivity: true, requireUnderstandingActivity: true },
    steps: [
      {
        id: 'l1-context',
        kind: 'context',
        title: 'Context',
        required: false,
        blocks: [
          {
            id: 'l1-context-year',
            type: 'context',
            kind: 'historical_context',
            title: 'The Year of the Elephant',
            text:
              'In the year Prophet Muhammad ﷺ was born, Abraha marched from Yemen toward Makkah with a great army intending to destroy the Kaaba.',
            sourceIds: [TAFSIR_SOURCE_ID],
            reviewerStatus: 'draft',
          },
        ],
      },
      {
        id: 'l1-read',
        kind: 'read',
        title: 'Read / Listen',
        blocks: [
          { id: 'l1-ayah-1', type: 'quran_passage', ayahRefs: [{ surahNumber: 105, ayahNumber: 1 }], showTransliteration: true },
          { id: 'l1-audio-1', type: 'audio', ayahRefs: [{ surahNumber: 105, ayahNumber: 1 }], reciterId: HUSARY_RECITER_ID },
        ],
      },
      {
        id: 'l1-meaning',
        kind: 'translation',
        title: 'Translation',
        blocks: [{ id: 'l1-translation-1', type: 'translation', ayahRefs: [{ surahNumber: 105, ayahNumber: 1 }], locale: 'en', translationEntryIds: ['105-1-sahih-en'] }],
      },
      {
        id: 'l1-word-meaning',
        kind: 'word_meaning',
        title: 'Word Meaning',
        blocks: [
          { id: 'l1-words-1', type: 'word_meaning', wordMeaningIds: ['105:1:word:3:meaning', '105:1:word:5:meaning', '105:1:word:7:meaning'] },
        ],
      },
      {
        id: 'l1-tafsir',
        kind: 'tafsir',
        title: 'Tafsir',
        blocks: [{ id: 'l1-tafsir-1', type: 'tafsir_ref', ayahRef: { surahNumber: 105, ayahNumber: 1 }, tafsirEntryId: '105-1-ibn-kathir-summary' }],
      },
      {
        id: 'l1-recall',
        kind: 'memorize',
        title: 'Build the Ayah',
        blocks: [
          {
            id: 'l1-recall-ayah-1',
            type: 'activity',
            activity: {
              id: 'l1-recall-ayah-1',
              kind: 'order_tokens',
              ayahRefs: [{ surahNumber: 105, ayahNumber: 1 }],
              instruction: 'Build Ayah 1 from the word bank, in Quran order.',
              required: true,
              difficulty: 1,
              knowledgeRefs: ['l1-ayah-1'],
              sourceIds: [QURAN_ARABIC_SOURCE_ID],
              reviewerStatus: 'approved',
              reviewSchedule: { intervalDays: [1, 3, 7] },
              config: {
                itemIds: ['105:1:word:4', '105:1:word:1', '105:1:word:7', '105:1:word:3', '105:1:word:6', '105:1:word:2', '105:1:word:5'],
                correctOrderIds: ['105:1:word:1', '105:1:word:2', '105:1:word:3', '105:1:word:4', '105:1:word:5', '105:1:word:6', '105:1:word:7'],
              },
            },
          },
        ],
      },
      {
        id: 'l1-memory-practice',
        kind: 'memory_practice',
        title: 'Extra: Fill the Gap',
        required: false,
        blocks: [
          {
            id: 'l1-fill-gap-1',
            type: 'activity',
            activity: {
              id: 'l1-fill-gap-1', kind: 'fill_gap', ayahRefs: [{ surahNumber: 105, ayahNumber: 1 }],
              instruction: 'Choose the missing ending token from Ayah 1.', required: true, difficulty: 1,
              knowledgeRefs: ['l1-ayah-1'], sourceIds: [QURAN_ARABIC_SOURCE_ID], reviewerStatus: 'approved',
              reviewSchedule: { intervalDays: [1, 3, 7] },
              config: { tokenBankIds: ['105:1:word:3', '105:1:word:7', '105:1:word:1'], correctTokenIds: ['105:1:word:7'] },
            },
          },
        ],
      },
      {
        id: 'l1-order-words',
        kind: 'memory_practice',
        title: 'Extra: Rebuild the Ayah',
        required: false,
        blocks: [{
          id: 'l1-order-ayah-1', type: 'activity', activity: {
            id: 'l1-order-ayah-1', kind: 'order_tokens', ayahRefs: [{ surahNumber: 105, ayahNumber: 1 }],
            instruction: 'Put every word of Ayah 1 in the correct order.', required: true, difficulty: 2,
            knowledgeRefs: ['l1-ayah-1'], sourceIds: [QURAN_ARABIC_SOURCE_ID], reviewerStatus: 'approved',
            reviewSchedule: { intervalDays: [1, 3, 7] },
            config: {
              itemIds: ['105:1:word:4', '105:1:word:1', '105:1:word:7', '105:1:word:3', '105:1:word:6', '105:1:word:2', '105:1:word:5'],
              correctOrderIds: ['105:1:word:1', '105:1:word:2', '105:1:word:3', '105:1:word:4', '105:1:word:5', '105:1:word:6', '105:1:word:7'],
            },
          },
        }],
      },
      {
        id: 'l1-type-recall',
        kind: 'memory_practice',
        title: 'Write from Memory',
        required: false,
        blocks: [{
          id: 'l1-type-ayah-1', type: 'activity', activity: {
            id: 'l1-type-ayah-1', kind: 'type_missing_text', ayahRefs: [{ surahNumber: 105, ayahNumber: 1 }],
            instruction: 'Write Ayah 1 from memory before checking.', required: false, difficulty: 3,
            knowledgeRefs: ['l1-ayah-1'], sourceIds: [QURAN_ARABIC_SOURCE_ID], reviewerStatus: 'approved',
            reviewSchedule: { intervalDays: [1, 3, 7] },
            config: { target: { kind: 'ayah', ayahRef: { surahNumber: 105, ayahNumber: 1 } }, comparisonMode: 'letters_and_order', ignoreHarakat: true },
          },
        }],
      },
      {
        id: 'l1-quiz',
        kind: 'understanding_practice',
        title: 'Understanding Exercise',
        blocks: [
          {
            id: 'l1-match-meaning', type: 'activity', activity: {
              id: 'l1-match-meaning', kind: 'match_word_meaning', ayahRefs: [{ surahNumber: 105, ayahNumber: 1 }],
              instruction: 'Match each selected Quran word to its meaning.', required: true, difficulty: 1,
              knowledgeRefs: ['l1-words-1'], sourceIds: [TRANSLATION_SOURCE_ID], reviewerStatus: 'draft',
              reviewSchedule: { intervalDays: [1, 3, 7] },
              config: { pairs: [
                { promptTokenId: '105:1:word:3', meaningId: '105:1:word:3:meaning' },
                { promptTokenId: '105:1:word:7', meaningId: '105:1:word:7:meaning' },
              ] },
            },
          },
        ],
      },
      {
        id: 'l1-match-translation-practice',
        kind: 'understanding_practice',
        title: 'Extra: Match the Translation',
        required: false,
        blocks: [
          {
            id: 'l1-match-translation', type: 'activity', activity: {
              id: 'l1-match-translation', kind: 'match_ayah_translation', ayahRefs: [{ surahNumber: 105, ayahNumber: 1 }],
              instruction: 'Match each part of Ayah 1 with its translation.', required: false, difficulty: 2,
              knowledgeRefs: ['l1-translation-1'], sourceIds: [QURAN_ARABIC_SOURCE_ID, TRANSLATION_SOURCE_ID], reviewerStatus: 'draft',
              config: {
                ayahSegments: [
                  { id: 'l1-segment-a', tokenIds: ['105:1:word:1', '105:1:word:2', '105:1:word:3', '105:1:word:4'] },
                  { id: 'l1-segment-b', tokenIds: ['105:1:word:5', '105:1:word:6', '105:1:word:7'] },
                ],
                translationSegments: [
                  { id: 'l1-translation-a', text: 'Have you not considered how your Lord dealt', translationEntryId: '105-1-sahih-en' },
                  { id: 'l1-translation-b', text: 'with the companions of the elephant?', translationEntryId: '105-1-sahih-en' },
                ],
                pairs: [
                  { ayahSegmentId: 'l1-segment-a', translationSegmentId: 'l1-translation-a' },
                  { ayahSegmentId: 'l1-segment-b', translationSegmentId: 'l1-translation-b' },
                ],
              },
            },
          },
        ],
      },
      {
        id: 'l1-quiz-practice',
        kind: 'understanding_practice',
        title: 'Extra: Understanding Check',
        required: false,
        blocks: [
          {
            id: 'l1-quiz-1', type: 'activity', activity: {
              id: 'l1-quiz-1', kind: 'multiple_choice', ayahRefs: [{ surahNumber: 105, ayahNumber: 1 }],
              instruction: 'Who were the "companions of the elephant" mentioned in this ayah?', required: false, difficulty: 1,
              knowledgeRefs: ['l1-tafsir-1'], sourceIds: [TAFSIR_SOURCE_ID], reviewerStatus: 'draft',
              config: { options: [
                { id: 'pilgrims', text: 'Pilgrims travelling to the Kaaba with camels and elephants' },
                { id: 'abraha-army', text: "Abraha's army from Yemen that tried to destroy the Kaaba" },
                { id: 'arabian-tribe', text: 'A tribe in Arabia known for keeping elephants' },
                { id: 'makkah-owners', text: 'The people of Makkah who owned elephants' },
              ], correctOptionId: 'abraha-army' },
            },
          },
        ],
      },
      {
        id: 'l1-summary', kind: 'summary', title: 'Summary / Wisdom', blocks: [{
          id: 'l1-summary-1', type: 'summary', title: 'Remember',
          points: ['Ayah 1 invites reflection on how Allah dealt with the companions of the elephant.'],
          sourceIds: [QURAN_ARABIC_SOURCE_ID, TAFSIR_SOURCE_ID], reviewerStatus: 'draft',
        }],
      },
    ],
  },
  {
    id: 'al-fil-level-2-ayah-2',
    pathId: surahAlFilLearningPath.id,
    surahId: surahAlFilRecord.id,
    title: 'Ayah 2',
    description: 'Learn how Allah made the army\'s plan fail.',
    durationMinutes: 6,
    ayahRefs: [{ surahNumber: 105, ayahNumber: 2 }],
    difficulty: 'easy',
    goals: ['memorize', 'understand', 'quiz'],
    discovery: alFilDiscovery,
    completionRules: { requireMemoryActivity: true, requireUnderstandingActivity: true },
    unlockRules: { requiresLevelIds: ['al-fil-level-1-context-ayah-1'] },
    steps: [
      {
        id: 'l2-context', kind: 'context', title: 'Context', required: false,
        blocks: [{ id: 'l2-context-plan', type: 'context', kind: 'tafsir_summary', title: 'The Ruined Plan', text: 'Allah made Abraha\'s careful planning futile. Human power cannot overcome Allah\'s decree.', sourceIds: [TAFSIR_SOURCE_ID], reviewerStatus: 'draft' }],
      },
      {
        id: 'l2-read',
        kind: 'read',
        title: 'Read / Listen',
        blocks: [
          { id: 'l2-ayah-2', type: 'quran_passage', ayahRefs: [{ surahNumber: 105, ayahNumber: 2 }], showTransliteration: true },
          { id: 'l2-audio-2', type: 'audio', ayahRefs: [{ surahNumber: 105, ayahNumber: 2 }], reciterId: HUSARY_RECITER_ID },
        ],
      },
      {
        id: 'l2-translation', kind: 'translation', title: 'Translation',
        blocks: [{ id: 'l2-translation-2', type: 'translation', ayahRefs: [{ surahNumber: 105, ayahNumber: 2 }], locale: 'en', translationEntryIds: ['105-2-sahih-en'] }],
      },
      {
        id: 'l2-retrieval', kind: 'memory_practice', title: 'Continue the Ayah',
        blocks: [{ id: 'l2-continuation-2', type: 'activity', activity: {
          id: 'l2-continuation-2', kind: 'choose_continuation', ayahRefs: [{ surahNumber: 105, ayahNumber: 2 }],
          instruction: 'Choose the words that correctly continue Ayah 2.', required: true, difficulty: 1,
          knowledgeRefs: ['l2-ayah-2'], sourceIds: [QURAN_ARABIC_SOURCE_ID], reviewerStatus: 'draft',
          reviewSchedule: { intervalDays: [1, 3, 7] },
          config: {
            promptTokenIds: ['105:2:word:1', '105:2:word:2'],
            optionIds: ['l2-continuation-correct', 'l2-continuation-reverse', 'l2-continuation-mixed'],
            correctOptionId: 'l2-continuation-correct',
            segments: [
              { id: 'l2-continuation-correct', tokenIds: ['105:2:word:3', '105:2:word:4', '105:2:word:5'] },
              { id: 'l2-continuation-reverse', tokenIds: ['105:2:word:5', '105:2:word:4', '105:2:word:3'] },
              { id: 'l2-continuation-mixed', tokenIds: ['105:2:word:4', '105:2:word:3', '105:2:word:5'] },
            ],
          },
        } }],
      },
      {
        id: 'l2-meaning', kind: 'word_meaning', title: 'Word Meaning',
        blocks: [{ id: 'l2-words-2', type: 'word_meaning', wordMeaningIds: ['105:2:word:2:meaning', '105:2:word:5:meaning'] }],
      },
      {
        id: 'l2-quiz', kind: 'understanding_practice', title: 'Vocabulary Practice',
        blocks: [
          { id: 'l2-match-meaning', type: 'activity', activity: {
            id: 'l2-match-meaning', kind: 'match_word_meaning', ayahRefs: [{ surahNumber: 105, ayahNumber: 2 }],
            instruction: 'Match the selected words from Ayah 2 to their meanings.', required: true, difficulty: 1,
            knowledgeRefs: ['l2-words-2'], sourceIds: [TRANSLATION_SOURCE_ID], reviewerStatus: 'draft',
            reviewSchedule: { intervalDays: [1, 3, 7] },
            config: { pairs: [
              { promptTokenId: '105:2:word:2', meaningId: '105:2:word:2:meaning' },
              { promptTokenId: '105:2:word:5', meaningId: '105:2:word:5:meaning' },
            ] },
          } },
        ],
      },
      {
        id: 'l2-quiz-practice', kind: 'understanding_practice', title: 'Extra: Understanding Check', required: false,
        blocks: [{ id: 'l2-quiz-1', type: 'activity', activity: {
            id: 'l2-quiz-1', kind: 'multiple_choice', ayahRefs: [{ surahNumber: 105, ayahNumber: 2 }],
            instruction: 'What does the key word translated around ruin or misguidance mean in this ayah?', required: false, difficulty: 1,
            knowledgeRefs: ['l2-words-2'], sourceIds: [TRANSLATION_SOURCE_ID, TAFSIR_SOURCE_ID], reviewerStatus: 'draft',
            config: { options: [
              { id: 'success', text: 'Success and victory' }, { id: 'ruin', text: 'Misguidance, ruin, and failure' },
              { id: 'journey', text: 'A long journey' }, { id: 'battle', text: 'A battle in the desert' },
            ], correctOptionId: 'ruin' },
        } }],
      },
      {
        id: 'l2-tafsir', kind: 'tafsir', title: 'Tafsir',
        blocks: [{ id: 'l2-tafsir-2', type: 'tafsir_ref', ayahRef: { surahNumber: 105, ayahNumber: 2 }, tafsirEntryId: '105-2-ibn-kathir-summary' }],
      },
      {
        id: 'l2-recall', kind: 'memory_practice', title: 'Build the Ayah',
        blocks: [{ id: 'l2-recall-2', type: 'activity', activity: {
          id: 'l2-recall-2', kind: 'order_tokens', ayahRefs: [{ surahNumber: 105, ayahNumber: 2 }],
          instruction: 'Build Ayah 2 from the word bank, in Quran order.', required: true, difficulty: 1,
          knowledgeRefs: ['l2-ayah-2'], sourceIds: [QURAN_ARABIC_SOURCE_ID], reviewerStatus: 'approved',
          reviewSchedule: { intervalDays: [1, 3, 7] },
          config: { itemIds: ['105:2:word:3', '105:2:word:1', '105:2:word:5', '105:2:word:2', '105:2:word:4'], correctOrderIds: ['105:2:word:1', '105:2:word:2', '105:2:word:3', '105:2:word:4', '105:2:word:5'] },
        } }],
      },
      {
        id: 'l2-summary', kind: 'summary', title: 'Summary / Wisdom',
        blocks: [{ id: 'l2-summary-1', type: 'summary', title: 'Remember', points: ['Ayah 2 teaches that the army\'s plan was made futile.'], sourceIds: [QURAN_ARABIC_SOURCE_ID, TAFSIR_SOURCE_ID], reviewerStatus: 'draft' }],
      },
    ],
  },
  {
    id: 'al-fil-level-3-ayat-3-4',
    pathId: surahAlFilLearningPath.id,
    surahId: surahAlFilRecord.id,
    title: 'Ayat 3-4',
    description: 'Learn about the birds in flocks and the stones of clay.',
    durationMinutes: 8,
    ayahRefs: [
      { surahNumber: 105, ayahNumber: 3 },
      { surahNumber: 105, ayahNumber: 4 },
    ],
    difficulty: 'medium',
    goals: ['memorize', 'understand', 'quiz'],
    discovery: alFilDiscovery,
    completionRules: { requireMemoryActivity: true, requireUnderstandingActivity: true },
    unlockRules: { requiresLevelIds: ['al-fil-level-2-ayah-2'] },
    steps: [
      {
        id: 'l3-context', kind: 'context', title: 'Context', required: false,
        blocks: [{ id: 'l3-context-birds', type: 'context', kind: 'tafsir_summary', title: 'Birds in Flocks', text: 'The birds came in groups, carrying stones by Allah\'s command.', sourceIds: [TAFSIR_SOURCE_ID], reviewerStatus: 'draft' }],
      },
      {
        id: 'l3-read',
        kind: 'read',
        title: 'Read / Listen',
        blocks: [
          { id: 'l3-passage-3-4', type: 'quran_passage', ayahRefs: [{ surahNumber: 105, ayahNumber: 3 }, { surahNumber: 105, ayahNumber: 4 }], showTransliteration: true },
          { id: 'l3-audio-3-4', type: 'audio', ayahRefs: [{ surahNumber: 105, ayahNumber: 3 }, { surahNumber: 105, ayahNumber: 4 }], reciterId: HUSARY_RECITER_ID },
        ],
      },
      {
        id: 'l3-translation', kind: 'translation', title: 'Translation',
        blocks: [{ id: 'l3-translation-3-4', type: 'translation', ayahRefs: [{ surahNumber: 105, ayahNumber: 3 }, { surahNumber: 105, ayahNumber: 4 }], locale: 'en', translationEntryIds: ['105-3-sahih-en', '105-4-sahih-en'] }],
      },
      {
        id: 'l3-retrieval', kind: 'memory_practice', title: 'Order the Ayat',
        blocks: [{ id: 'l3-order-ayat-3-4', type: 'activity', activity: {
          id: 'l3-order-ayat-3-4', kind: 'order_ayat', ayahRefs: [{ surahNumber: 105, ayahNumber: 3 }, { surahNumber: 105, ayahNumber: 4 }],
          instruction: 'Put Ayat 3 and 4 in their Quran order.', required: true, difficulty: 2,
          knowledgeRefs: ['l3-passage-3-4'], sourceIds: [QURAN_ARABIC_SOURCE_ID], reviewerStatus: 'draft',
          reviewSchedule: { intervalDays: [1, 3, 7] },
          config: { correctOrderRefs: [{ surahNumber: 105, ayahNumber: 3 }, { surahNumber: 105, ayahNumber: 4 }] },
        } }],
      },
      {
        id: 'l3-meaning', kind: 'word_meaning', title: 'Word Meaning',
        blocks: [{ id: 'l3-words-3-4', type: 'word_meaning', wordMeaningIds: ['105:3:word:3:meaning', '105:4:word:2:meaning'] }],
      },
      {
        id: 'l3-quiz', kind: 'understanding_practice', title: 'Vocabulary Practice',
        blocks: [
          { id: 'l3-match-meaning', type: 'activity', activity: {
            id: 'l3-match-meaning', kind: 'match_word_meaning', ayahRefs: [{ surahNumber: 105, ayahNumber: 3 }, { surahNumber: 105, ayahNumber: 4 }],
            instruction: 'Match the selected words from Ayat 3 and 4 to their meanings.', required: true, difficulty: 2,
            knowledgeRefs: ['l3-words-3-4'], sourceIds: [TRANSLATION_SOURCE_ID], reviewerStatus: 'draft',
            reviewSchedule: { intervalDays: [1, 3, 7] },
            config: { pairs: [
              { promptTokenId: '105:3:word:3', meaningId: '105:3:word:3:meaning' },
              { promptTokenId: '105:4:word:2', meaningId: '105:4:word:2:meaning' },
            ] },
          } },
        ],
      },
      {
        id: 'l3-quiz-practice', kind: 'understanding_practice', title: 'Extra: Understanding Check', required: false,
        blocks: [{ id: 'l3-quiz-1', type: 'activity', activity: {
            id: 'l3-quiz-1', kind: 'multiple_choice', ayahRefs: [{ surahNumber: 105, ayahNumber: 3 }],
            instruction: 'What does the key word about the birds describe?', required: false, difficulty: 2,
            knowledgeRefs: ['l3-words-3-4'], sourceIds: [TRANSLATION_SOURCE_ID, TAFSIR_SOURCE_ID], reviewerStatus: 'draft',
            config: { options: [
              { id: 'large', text: 'They were very large birds' }, { id: 'flocks', text: 'They came in flocks, group after group' },
              { id: 'white', text: 'They were white birds only' }, { id: 'prey', text: 'They were birds of prey like eagles' },
            ], correctOptionId: 'flocks' },
        } }],
      },
      {
        id: 'l3-tafsir', kind: 'tafsir', title: 'Tafsir',
        blocks: [
          { id: 'l3-tafsir-3', type: 'tafsir_ref', ayahRef: { surahNumber: 105, ayahNumber: 3 }, tafsirEntryId: '105-3-ibn-kathir-summary' },
          { id: 'l3-tafsir-4', type: 'tafsir_ref', ayahRef: { surahNumber: 105, ayahNumber: 4 }, tafsirEntryId: '105-4-ibn-kathir-summary' },
        ],
      },
      {
        id: 'l3-recall', kind: 'memory_practice', title: 'Build the Ayat',
        blocks: [{ id: 'l3-recall-3-4', type: 'activity', activity: {
          id: 'l3-recall-3-4', kind: 'order_tokens', ayahRefs: [{ surahNumber: 105, ayahNumber: 3 }, { surahNumber: 105, ayahNumber: 4 }],
          instruction: 'Build Ayat 3 and 4 from the word bank, in Quran order.', required: true, difficulty: 2,
          knowledgeRefs: ['l3-passage-3-4'], sourceIds: [QURAN_ARABIC_SOURCE_ID], reviewerStatus: 'approved',
          reviewSchedule: { intervalDays: [1, 3, 7] },
          config: { itemIds: ['105:3:word:3', '105:4:word:2', '105:3:word:1', '105:4:word:4', '105:3:word:4', '105:4:word:1', '105:3:word:2', '105:4:word:3'], correctOrderIds: ['105:3:word:1', '105:3:word:2', '105:3:word:3', '105:3:word:4', '105:4:word:1', '105:4:word:2', '105:4:word:3', '105:4:word:4'] },
        } }],
      },
      {
        id: 'l3-summary', kind: 'summary', title: 'Summary / Wisdom',
        blocks: [{ id: 'l3-summary-1', type: 'summary', title: 'Remember', points: ['Ayat 3 and 4 describe birds in flocks carrying stones of clay.'], sourceIds: [QURAN_ARABIC_SOURCE_ID, TAFSIR_SOURCE_ID], reviewerStatus: 'draft' }],
      },
    ],
  },
  {
    id: 'al-fil-level-4-ayah-5-review',
    pathId: surahAlFilLearningPath.id,
    surahId: surahAlFilRecord.id,
    title: 'Ayah 5 + Review',
    description: 'Complete the Surah and review its main lesson.',
    durationMinutes: 8,
    ayahRefs: [1, 2, 3, 4, 5].map(ayahNumber => ({ surahNumber: 105, ayahNumber })),
    difficulty: 'medium',
    goals: ['memorize', 'understand', 'reflect', 'quiz'],
    discovery: alFilDiscovery,
    completionRules: { requireMemoryActivity: true, requireUnderstandingActivity: true },
    unlockRules: { requiresLevelIds: ['al-fil-level-3-ayat-3-4'] },
    metadata: { isFinalReview: true },
    steps: [
      {
        id: 'l4-context',
        kind: 'context',
        title: 'Context',
        required: false,
        blocks: [{
          id: 'l4-context-review', type: 'context', kind: 'occasion_of_revelation', title: 'Makkan Reminder',
          text: 'Surah Al-Fil was revealed in Makkah and reminded Quraysh that Allah protected His House by His power.',
          sourceIds: [TAFSIR_SOURCE_ID], reviewerStatus: 'draft',
        }],
      },
      {
        id: 'l4-read',
        kind: 'read',
        title: 'Read / Listen',
        blocks: [
          { id: 'l4-ayah-5', type: 'quran_passage', ayahRefs: [1, 2, 3, 4, 5].map(ayahNumber => ({ surahNumber: 105, ayahNumber })), showTransliteration: true },
          { id: 'l4-audio-review', type: 'audio', ayahRefs: [1, 2, 3, 4, 5].map(ayahNumber => ({ surahNumber: 105, ayahNumber })), reciterId: HUSARY_RECITER_ID },
        ],
      },
      {
        id: 'l4-translation', kind: 'translation', title: 'Translation',
        blocks: [{ id: 'l4-translation-5', type: 'translation', ayahRefs: [{ surahNumber: 105, ayahNumber: 5 }], locale: 'en', translationEntryIds: ['105-5-sahih-en'] }],
      },
      {
        id: 'l4-retrieval', kind: 'memory_practice', title: 'Extra: Continue the Ayah', required: false,
        blocks: [{ id: 'l4-continuation-5', type: 'activity', activity: {
          id: 'l4-continuation-5', kind: 'choose_continuation', ayahRefs: [{ surahNumber: 105, ayahNumber: 5 }],
          instruction: 'Choose the words that correctly complete Ayah 5.', required: true, difficulty: 2,
          knowledgeRefs: ['l4-ayah-5'], sourceIds: [QURAN_ARABIC_SOURCE_ID], reviewerStatus: 'draft',
          reviewSchedule: { intervalDays: [1, 3, 7] },
          config: {
            promptTokenIds: ['105:5:word:1'],
            optionIds: ['l4-continuation-correct', 'l4-continuation-reverse'],
            correctOptionId: 'l4-continuation-correct',
            segments: [
              { id: 'l4-continuation-correct', tokenIds: ['105:5:word:2', '105:5:word:3'] },
              { id: 'l4-continuation-reverse', tokenIds: ['105:5:word:3', '105:5:word:2'] },
            ],
          },
        } }],
      },
      {
        id: 'l4-word-meaning', kind: 'word_meaning', title: 'Word Meaning',
        blocks: [{ id: 'l4-words-5', type: 'word_meaning', wordMeaningIds: ['105:5:word:2:meaning', '105:5:word:3:meaning'] }],
      },
      {
        id: 'l4-vocabulary', kind: 'understanding_practice', title: 'Vocabulary Practice',
        blocks: [{ id: 'l4-match-meaning', type: 'activity', activity: {
          id: 'l4-match-meaning', kind: 'match_word_meaning', ayahRefs: [{ surahNumber: 105, ayahNumber: 5 }],
          instruction: 'Match the selected words from Ayah 5 to their meanings.', required: true, difficulty: 2,
          knowledgeRefs: ['l4-words-5'], sourceIds: [TRANSLATION_SOURCE_ID], reviewerStatus: 'draft',
          reviewSchedule: { intervalDays: [1, 3, 7] },
          config: { pairs: [
            { promptTokenId: '105:5:word:2', meaningId: '105:5:word:2:meaning' },
            { promptTokenId: '105:5:word:3', meaningId: '105:5:word:3:meaning' },
          ] },
        } }],
      },
      {
        id: 'l4-tafsir', kind: 'tafsir', title: 'Tafsir',
        blocks: [{ id: 'l4-tafsir-5', type: 'tafsir_ref', ayahRef: { surahNumber: 105, ayahNumber: 5 }, tafsirEntryId: '105-5-ibn-kathir-summary' }],
      },
      {
        id: 'l4-understanding', kind: 'understanding_practice', title: 'Understanding Practice', required: false,
        blocks: [{ id: 'l4-quiz-1', type: 'activity', activity: {
          id: 'l4-quiz-1', kind: 'multiple_choice', ayahRefs: [{ surahNumber: 105, ayahNumber: 5 }],
          instruction: 'What is the main lesson of Surah Al-Fil?', required: false, difficulty: 2,
          knowledgeRefs: ['l4-tafsir-5'], sourceIds: [TAFSIR_SOURCE_ID], reviewerStatus: 'draft',
          config: { options: [
            { id: 'elephants', text: 'Elephants are powerful animals' }, { id: 'allah-will', text: 'No plan or army can overcome the will of Allah' },
            { id: 'makkah', text: 'The Arabs of Makkah were the strongest people' }, { id: 'birds', text: 'Birds are sacred in Islam' },
          ], correctOptionId: 'allah-will' },
        } }],
      },
      {
        id: 'l4-memory', kind: 'memory_practice', title: 'Build the Ayah',
        blocks: [{ id: 'l4-recall-5', type: 'activity', activity: {
          id: 'l4-recall-5', kind: 'order_tokens', ayahRefs: [{ surahNumber: 105, ayahNumber: 5 }],
          instruction: 'Build Ayah 5 from the word bank, in Quran order.', required: true, difficulty: 2,
          knowledgeRefs: ['l4-ayah-5'], sourceIds: [QURAN_ARABIC_SOURCE_ID], reviewerStatus: 'approved',
          reviewSchedule: { intervalDays: [1, 3, 7] },
          config: { itemIds: ['105:5:word:2', '105:5:word:3', '105:5:word:1'], correctOrderIds: ['105:5:word:1', '105:5:word:2', '105:5:word:3'] },
        } }],
      },
      {
        id: 'l4-order-review', kind: 'memory_practice', title: 'Full Surah Review',
        blocks: [{ id: 'l4-order-ayat-1-5', type: 'activity', activity: {
          id: 'l4-order-ayat-1-5', kind: 'order_ayat', ayahRefs: [1, 2, 3, 4, 5].map(ayahNumber => ({ surahNumber: 105, ayahNumber })),
          instruction: 'Put all five ayat of Surah Al-Fil in Quran order.', required: true, difficulty: 3,
          knowledgeRefs: ['l4-ayah-5'], sourceIds: [QURAN_ARABIC_SOURCE_ID], reviewerStatus: 'draft',
          reviewSchedule: { intervalDays: [1, 3, 7] },
          config: { correctOrderRefs: [1, 2, 3, 4, 5].map(ayahNumber => ({ surahNumber: 105, ayahNumber })) },
        } }],
      },
      {
        id: 'l4-review', kind: 'summary', title: 'Summary / Wisdom',
        blocks: [{
          id: 'l4-summary', type: 'summary', title: 'What You Learned',
          points: ['Surah Al-Fil is Quran 105 with 5 ayat', 'Abraha\'s army intended to destroy the Kaaba', 'Allah sent birds in flocks carrying stones of hardened clay', 'The army was left like eaten straw', 'No plan can overcome Allah\'s decree'],
          sourceIds: [QURAN_ARABIC_SOURCE_ID, TRANSLATION_SOURCE_ID, TAFSIR_SOURCE_ID], reviewerStatus: 'draft',
        }],
      },
    ],
  },
];

const surahAlFilPackage: ContentPackage = {
  id: 'surah-al-fil-v1',
  version: '2.10',
  schemaVersion: 2,
  revisionId: 'surah-al-fil-v1-r12',
  title: surahAlFilLearningPath.title,
  description: surahAlFilLearningPath.description,
  type: 'surah',
  editions: [hafsAnAsimEdition],
  surahs: structureSurahs.map(surah => surah.surahNumber === 105 ? surahAlFilRecord : surah),
  ayat: surahAlFilAyat,
  wordTokens: surahAlFilWordTokens,
  divisions: fullStructure.divisions,
  structureIndex: fullStructure.structureIndex,
  themes,
  reciters: [husaryReciter],
  recitationTracks: husaryTracks,
  localization,
  mediaAssets: [],
  learningPaths: [surahAlFilLearningPath],
  levels: surahAlFilLevels,
  sources,
  governance: {
    evidence: [],
    approvals: [],
    licenseGrants: [],
  },
  metadata: {
    totalLevels: surahAlFilLevels.length,
    totalDuration: surahAlFilLevels.reduce((total, level) => total + level.durationMinutes, 0),
    language: 'en',
    targetAudience: 'family',
    defaultLearningPathId: surahAlFilLearningPath.id,
  },
};

export default surahAlFilPackage;
