// Surah Al-Fil Content Package - Version 1
// Canonical Quran content is separate from curriculum levels.
// Tafsir/context summaries remain draft until scholar review.

import {
  AyahRecord,
  ContentPackage,
  ContentSource,
  LearningPath,
  Level,
  SurahRecord,
} from '../../../types/content';

const QURAN_ARABIC_SOURCE_ID = 'quran-arabic-madani';
const TRANSLATION_SOURCE_ID = 'quran-translation-sahih-international';
const TAFSIR_SOURCE_ID = 'tafsir-ibn-kathir-summarised';

const quranArabicSource: ContentSource = {
  id: QURAN_ARABIC_SOURCE_ID,
  name: 'Quran Arabic - Madani Mushaf',
  author: 'King Fahd Quran Printing Complex',
  publisher: 'King Fahd Quran Printing Complex',
  version: '1.0',
  language: 'ar',
  reviewerStatus: 'approved',
  reviewDate: '2024-01-01',
  license: 'Public Domain',
};

const quranTranslationSource: ContentSource = {
  id: TRANSLATION_SOURCE_ID,
  name: 'Quran Translation - Sahih International',
  author: 'Saheeh International',
  publisher: 'Saheeh International',
  version: '1.0',
  language: 'en',
  reviewerStatus: 'approved',
  reviewDate: '2024-01-01',
  license: 'Public Domain',
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
  license: 'Educational use',
};

const sources = [quranArabicSource, quranTranslationSource, tafsirSource];

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

const word = (arabic: string, transliteration: string, meaning: string, root?: string) => ({
  arabic,
  transliteration,
  meaning,
  root,
  sourceId: TRANSLATION_SOURCE_ID,
  reviewerStatus: 'approved' as const,
});

