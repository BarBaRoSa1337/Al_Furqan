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
const LOCAL_PREVIEW_SURAH_NUMBERS = Array.from({ length: 10 }, (_, index) => index + 105);

export function loadBundledLocalPreviewPackage(
  packageId: string,
  locale: SupportedLocale,
): void {
  if (locale !== 'en' && locale !== 'fr') {
    throw new Error('Local preview content is available only for English and French lesson locales.');
  }
  const artifact = bundledLocalPreviewArtifacts[locale];
  if (!artifact) {
    throw new Error('Local preview content export is missing. Add the verified Surahs 105-114 package and SHA-256 manifest.');
  }
  const pkg = validateLocalPreviewArtifact(artifact, {
    expectedPackageId: packageId,
    expectedSurahNumbers: LOCAL_PREVIEW_SURAH_NUMBERS,
    expectedLocale: locale,
  });
  getContentRepository().registerPackage(pkg, true, 'built_in');
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

export function validateLocalPreviewArtifact(
  artifact: LocalPreviewArtifact,
  options: {
    expectedPackageId?: string;
    expectedSurahNumbers?: readonly number[];
    expectedLocale?: SupportedLocale;
  } = {},
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

  const validation = validatePackage(pkg, { mode: 'development' });
  if (!validation.valid) {
    throw new Error(`Local preview package failed validation: ${validation.errors.join('; ')}`);
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
    throw new Error('Local preview package contains canonical content outside Surahs 105-114.');
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
