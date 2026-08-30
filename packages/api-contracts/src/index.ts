export const SUPPORTED_LOCALES = ['ar', 'en', 'fr'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];
export type ContentMode = 'preview' | 'production';
export type TextDirection = 'ltr' | 'rtl';

export interface LearnerPreferences {
  interfaceLocale: SupportedLocale;
  lessonLocale: SupportedLocale;
  contentLocale: SupportedLocale;
  secondaryLocale?: SupportedLocale;
  translationResourceId: string;
  quranScript: 'uthmani-hafs';
  transliterationPreference: 'show' | 'hide';
  autoplayRecitation: boolean;
  reciterId: string;
}

export const DEFAULT_LEARNER_PREFERENCES: LearnerPreferences = {
  interfaceLocale: 'en',
  lessonLocale: 'en',
  contentLocale: 'en',
  translationResourceId: 'quranenc-english-rowwad',
  quranScript: 'uthmani-hafs',
  transliterationPreference: 'show',
  autoplayRecitation: true,
  reciterId: 'mahmoud-khalil-al-husary',
};

export interface LocalePublication {
  locale: SupportedLocale;
  status: 'unavailable' | 'draft' | 'published';
  version: string;
  contentHash?: string;
  availableAlternatives: SupportedLocale[];
  languageApprovalId?: string;
  islamicApprovalId?: string;
}

export interface SourceAttribution {
  provider: 'quran-foundation' | 'quranenc' | 'mp3quran' | 'furqan';
  sourceId: string;
  resourceId: string;
  version: string;
  publisher: string;
  attributionText: string;
  fetchedAt?: string;
  expiresAt?: string;
}

export interface LessonAvailabilityResponse {
  lessonId: string;
  publications: LocalePublication[];
}

export interface RuntimePackageResponse {
  packageId: string;
  locale: SupportedLocale;
  contentMode: ContentMode;
  package: unknown;
  attributions: SourceAttribution[];
}

export interface ApiErrorResponse {
  error: {
    code: 'bad_request' | 'not_found' | 'not_available' | 'rate_limited' | 'upstream_unavailable' | 'internal_error';
    message: string;
    retryable: boolean;
  };
}

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === 'string' && SUPPORTED_LOCALES.includes(value as SupportedLocale);
}

export function directionForLocale(locale: string): TextDirection {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

export function isRuntimePackageResponse(value: unknown): value is RuntimePackageResponse {
  if (!isRecord(value)) return false;
  return typeof value.packageId === 'string'
    && isSupportedLocale(value.locale)
    && (value.contentMode === 'preview' || value.contentMode === 'production')
    && isRecord(value.package)
    && Array.isArray(value.attributions);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
