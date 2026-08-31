export const PREVIEW_PACKAGE_ID = 'surah-al-fil-v1';
export const PREVIEW_PACKAGE_VERSION = '6.0.0-preview';
export const PREVIEW_REVISION_ID = 'surahs-93-114-local-preview-v2';
export const PREVIEW_GENERATOR_VERSION = '2.0.0';
export const PREVIEW_SURAH_NUMBERS = [93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114] as const;

export const EXPECTED_AYAH_COUNTS: Record<number, number> = {
  93: 11,
  94: 8,
  95: 8,
  96: 19,
  97: 5,
  98: 8,
  99: 8,
  100: 11,
  101: 11,
  102: 8,
  103: 3,
  104: 9,
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
export const TANZIL_LICENSE_RAW_URL = 'https://tanzil.net/docs/_export/raw/text_license';
export const TANZIL_TEXT_VERSION = '1.1';
export const TANZIL_TEXT_TYPE = 'Uthmani';
export const TANZIL_ATTRIBUTION = 'Tanzil Quran Text. Copyright (C) 2007-2021 Tanzil Project. License: Creative Commons Attribution 3.0.';
export const TANZIL_DOWNLOAD_OPTIONS = {
  quranType: 'uthmani',
  outType: 'txt-2',
  marks: 'true',
  sajdah: 'true',
  tatweel: 'true',
  agree: 'true',
} as const;
export const TANZIL_DOWNLOAD_URL = `https://tanzil.net/pub/download/index.php?${new URLSearchParams(TANZIL_DOWNLOAD_OPTIONS).toString()}`;
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

export const MP3QURAN_SOURCE_ID = 'mp3quran-husary-hafs-118';
export const MP3QURAN_RECITER_ID = 'mahmoud-khalil-al-husary';
/**
 * Published reference for MP3Quran usage terms. Replace with the URL of
 * verified written permission once obtained from MP3Quran.
 */
export const MP3QURAN_PERMISSION_URL = 'https://www.mp3quran.net/en/page/about';

/**
 * Permission verification status. Set to 'verified' only after formal
 * written permission has been obtained and stored as evidence.
 */
export const MP3QURAN_PERMISSION_STATUS: 'pending' | 'verified' = 'pending';

export const TAFSIR_MUYASSAR_ID = 16;
export const TAFSIR_MUYASSAR_SOURCE_ID = 'quran-foundation-tafsir-muyassar';