export const surahAlFilAyat: AyahRecord[] = [
  {
    id: '105:1',
    ref: { surahNumber: 105, ayahNumber: 1 },
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
      word('أَلَمْ', 'Alam', 'Have not / Did not'),
      word('تَرَ', 'tara', 'you see / consider'),
      word('كَيْفَ', 'kayfa', 'how'),
      word('فَعَلَ', "fa'ala", 'He dealt / did'),
      word('رَبُّكَ', 'Rabbuka', 'your Lord'),
      word('بِأَصْحَابِ', "bi-as'habi", 'with the companions of'),
      word('ٱلْفِيلِ', 'al-feel', 'the elephant'),
    ],
  },
  {
    id: '105:2',
    ref: { surahNumber: 105, ayahNumber: 2 },
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
      word('أَلَمْ', 'Alam', 'Did He not'),
      word('يَجْعَلْ', "yaj'al", 'make / render'),
      word('كَيْدَهُمْ', 'kaydahum', 'their plan / scheme'),
      word('فِى', 'fee', 'into / in'),
      word('تَضْلِيلٍ', 'tadleel', 'misguidance / ruin / failure'),
    ],
  },
  {
    id: '105:3',
    ref: { surahNumber: 105, ayahNumber: 3 },
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
      word('وَأَرْسَلَ', 'Wa-arsala', 'And He sent'),
      word('عَلَيْهِمْ', 'alayhim', 'against them / upon them'),
      word('طَيْرًا', 'tayran', 'birds'),
      word('أَبَابِيلَ', 'ababeel', 'in flocks / in groups'),
    ],
  },
  {
    id: '105:4',
    ref: { surahNumber: 105, ayahNumber: 4 },
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
      word('تَرْمِيهِم', 'Tarmeehim', 'striking them / pelting them'),
      word('بِحِجَارَةٍ', 'bihijaaratin', 'with stones'),
      word('مِّن', 'min', 'of / from'),
      word('سِجِّيلٍ', 'sijjeel', 'hard baked clay', 'س-ج-ل'),
    ],
  },
  {
    id: '105:5',
    ref: { surahNumber: 105, ayahNumber: 5 },
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
      word('فَجَعَلَهُمْ', "Faja'alahum", 'And He made them'),
      word('كَعَصْفٍ', "ka'asfin", 'like straw / chaff'),
      word('مَّأْكُولٍ', "ma'kool", 'eaten / devoured'),
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
    steps: [
      {
        id: 'l1-context',
        title: 'Context',
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
        title: 'Read',
        blocks: [{ id: 'l1-ayah-1', type: 'ayah_ref', ayahRef: { surahNumber: 105, ayahNumber: 1 } }],
      },
      {
        id: 'l1-meaning',
        title: 'Meaning',
        blocks: [
          { id: 'l1-words-1', type: 'word_explorer', ayahRefs: [{ surahNumber: 105, ayahNumber: 1 }] },
          {
            id: 'l1-tafsir-1',
            type: 'tafsir_ref',
            ayahRef: { surahNumber: 105, ayahNumber: 1 },
            tafsirEntryId: '105-1-ibn-kathir-summary',
          },
        ],
      },
      {
        id: 'l1-quiz',
        title: 'Quiz',
        blocks: [
          {
            id: 'l1-quiz-1',
            type: 'question',
            question: 'Who were the "companions of the elephant" mentioned in this ayah?',
            questionType: 'multiple-choice',
            options: [
              'Pilgrims travelling to the Kaaba with camels and elephants',
              "Abraha's army from Yemen that tried to destroy the Kaaba",
              'A tribe in Arabia known for keeping elephants',
              'The people of Makkah who owned elephants',
            ],
            correctAnswer: 1,
            explanation:
              'The phrase refers to Abraha\'s army from Yemen, which marched with war elephants intending to destroy the Kaaba.',
            sourceIds: [TAFSIR_SOURCE_ID],
            reviewerStatus: 'draft',
          },
        ],
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
    unlockRules: { requiresLevelIds: ['al-fil-level-1-context-ayah-1'] },
    steps: [
      {
        id: 'l2-read',
        title: 'Read',
        blocks: [{ id: 'l2-ayah-2', type: 'ayah_ref', ayahRef: { surahNumber: 105, ayahNumber: 2 } }],
      },
      {
        id: 'l2-meaning',
        title: 'Meaning',
        blocks: [
          { id: 'l2-words-2', type: 'word_explorer', ayahRefs: [{ surahNumber: 105, ayahNumber: 2 }] },
          {
            id: 'l2-context-plan',
            type: 'context',
            kind: 'tafsir_summary',
            title: 'The Ruined Plan',
            text: 'Allah made Abraha\'s careful planning futile. Human power cannot overcome Allah\'s decree.',
            sourceIds: [TAFSIR_SOURCE_ID],
            reviewerStatus: 'draft',
          },
        ],
      },
      {
        id: 'l2-quiz',
        title: 'Quiz',
        blocks: [
          {
            id: 'l2-quiz-1',
            type: 'question',
            question: 'What does the key word translated around ruin or misguidance mean in this ayah?',
            questionType: 'multiple-choice',
            options: ['Success and victory', 'Misguidance, ruin, and failure', 'A long journey', 'A battle in the desert'],
            correctAnswer: 1,
            explanation: '"Tadleel" means misguidance or ruin. Allah made their plan completely fail.',
            sourceIds: [TRANSLATION_SOURCE_ID, TAFSIR_SOURCE_ID],
            reviewerStatus: 'draft',
          },
        ],
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
    unlockRules: { requiresLevelIds: ['al-fil-level-2-ayah-2'] },
    steps: [
      {
        id: 'l3-read',
        title: 'Read',
        blocks: [
          { id: 'l3-ayah-3', type: 'ayah_ref', ayahRef: { surahNumber: 105, ayahNumber: 3 } },
          { id: 'l3-ayah-4', type: 'ayah_ref', ayahRef: { surahNumber: 105, ayahNumber: 4 } },
        ],
      },
      {
        id: 'l3-meaning',
        title: 'Meaning',
        blocks: [
          {
            id: 'l3-context-birds',
            type: 'context',
            kind: 'tafsir_summary',
            title: 'Birds in Flocks',
            text: 'The birds came in groups, carrying stones by Allah\'s command.',
            sourceIds: [TAFSIR_SOURCE_ID],
            reviewerStatus: 'draft',
          },
          {
            id: 'l3-words-3-4',
            type: 'word_explorer',
            ayahRefs: [
              { surahNumber: 105, ayahNumber: 3 },
              { surahNumber: 105, ayahNumber: 4 },
            ],
          },
        ],
      },
      {
        id: 'l3-quiz',
        title: 'Quiz',
        blocks: [
          {
            id: 'l3-quiz-1',
            type: 'question',
            question: 'What does the key word about the birds describe?',
            questionType: 'multiple-choice',
            options: ['They were very large birds', 'They came in flocks, group after group', 'They were white birds only', 'They were birds of prey like eagles'],
            correctAnswer: 1,
            explanation: '"Ababeel" describes birds coming in flocks or successive groups.',
            sourceIds: [TRANSLATION_SOURCE_ID, TAFSIR_SOURCE_ID],
            reviewerStatus: 'draft',
          },
        ],
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
    ayahRefs: [{ surahNumber: 105, ayahNumber: 5 }],
    difficulty: 'medium',
    goals: ['memorize', 'understand', 'reflect', 'quiz'],
    unlockRules: { requiresLevelIds: ['al-fil-level-3-ayat-3-4'] },
    metadata: { isFinalReview: true },
    steps: [
      {
        id: 'l4-read',
        title: 'Read',
        blocks: [{ id: 'l4-ayah-5', type: 'ayah_ref', ayahRef: { surahNumber: 105, ayahNumber: 5 } }],
      },
      {
        id: 'l4-context',
        title: 'Context',
        blocks: [
          {
            id: 'l4-context-review',
            type: 'context',
            kind: 'occasion_of_revelation',
            title: 'Makkan Reminder',
            text:
              'Surah Al-Fil was revealed in Makkah and reminded Quraysh that Allah protected His House by His power.',
            sourceIds: [TAFSIR_SOURCE_ID],
            reviewerStatus: 'draft',
          },
        ],
      },
      {
        id: 'l4-review',
        title: 'Review',
        blocks: [
          {
            id: 'l4-summary',
            type: 'summary',
            title: 'What You Learned',
            points: [
              'Surah Al-Fil is Quran 105 with 5 ayat',
              'Abraha\'s army intended to destroy the Kaaba',
              'Allah sent birds in flocks carrying stones of hardened clay',
              'The army was left like eaten straw',
              'No plan can overcome Allah\'s decree',
            ],
            sourceIds: [QURAN_ARABIC_SOURCE_ID, TRANSLATION_SOURCE_ID, TAFSIR_SOURCE_ID],
            reviewerStatus: 'draft',
          },
          {
            id: 'l4-quiz-1',
            type: 'question',
            question: 'What is the main lesson of Surah Al-Fil?',
            questionType: 'multiple-choice',
            options: [
              'Elephants are powerful animals',
              'No plan or army can overcome the will of Allah',
              'The Arabs of Makkah were the strongest people',
              'Birds are sacred in Islam',
            ],
            correctAnswer: 1,
            explanation: 'The Surah shows that no human plan can overcome Allah\'s will.',
            sourceIds: [TAFSIR_SOURCE_ID],
            reviewerStatus: 'draft',
          },
        ],
      },
    ],
  },
];

const surahAlFilPackage: ContentPackage = {
  id: 'surah-al-fil-v1',
  version: '1.0',
  title: surahAlFilLearningPath.title,
  description: surahAlFilLearningPath.description,
  type: 'surah',
  surahs: [surahAlFilRecord],
  ayat: surahAlFilAyat,
  learningPaths: [surahAlFilLearningPath],
  levels: surahAlFilLevels,
  sources,
  assets: { images: [], audio: [] },
  metadata: {
    totalLevels: surahAlFilLevels.length,
    totalDuration: surahAlFilLevels.reduce((total, level) => total + level.durationMinutes, 0),
    language: 'en',
    targetAudience: 'family',
  },
};

export default surahAlFilPackage;
