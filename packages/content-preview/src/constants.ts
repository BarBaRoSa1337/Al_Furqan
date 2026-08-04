export const PREVIEW_PACKAGE_ID = 'surah-al-fil-v1';
export const PREVIEW_PACKAGE_VERSION = '5.0.0-preview';
export const PREVIEW_REVISION_ID = 'surahs-105-114-local-preview-v1';
export const PREVIEW_GENERATOR_VERSION = '1.0.0';
export const PREVIEW_SURAH_NUMBERS = [105, 106, 107, 108, 109, 110, 111, 112, 113, 114] as const;

export const EXPECTED_AYAH_COUNTS: Record<number, number> = {
  105: 5,
  106: 4,
  107: 7,
  108: 3,
  109: 6,
  110: 3,
  111: 5,
  112: 4,
  113: 5,
  114: 6,
};

export const TANZIL_SOURCE_URL = 'https://tanzil.net/download/';
export const TANZIL_LICENSE_URL = 'https://tanzil.net/docs/Text_License';
export const QURANENC_REGISTRY_URLS = {
  en: 'https://quranenc.com/api/v1/translations/list/en?localization=en',
  fr: 'https://quranenc.com/api/v1/translations/list/fr?localization=en',
} as const;
export const QURANENC_SURAH_URLS = {
  en: (surah: number) => `https://quranenc.com/api/v1/translation/sura/english_rwwad/${surah}`,
  fr: (surah: number) => `https://quranenc.com/api/v1/translation/sura/french_rashid/${surah}`,
} as const;

export const QURANENC_RESOURCES = {
  en: { key: 'english_rwwad', locale: 'en' as const, author: 'Rowwad Translation Center' },
  fr: { key: 'french_rashid', locale: 'fr' as const, author: 'Rachid Maach' },
} as const;
