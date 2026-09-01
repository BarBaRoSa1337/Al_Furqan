export type QuranProviderLocale = 'ar' | 'en' | 'fr';

export interface QuranProviderResult<T> {
  data: T;
  fetchedAt: string;
  expiresAt?: string;
  provider: 'quran-foundation';
  sourceVersion: 'content-api-v4' | 'search-api-v1';
  cacheStatus: 'hit' | 'miss' | 'no-store';
}

export interface QuranProviderSearchEntry {
  resultType: string;
  key: number | string;
  name: string;
  arabic?: string;
  isArabic?: boolean;
  isTransliteration?: boolean;
}

export interface QuranProviderSearchResponse {
  result?: {
    navigation: QuranProviderSearchEntry[];
    verses: QuranProviderSearchEntry[];
  };
}

export interface QuranProviderResourceConfig {
  translationId: number;
  tafsirId?: number;
  chapterInfoId?: number;
  recitationId?: number;
}

export interface QuranProviderChapter {
  id: number;
  versesCount: number;
  revelationOrder?: number;
  revelationPlace?: string;
  nameArabic: string;
  nameSimple?: string;
  translatedName?: { name?: string; languageName?: string };
}

export interface QuranProviderTranslation {
  id?: number;
  text: string;
  resourceId: number;
  resourceName?: string;
  languageName?: string;
  verseKey?: string;
  footNotes?: Record<string, string>;
}

export interface QuranProviderTafsir {
  id?: number;
  resourceId?: number;
  resourceName?: string;
  languageName?: string;
  text?: string;
}

export interface QuranProviderWord {
  id?: number;
  position: number;
  charTypeName?: string;
  textUthmani?: string;
  location?: string;
  translation?: { text?: string; languageName?: string };
  transliteration?: { text?: string; languageName?: string };
}

export interface QuranProviderVerse {
  id: number;
  verseNumber: number;
  verseKey: string;
  chapterId?: number | string;
  textUthmani?: string;
  juzNumber?: number;
  hizbNumber?: number;
  rubElHizbNumber?: number;
  pageNumber?: number;
  words?: QuranProviderWord[];
  translations?: QuranProviderTranslation[];
  tafsirs?: QuranProviderTafsir[];
}

export interface QuranProviderChapterInfo {
  id: number;
  chapterId: number;
  text: string;
  shortText: string;
  source: string;
  languageName?: string;
  resourceId?: number;
}

export interface QuranProviderRecitation {
  verseKey: string;
  audioUrl: string;
  segments?: [number, number, number, number][];
  format?: string;
}

export interface QuranProviderResource {
  id?: number;
  name?: string;
  authorName?: string;
  reciterName?: string;
  languageName?: string;
  style?: string;
  slug?: string;
}

export interface QuranProviderResourceCatalog {
  translations: QuranProviderResource[];
  tafsirs: QuranProviderResource[];
  chapterInfos: QuranProviderResource[];
  recitations: QuranProviderResource[];
}

export interface QuranContentProvider {
  searchQuran(query: string, locale: QuranProviderLocale): Promise<QuranProviderResult<QuranProviderSearchResponse>>;
  listChapters(locale: QuranProviderLocale): Promise<QuranProviderResult<QuranProviderChapter[]>>;
  getVerse(chapter: number, ayah: number, locale: QuranProviderLocale): Promise<QuranProviderResult<QuranProviderVerse>>;
  getChapterVerses(
    chapter: number,
    locale: QuranProviderLocale,
    resources?: Partial<QuranProviderResourceConfig>,
  ): Promise<QuranProviderResult<QuranProviderVerse[]>>;
  getChapterInfo(
    chapter: number,
    locale: QuranProviderLocale,
    resourceId: number,
  ): Promise<QuranProviderResult<QuranProviderChapterInfo | undefined>>;
  getChapterRecitation(
    chapter: number,
    recitationId: number,
  ): Promise<QuranProviderResult<QuranProviderRecitation[]>>;
  getTafsir(
    chapter: number,
    ayah: number,
    tafsirId: number,
  ): Promise<QuranProviderResult<QuranProviderTafsir | undefined>>;
  listResources(locale: QuranProviderLocale): Promise<QuranProviderResult<QuranProviderResourceCatalog>>;
}
