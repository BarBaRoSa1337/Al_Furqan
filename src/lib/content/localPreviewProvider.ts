import type { SupportedLocale } from '../../../packages/api-contracts/src';
import type { ContentPackage } from '../../types/content';
import { getPackagePayloadHash } from './governance';
import { validatePackage } from './packageValidator';
import { getContentRepository } from './repository';
import {
  bundledLocalPreviewArtifacts,
  type LocalPreviewArtifact,
} from '../../content/local-preview/registry';

const LOCAL_PREVIEW_PACKAGE_ID = 'surah-al-fil-v1';
const LOCAL_PREVIEW_SURAH_NUMBERS = Array.from({ length: 22 }, (_, index) => index + 93);
let cachedMultilingualPackage: ContentPackage | undefined;

export function loadBundledLocalPreviewPackage(
  packageId: string,
  _locale: SupportedLocale,
): void {
  const shouldTime = __DEV__ && process.env.NODE_ENV !== 'test';
  const startedAt = shouldTime ? performance.now() : 0;
  const pkg = cachedMultilingualPackage?.id === packageId
    ? cachedMultilingualPackage
    : buildMultilingualPreviewPackage(packageId);
  cachedMultilingualPackage = pkg;
  getContentRepository().registerPackage(pkg, true, 'built_in');
  if (shouldTime) console.info(`[content:timing] local preview activation ${(performance.now() - startedAt).toFixed(1)}ms`);
}

/** Returns false only when no generated artifact has been bundled. */
export function tryLoadBundledLocalPreviewPackage(
  packageId: string,
  locale: SupportedLocale,
): boolean {
  if (!bundledLocalPreviewArtifacts[locale]) return false;
  loadBundledLocalPreviewPackage(packageId, locale);
  return true;
}

function buildMultilingualPreviewPackage(packageId: string): ContentPackage {
  const packages = (['en', 'fr', 'ar'] as const).map(locale => {
    const artifact = bundledLocalPreviewArtifacts[locale];
    if (!artifact) throw new Error(`Local preview ${locale} artifact is missing.`);
    return inspectLocalPreviewArtifact(artifact, {
      expectedPackageId: packageId,
      expectedSurahNumbers: LOCAL_PREVIEW_SURAH_NUMBERS,
      expectedLocale: locale,
    }, false);
  });
  const [base, ...localized] = packages;
  const sources = uniqueById(packages.flatMap(pkg => pkg.sources));
  const ayat = base.ayat.map(ayah => {
    const variants = localized.map(pkg => pkg.ayat.find(candidate => candidate.id === ayah.id)).filter(Boolean);
    return {
      ...ayah,
      translations: uniqueById([ayah, ...variants].flatMap(candidate => candidate?.translations ?? [])),
      tafsirEntries: uniqueById([ayah, ...variants].flatMap(candidate => candidate?.tafsirEntries ?? [])),
      wordMeanings: uniqueById([ayah, ...variants].flatMap(candidate => candidate?.wordMeanings ?? [])),
    };
  });
  return {
    ...base,
    revisionId: `${base.revisionId}-multilingual`,
    previousRevisionIds: uniqueStrings([
      ...(base.previousRevisionIds ?? []),
      ...packages.map(pkg => pkg.revisionId),
    ]),
    sources,
    ayat,
    localization: {
      defaultLocale: 'en',
      catalogs: uniqueByLocale(packages.flatMap(pkg => pkg.localization.catalogs)),
    },
    metadata: { ...base.metadata, language: 'en' },
  };
}

function uniqueById<T extends { id: string }>(items: readonly T[]): T[] {
  return [...new Map(items.map(item => [item.id, item])).values()];
}

function uniqueByLocale<T extends { locale: string }>(items: readonly T[]): T[] {
  return [...new Map(items.map(item => [item.locale, item])).values()];
}

function uniqueStrings(items: readonly string[]): string[] {
  return [...new Set(items)];
}

export function validateLocalPreviewArtifact(
  artifact: LocalPreviewArtifact,
  options: {
    expectedPackageId?: string;
    expectedSurahNumbers?: readonly number[];
    expectedLocale?: SupportedLocale;
  } = {},
): ContentPackage {
  return inspectLocalPreviewArtifact(artifact, options, true);
}

function inspectLocalPreviewArtifact(
  artifact: LocalPreviewArtifact,
  options: {
    expectedPackageId?: string;
    expectedSurahNumbers?: readonly number[];
    expectedLocale?: SupportedLocale;
  },
  validateSchema: boolean,
): ContentPackage {
  const expectedPackageId = options.expectedPackageId ?? LOCAL_PREVIEW_PACKAGE_ID;
  const expectedSurahNumbers = options.expectedSurahNumbers ?? LOCAL_PREVIEW_SURAH_NUMBERS;
  const pkg = artifact.package;

  if (pkg.id !== expectedPackageId || artifact.integrity.packageId !== expectedPackageId) {
    throw new Error('Local preview package identity does not match the configured package.');
  }
  if (pkg.revisionId !== artifact.integrity.revisionId) {
    throw new Error('Local preview package revision does not match its integrity manifest.');
  }
  if (!/^[a-f0-9]{64}$/i.test(artifact.integrity.payloadSha256)) {
    throw new Error('Local preview package integrity manifest has an invalid SHA-256 digest.');
  }
  if (getPackagePayloadHash(pkg) !== artifact.integrity.payloadSha256.toLowerCase()) {
    throw new Error('Local preview package SHA-256 digest does not match the bundled content.');
  }
  if (options.expectedLocale && pkg.metadata.language !== options.expectedLocale) {
    throw new Error(`Local preview package locale does not match requested ${options.expectedLocale} content.`);
  }

  if (validateSchema) {
    const validation = validatePackage(pkg, { mode: 'development' });
    if (!validation.valid) {
      throw new Error(`Local preview package failed validation: ${validation.errors.join('; ')}`);
    }
  }
  assertCourseCoverage(pkg, expectedSurahNumbers);
  return pkg;
}

function assertCourseCoverage(pkg: ContentPackage, expectedSurahNumbers: readonly number[]): void {
  const expected = new Set(expectedSurahNumbers);
  const availableSurahs = new Set(pkg.surahs
    .filter(surah => !surah.navigationOnly)
    .map(surah => surah.surahNumber));
  const missingCanonicalData = expectedSurahNumbers.filter(surahNumber => {
    const surah = pkg.surahs.find(candidate => candidate.surahNumber === surahNumber);
    return !surah || surah.navigationOnly
      || !pkg.ayat.some(ayah => ayah.ref.surahNumber === surahNumber);
  });
  if (missingCanonicalData.length > 0) {
    throw new Error(`Local preview package is missing canonical content for Surah ${missingCanonicalData.join(', ')}.`);
  }
  if ([...availableSurahs].some(surahNumber => !expected.has(surahNumber))) {
    throw new Error('Local preview package contains canonical content outside Surahs 93-114.');
  }

  const curriculumSurahs = new Set(pkg.learningPaths.flatMap(path => path.surahCurricula ?? [])
    .filter(curriculum => curriculum.lessons.length > 0)
    .map(curriculum => pkg.surahs.find(surah => surah.id === curriculum.surahId)?.surahNumber)
    .filter((surahNumber): surahNumber is number => surahNumber !== undefined));
  const missingCurricula = expectedSurahNumbers.filter(surahNumber => !curriculumSurahs.has(surahNumber));
  if (missingCurricula.length > 0) {
    throw new Error(`Local preview package is missing curriculum for Surah ${missingCurricula.join(', ')}.`);
  }
}
