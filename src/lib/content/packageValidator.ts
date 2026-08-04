import {
  AyahRecord,
  AyahRef,
  CORE_PACKAGE_TEXT_KEYS,
  ContentPackage,
  Level,
  QuranEditionId,
  QuranDivision,
  ReviewerStatus,
  SurahRecord,
  Theme,
  WordToken,
} from '../../types/content';
import { RecitationTrack, Reciter } from '../../types/media';
import {
  ReleaseUsageProfile,
  ValidationDiagnostic,
} from '../../types/governance';
import { validateActivity } from '../activities/activityEngine';
import {
  getPackagePayloadHash,
  getLocalePublicationHash,
  getSourceHash,
  getStructureSnapshotHash,
  grantCovers,
  requiredRightsForSource,
} from './governance';
import { getLevelStepKind } from './stepKind';
import { resolveLegacyWordTokenId } from './legacyPackageAdapter';
import { SUPPORTED_LOCALES } from '../../../packages/api-contracts/src';

export type ValidationMode = 'development' | 'production';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  diagnostics: ValidationDiagnostic[];
}

export function validatePackage(
  pkg: ContentPackage,
  options: { mode?: ValidationMode; releaseProfile?: ReleaseUsageProfile } = {}
): ValidationResult {
  const mode = options.mode ?? 'development';
  const releaseProfile = options.releaseProfile ?? 'public-free';
  const errors: string[] = [];
  const warnings: string[] = [];
  const diagnostics: ValidationDiagnostic[] = [];

  if (!pkg.id) errors.push('Package missing id');
  if (!pkg.version) errors.push('Package missing version');
  if (![1, 2, 3, 4].includes(pkg.schemaVersion)) errors.push(`Unsupported package schemaVersion "${pkg.schemaVersion}"`);
  if (!pkg.revisionId) errors.push('Package missing revisionId');
  validateUniqueIds('previous package revision', pkg.previousRevisionIds ?? [], errors);
  if (pkg.previousRevisionIds?.includes(pkg.revisionId)) errors.push('Package revision cannot migrate from itself');
  if (!pkg.title) errors.push('Package missing title');
  if (pkg.sources.length === 0) errors.push('Package has no sources');
  if (pkg.editions.length === 0) errors.push('Package has no Quran editions');
  if (pkg.surahs.length === 0) errors.push('Package has no canonical surahs');
  if (pkg.ayat.length === 0) errors.push('Package has no canonical ayat');
  if (pkg.learningPaths.length === 0) errors.push('Package has no learning paths');
  if (pkg.levels.length === 0) errors.push('Package has no levels');
  if (pkg.metadata.totalLevels !== pkg.levels.length) {
    errors.push(`metadata.totalLevels (${pkg.metadata.totalLevels}) does not match level count (${pkg.levels.length})`);
  }
  validateLocalization(pkg, errors);
  validateLocalePublications(pkg, mode, errors, warnings);

  validateUniqueIds('source', pkg.sources.map(source => source.id), errors);
  validateUniqueIds('edition', pkg.editions.map(edition => edition.id), errors);
  validateUniqueIds('surah', pkg.surahs.map(surah => surah.id), errors);
  validateUniqueIds('ayah', pkg.ayat.map(ayah => ayah.id), errors);
  validateUniqueIds('ayah ref', pkg.ayat.map(ayah => `${ayah.editionId}:${refKey(ayah.ref)}`), errors);
  validateUniqueIds('word token', pkg.wordTokens.map(token => token.id), errors);
  validateUniqueIds('division', pkg.divisions.map(division => division.id), errors);
  validateUniqueIds('structure index', (pkg.structureIndex ?? []).map(entry => `${entry.editionId}:${refKey(entry.ayahRef)}`), errors);
  validateUniqueIds('theme', (pkg.themes ?? []).map(theme => theme.id), errors);
  validateUniqueIds('reciter', pkg.reciters.map(reciter => reciter.id), errors);
  validateUniqueIds('recitation track', pkg.recitationTracks.map(track => track.id), errors);
  validateUniqueIds('media asset', pkg.mediaAssets.map(asset => asset.id), errors);
  validateUniqueIds('division key', pkg.divisions.map(division => `${division.editionId}:${division.kind}:${division.number}`), errors);
  validateUniqueIds('learning path', pkg.learningPaths.map(path => path.id), errors);
  validateUniqueIds('level', pkg.levels.map(level => level.id), errors);
  validateUniqueIds('block', pkg.levels.flatMap(level => level.steps.flatMap(step => step.blocks.map(block => block.id))), errors);

  pkg.sources.forEach(source => {
    validateReviewStatus(`Source "${source.id}"`, source.reviewerStatus, mode, errors, warnings);
    if (source.sourceUrl) {
      try {
        if (new URL(source.sourceUrl).protocol !== 'https:') errors.push(`Source "${source.id}" sourceUrl must use HTTPS`);
      } catch {
        errors.push(`Source "${source.id}" has invalid sourceUrl`);
      }
    }
    if (source.retrievedAt && !isValidDate(source.retrievedAt)) errors.push(`Source "${source.id}" has invalid retrievedAt date`);
    if (source.lastUpdatedAt && !isValidDate(source.lastUpdatedAt)) errors.push(`Source "${source.id}" has invalid lastUpdatedAt date`);
  });
  pkg.editions.forEach(edition => {
    validateSourceIds(`Edition "${edition.id}"`, [edition.textSourceId], pkg, errors);
    if (!edition.version) errors.push(`Edition "${edition.id}" missing version`);
  });
  pkg.surahs.forEach(surah => validateSurah(surah, pkg, mode, errors, warnings));
  pkg.ayat.forEach(ayah => validateAyah(ayah, pkg, mode, errors, warnings));
  pkg.wordTokens.forEach(token => validateWordToken(token, pkg, errors));
  pkg.divisions.forEach(division => validateDivision(division, pkg, errors));
  pkg.structureIndex?.forEach(entry => {
    const label = `StructureIndex "${entry.editionId}:${refKey(entry.ayahRef)}"`;
    const surah = pkg.surahs.find(candidate => candidate.surahNumber === entry.ayahRef.surahNumber);
    if (!surah || entry.ayahRef.ayahNumber < 1 || entry.ayahRef.ayahNumber > surah.ayahCount) {
      errors.push(`${label} references invalid Quran coordinates`);
    }
    if (!pkg.editions.some(edition => edition.id === entry.editionId)) errors.push(`${label} references unknown edition "${entry.editionId}"`);
    validateBoundedNumber(`${label} juzNumber`, entry.juzNumber, 30, errors);
    validateBoundedNumber(`${label} hizbNumber`, entry.hizbNumber, 60, errors);
    validateBoundedNumber(`${label} rubElHizbNumber`, entry.rubElHizbNumber, 240, errors);
    if (entry.editionId === 'hafs-an-asim' && entry.thumunAlHizbNumber !== undefined) errors.push(`${label} invents unsupported Hafs Thumun metadata`);
    validateStructureDivision(label, entry.ayahRef, 'juz', entry.juzNumber, pkg, errors);
    validateStructureDivision(label, entry.ayahRef, 'hizb', entry.hizbNumber, pkg, errors);
    validateStructureDivision(label, entry.ayahRef, 'rub_el_hizb', entry.rubElHizbNumber, pkg, errors);
  });
  pkg.themes?.forEach(theme => validateTheme(theme, pkg, mode, errors, warnings));
  pkg.reciters.forEach(reciter => validateReciter(reciter, pkg, mode, errors, warnings));
  pkg.recitationTracks.forEach(track => validateRecitationTrack(track, pkg, errors));
  pkg.mediaAssets.forEach(asset => validateMediaAsset(asset, pkg, mode, errors, warnings));
  pkg.learningPaths.forEach(path => {
    validateUniqueIds(`level in path "${path.id}"`, path.levelIds, errors);
    validateUniqueIds(`surah in path "${path.id}"`, path.surahIds, errors);
    path.levelIds.forEach(levelId => {
      const level = pkg.levels.find(candidate => candidate.id === levelId);
      if (!level) errors.push(`LearningPath "${path.id}" references missing level "${levelId}"`);
      if (level && level.pathId !== path.id) errors.push(`Level "${levelId}" has pathId "${level.pathId}" instead of "${path.id}"`);
    });
    path.surahIds.forEach(surahId => {
      if (!pkg.surahs.some(surah => surah.id === surahId)) errors.push(`LearningPath "${path.id}" references missing surah "${surahId}"`);
    });
    validateSourceIds(`LearningPath "${path.id}"`, path.sourceMetadata.sourceIds, pkg, errors);
    validateReviewStatus(`LearningPath "${path.id}"`, path.sourceMetadata.reviewerStatus, mode, errors, warnings);
    validateDiscoveryMetadata(`LearningPath "${path.id}"`, path.discovery, pkg, errors, warnings);
    validateSurahCurricula(path, pkg, errors);
  });
  if (pkg.metadata.defaultLearningPathId && !pkg.learningPaths.some(path => path.id === pkg.metadata.defaultLearningPathId)) {
    errors.push(`metadata.defaultLearningPathId references missing path "${pkg.metadata.defaultLearningPathId}"`);
  }
  pkg.levels.forEach(level => validateLevel(level, pkg, mode, errors, warnings));
  validateGovernance(pkg, mode, releaseProfile, errors, warnings, diagnostics);

  errors.forEach(message => {
    if (!diagnostics.some(item => item.severity === 'error' && item.message === message)) {
      diagnostics.push({ code: diagnosticCode(message), severity: 'error', message });
    }
  });
  warnings.forEach(message => {
    if (!diagnostics.some(item => item.severity === 'warning' && item.message === message)) {
      diagnostics.push({ code: diagnosticCode(message), severity: 'warning', message });
    }
  });
  return { valid: errors.length === 0, errors, warnings, diagnostics };
}

function validateLocalePublications(
  pkg: ContentPackage,
  mode: ValidationMode,
  errors: string[],
  warnings: string[],
): void {
  if (pkg.schemaVersion < 3) return;
  const publications = pkg.localePublications ?? [];
  if (publications.length === 0) {
    errors.push(`Package "${pkg.id}" schema v3 has no locale publications`);
    return;
  }
  if (mode === 'production' && !publications.some(item => item.status === 'published')) {
    errors.push(`Package "${pkg.id}" has no published lesson locale`);
  }
  validateUniqueIds('locale publication', publications.map(item => item.locale), errors);
  publications.forEach(publication => {
    const label = `Locale publication "${publication.locale}"`;
    if (!SUPPORTED_LOCALES.includes(publication.locale)) errors.push(`${label} is unsupported`);
    if (mode === 'production' && publication.status === 'draft') errors.push(`${label} remains draft`);
    if (publication.status === 'published') {
      if (!/^[a-f0-9]{64}$/i.test(publication.contentHash ?? '')) errors.push(`${label} has no exact content hash`);
      if (publication.contentHash && publication.contentHash !== getLocalePublicationHash(pkg, publication.locale)) errors.push(`${label} content hash does not match its lesson payload`);
      const languageApproval = pkg.governance?.approvals.find(item => item.id === publication.languageApprovalId);
      const islamicApproval = pkg.governance?.approvals.find(item => item.id === publication.islamicApprovalId);
      if (!languageApproval || languageApproval.role !== 'editorial' || languageApproval.target.kind !== 'locale_publication' || languageApproval.target.id !== publication.locale || languageApproval.target.hash !== publication.contentHash) {
        (mode === 'production' ? errors : warnings).push(`${label} lacks an exact named language approval`);
      }
      if (!islamicApproval || islamicApproval.role !== 'shaykh' || islamicApproval.target.kind !== 'locale_publication' || islamicApproval.target.id !== publication.locale || islamicApproval.target.hash !== publication.contentHash) {
        (mode === 'production' ? errors : warnings).push(`${label} lacks an exact named Islamic approval`);
      }
    }
    publication.availableAlternatives.forEach(locale => {
      if (!SUPPORTED_LOCALES.includes(locale)) errors.push(`${label} has unsupported alternative "${locale}"`);
    });
  });
  if (pkg.creationMethod !== 'human_authored' && pkg.creationMethod !== 'provider_verbatim' && pkg.creationMethod !== 'mixed_human_and_provider') {
    errors.push(`Package "${pkg.id}" schema v3 lacks approved human/provider provenance`);
  }
}

function validateGovernance(
  pkg: ContentPackage,
  mode: ValidationMode,
  releaseProfile: ReleaseUsageProfile,
  errors: string[],
  warnings: string[],
  diagnostics: ValidationDiagnostic[],
): void {
  const report = (
    code: string,
    message: string,
    path?: string,
    targetId?: string,
  ) => {
    const severity = mode === 'production' ? 'error' : 'warning';
    diagnostics.push({ code, severity, message, path, targetId });
    (severity === 'error' ? errors : warnings).push(message);
  };
  const governance = pkg.governance;
  if (!governance) {
    report('governance_missing', `Package "${pkg.id}" has no evidence-bound governance record`, 'governance', pkg.id);
    return;
  }

  validateUniqueIds('evidence', governance.evidence.map(item => item.id), errors);
  validateUniqueIds('approval attestation', governance.approvals.map(item => item.id), errors);
  validateUniqueIds('license grant', governance.licenseGrants.map(item => item.id), errors);
  governance.evidence.forEach(evidence => {
    if (!evidence.reference) report('evidence_reference_missing', `Evidence "${evidence.id}" has no secure reference`, 'governance.evidence', evidence.id);
    if (!/^[a-f0-9]{64}$/i.test(evidence.sha256)) report('evidence_hash_invalid', `Evidence "${evidence.id}" has an invalid SHA-256`, 'governance.evidence', evidence.id);
    if (!isValidDate(evidence.capturedAt)) report('evidence_date_invalid', `Evidence "${evidence.id}" has an invalid capturedAt date`, 'governance.evidence', evidence.id);
  });

  const evidenceIds = new Set(governance.evidence.map(item => item.id));
  governance.approvals.forEach(approval => {
    if (!approval.reviewer.id || !approval.reviewer.displayName) {
      report('approval_reviewer_missing', `Approval "${approval.id}" has no reviewer identity`, 'governance.approvals', approval.id);
    }
    if (!isValidDate(approval.reviewedAt)) {
      report('approval_date_invalid', `Approval "${approval.id}" has an invalid reviewedAt date`, 'governance.approvals', approval.id);
    }
    if (!evidenceIds.has(approval.evidenceRefId)) {
      report('approval_evidence_missing', `Approval "${approval.id}" references missing evidence "${approval.evidenceRefId}"`, 'governance.approvals', approval.id);
    }
  });
  governance.licenseGrants.forEach(grant => {
    if (!evidenceIds.has(grant.evidenceRefId)) {
      report('license_evidence_missing', `License grant "${grant.id}" references missing evidence "${grant.evidenceRefId}"`, 'governance.licenseGrants', grant.id);
    }
    const licenseEvidence = governance.evidence.find(item => item.id === grant.evidenceRefId);
    if (licenseEvidence && licenseEvidence.kind !== 'published_terms' && licenseEvidence.kind !== 'written_permission') {
      report('license_evidence_kind_invalid', `License grant "${grant.id}" must reference published terms or written permission`, 'governance.licenseGrants', grant.id);
    }
    if (!pkg.sources.some(source => source.id === grant.sourceId)) {
      report('license_source_missing', `License grant "${grant.id}" references unknown source "${grant.sourceId}"`, 'governance.licenseGrants', grant.id);
    }
    if (!isValidDate(grant.validFrom) || (grant.validUntil && !isValidDate(grant.validUntil))) {
      report('license_date_invalid', `License grant "${grant.id}" has an invalid validity date`, 'governance.licenseGrants', grant.id);
    }
    if (grant.retention.kind === 'bounded' && (!Number.isInteger(grant.retention.maxAgeSeconds) || grant.retention.maxAgeSeconds <= 0)) {
      report('license_retention_invalid', `License grant "${grant.id}" has an invalid cache retention`, 'governance.licenseGrants', grant.id);
    }
    const hasWrittenOverride = grant.providerTermsOverride && licenseEvidence?.kind === 'written_permission';
    if (/quran-foundation/i.test(grant.sourceId)
      && !hasWrittenOverride
      && (grant.retention.kind !== 'bounded' || grant.retention.maxAgeSeconds > 7 * 24 * 60 * 60)) {
      report('license_retention_exceeds_provider_terms', `License grant "${grant.id}" exceeds the default seven-day Quran Foundation retention limit`, 'governance.licenseGrants', grant.id);
    }
  });

  const packageHash = getPackagePayloadHash(pkg);
  const requiredPackageRoles = ['editorial', 'shaykh', 'technical'] as const;
  requiredPackageRoles.forEach(role => {
    const approval = governance.approvals.find(item => (
      item.decision === 'approved'
      && item.role === role
      && item.target.kind === 'package_payload'
      && item.target.id === pkg.id
      && item.target.hash === packageHash
    ));
    if (!approval) {
      report('approval_missing_or_stale', `Package "${pkg.id}" lacks a current ${role} approval for payload hash ${packageHash}`, 'governance.approvals', pkg.id);
    }
  });

  const structureHash = getStructureSnapshotHash(pkg);
  if (pkg.structureIndex?.length) {
    const structureApproval = governance.approvals.find(item => (
      item.decision === 'approved'
      && item.role === 'technical'
      && item.target.kind === 'structure_snapshot'
      && item.target.id === `${pkg.editions[0]?.id ?? 'unknown'}:structure`
      && item.target.hash === structureHash
    ));
    if (!structureApproval) {
      report('structure_approval_missing_or_stale', `Structure snapshot lacks technical approval for hash ${structureHash}`, 'governance.approvals', pkg.id);
    }
  }

  pkg.sources.forEach(source => {
    const sourceHash = getSourceHash(source);
    const legalApproval = governance.approvals.find(item => (
      item.decision === 'approved'
      && item.role === 'legal'
      && item.target.kind === 'source'
      && item.target.id === source.id
      && item.target.hash === sourceHash
    ));
    if (!legalApproval) {
      report('source_legal_approval_missing_or_stale', `Source "${source.id}" lacks legal approval for hash ${sourceHash}`, 'governance.approvals', source.id);
    }

    const tracks = pkg.recitationTracks.filter(track => track.sourceId === source.id);
    const grant = governance.licenseGrants.find(candidate => grantCovers(candidate, {
      sourceId: source.id,
      profile: releaseProfile,
      platforms: ['android', 'ios', 'web'],
      rights: requiredRightsForSource(pkg, source.id, releaseProfile),
      ...(tracks.length ? {
        resourceIds: tracks.map(track => track.id),
        contentHashes: tracks.flatMap(track => track.checksum ? [track.checksum] : []),
      } : {}),
    }));
    if (!grant) {
      report('license_grant_missing_or_insufficient', `Source "${source.id}" lacks an evidence-backed ${releaseProfile} grant for all declared app uses`, 'governance.licenseGrants', source.id);
    }
  });

  pkg.ayat.flatMap(ayah => ayah.tafsirEntries).forEach(entry => {
    if (!entry.citation?.sourceId || !entry.citation.locator) {
      report('religious_citation_missing', `Tafsir "${entry.id}" lacks an exact source citation`, 'ayat.tafsirEntries', entry.id);
    }
  });
}

function diagnosticCode(message: string): string {
  if (message.includes('reviewerStatus')) return 'review_status_unapproved';
  if (message.includes('license')) return 'license_invalid';
  if (message.includes('source')) return 'source_invalid';
  return 'package_invalid';
}

function isValidDate(value: string): boolean {
  return value.trim().length > 0 && Number.isFinite(new Date(value).getTime());
}

function validateLocalization(pkg: ContentPackage, errors: string[]): void {
  if (!pkg.localization.defaultLocale) errors.push('Package localization missing defaultLocale');
  const catalog = pkg.localization.catalogs.find(item => item.locale === pkg.localization.defaultLocale);
  if (!catalog) {
    errors.push(`Package localization missing default catalog "${pkg.localization.defaultLocale}"`);
    return;
  }
  CORE_PACKAGE_TEXT_KEYS.forEach(key => {
    if (!catalog.entries[key]) errors.push(`Package localization missing key "${key}"`);
  });
}

function validateSurah(
  surah: SurahRecord,
  pkg: ContentPackage,
  mode: ValidationMode,
  errors: string[],
  warnings: string[]
): void {
  const label = `Surah "${surah.id}"`;
  const actualAyahCount = pkg.ayat.filter(ayah => ayah.ref.surahNumber === surah.surahNumber).length;
  const indexedAyahCount = (pkg.structureIndex ?? []).filter(entry => entry.ayahRef.surahNumber === surah.surahNumber).length;
  if (surah.navigationOnly) {
    if (actualAyahCount > 0) errors.push(`${label} is navigation-only but contains Quran text records`);
    if (indexedAyahCount !== surah.ayahCount) errors.push(`${label} declares ${surah.ayahCount} ayat but structure index contains ${indexedAyahCount}`);
  } else if (actualAyahCount !== surah.ayahCount) {
    errors.push(`${label} declares ${surah.ayahCount} ayat but package contains ${actualAyahCount}`);
  }
  validateSourceIds(label, [
    surah.sourceMetadata.quranTextSourceId,
    ...surah.sourceMetadata.translationSourceIds,
    ...surah.sourceMetadata.tafsirSourceIds,
  ], pkg, errors);
  validateReviewStatus(label, surah.sourceMetadata.reviewerStatus, mode, errors, warnings);
}

function validateAyah(
  ayah: AyahRecord,
  pkg: ContentPackage,
  mode: ValidationMode,
  errors: string[],
  warnings: string[]
): void {
  const label = `Ayah "${ayah.id}"`;
  if (!pkg.editions.some(edition => edition.id === ayah.editionId)) errors.push(`${label} references unknown edition "${ayah.editionId}"`);
  if (!ayah.arabicText.text) errors.push(`${label} missing Arabic text`);
  if (!ayah.sourceVersion) errors.push(`${label} missing sourceVersion`);
  if (!/^[a-f0-9]{64}$/i.test(ayah.checksum)) errors.push(`${label} has invalid checksum`);
  if (ayah.arabicText.sourceId !== ayah.sourceId) errors.push(`${label} Arabic source does not match canonical source`);
  validateSourceIds(label, [ayah.sourceId], pkg, errors);
  validateReviewStatus(`${label} Arabic text`, ayah.arabicText.reviewerStatus, mode, errors, warnings);
  if (ayah.translations.length === 0) errors.push(`${label} missing translations`);
  validateUniqueIds(`translation in ${label}`, ayah.translations.map(entry => entry.id), errors);
  validateUniqueIds(`tafsir in ${label}`, ayah.tafsirEntries.map(entry => entry.id), errors);
  ayah.translations.forEach(entry => {
    validateSourceIds(`Translation "${entry.id}"`, [entry.sourceId], pkg, errors);
    validateReviewStatus(`Translation "${entry.id}"`, entry.reviewerStatus, mode, errors, warnings);
  });
  ayah.tafsirEntries.forEach(entry => {
    validateSourceIds(`Tafsir "${entry.id}"`, [entry.sourceId], pkg, errors);
    validateReviewStatus(`Tafsir "${entry.id}"`, entry.reviewerStatus, mode, errors, warnings);
  });
  ayah.wordMeanings?.forEach((entry, index) => {
    const wordLabel = `${label} wordMeaning[${index}]`;
    const hasLegacyArabic = 'arabic' in entry && typeof entry.arabic === 'string' && entry.arabic.trim().length > 0;
    validateSourceIds(wordLabel, [entry.sourceId], pkg, errors);
    validateReviewStatus(wordLabel, entry.reviewerStatus, mode, errors, warnings);
    if (pkg.schemaVersion >= 2 && !entry.wordTokenId) errors.push(`${wordLabel} missing canonical token reference`);
    if (pkg.schemaVersion === 1 && !entry.wordTokenId) {
      if (!hasLegacyArabic) {
        errors.push(`${wordLabel} missing Arabic text or canonical token reference`);
      } else if (!resolveLegacyWordTokenId(pkg, ayah, entry.arabic)) {
        errors.push(`${wordLabel} legacy Arabic does not match exactly one canonical token in ${label}`);
      }
    }
    if (entry.wordTokenId && !ayah.wordTokenIds.includes(entry.wordTokenId)) {
      errors.push(`${wordLabel} token is absent from ${label}`);
    }
    if (pkg.schemaVersion >= 2 && 'arabic' in entry) errors.push(`${wordLabel} duplicates canonical Arabic text`);
    if (!entry.id) errors.push(`${wordLabel} missing stable id`);
  });
  validateUniqueIds(`word meaning in ${label}`, ayah.wordMeanings?.map(entry => entry.id) ?? [], errors);
  if (ayah.wordTokenIds.length === 0) errors.push(`${label} missing word tokens`);
  validateUniqueIds(`word token in ${label}`, ayah.wordTokenIds, errors);
  ayah.wordTokenIds.forEach((tokenId, index) => {
    const token = pkg.wordTokens.find(candidate => candidate.id === tokenId);
    if (!token || !sameRef(token.ayahRef, ayah.ref) || token.position !== index + 1) errors.push(`${label} word token order is not canonical`);
  });
}

function validateWordToken(token: WordToken, pkg: ContentPackage, errors: string[]): void {
  const label = `WordToken "${token.id}"`;
  if (!pkg.editions.some(edition => edition.id === token.editionId)) errors.push(`${label} references unknown edition "${token.editionId}"`);
  if (!token.arabicText) errors.push(`${label} missing Arabic text`);
  if (!Number.isInteger(token.position) || token.position < 1) errors.push(`${label} has invalid position`);
  if (!token.sourceVersion) errors.push(`${label} missing sourceVersion`);
  validateSourceIds(label, [token.sourceId], pkg, errors);
  const ayah = pkg.ayat.find(candidate => candidate.editionId === token.editionId && sameRef(candidate.ref, token.ayahRef));
  if (!ayah) errors.push(`${label} references unavailable ayah ${refKey(token.ayahRef)}`);
  if (ayah && !ayah.wordTokenIds.includes(token.id)) errors.push(`${label} is absent from ayah "${ayah.id}"`);
}

function validateDivision(division: QuranDivision, pkg: ContentPackage, errors: string[]): void {
  const label = `Division "${division.id}"`;
  if (!pkg.editions.some(edition => edition.id === division.editionId)) errors.push(`${label} references unknown edition "${division.editionId}"`);
  if (!Number.isInteger(division.number) || division.number < 1) errors.push(`${label} has invalid number`);
  const maximum = division.kind === 'juz' ? 30 : division.kind === 'hizb' ? 60 : division.kind === 'rub_el_hizb' ? 240 : 480;
  if (division.number > maximum) errors.push(`${label} number exceeds ${maximum}`);
  if (division.editionId === 'hafs-an-asim' && division.kind === 'thumun_al_hizb') errors.push(`${label} uses unsupported Hafs Thumun division`);
  if (!division.sourceVersion) errors.push(`${label} missing sourceVersion`);
  if (division.contentHash && !/^[a-f0-9]{64}$/i.test(division.contentHash)) errors.push(`${label} has invalid contentHash`);
  validateSourceIds(label, [division.sourceId], pkg, errors);
  if (comparePositions(division.range.start, division.range.end) > 0) errors.push(`${label} starts after its end`);
}

function validateReciter(reciter: Reciter, pkg: ContentPackage, mode: ValidationMode, errors: string[], warnings: string[]): void {
  const label = `Reciter "${reciter.id}"`;
  if (!pkg.editions.some(edition => edition.id === reciter.editionId)) errors.push(`${label} references unknown edition "${reciter.editionId}"`);
  if (!reciter.displayName || !reciter.license) errors.push(`${label} missing display name or license`);
  validateSourceIds(label, [reciter.sourceId], pkg, errors);
  validateReviewStatus(label, reciter.reviewerStatus, mode, errors, warnings);
}

function validateRecitationTrack(track: RecitationTrack, pkg: ContentPackage, errors: string[]): void {
  const label = `RecitationTrack "${track.id}"`;
  const reciter = pkg.reciters.find(candidate => candidate.id === track.reciterId);
  if (!reciter) errors.push(`${label} references missing reciter "${track.reciterId}"`);
  if (reciter && reciter.editionId !== track.editionId) errors.push(`${label} edition does not match reciter`);
  if (!pkg.editions.some(edition => edition.id === track.editionId)) errors.push(`${label} references unknown edition "${track.editionId}"`);
  if (!findAyah(pkg, track.ayahRef)) errors.push(`${label} references missing ayah ${refKey(track.ayahRef)}`);
  if (!track.license) errors.push(`${label} missing license`);
  if (track.deliveryMode !== 'stream_only' && !/^[a-f0-9]{64}$/i.test(track.checksum ?? '')) errors.push(`${label} cacheable audio has invalid checksum`);
  if (track.deliveryMode === 'stream_only') {
    if (track.asset.kind !== 'remote') errors.push(`${label} stream-only audio must be remote`);
    if (!track.providerReciterId || !track.providerMushafId || !track.providerSurahId) errors.push(`${label} stream-only audio lacks provider identity`);
    if (!track.approvedHostnames?.length) errors.push(`${label} stream-only audio lacks an approved hostname allowlist`);
    try {
      const uri = new URL(track.asset.uri);
      if (uri.protocol !== 'https:' || !track.approvedHostnames?.includes(uri.hostname)) errors.push(`${label} stream URI is outside its approved HTTPS origins`);
    } catch {
      errors.push(`${label} has invalid stream URI`);
    }
  }
  if (!track.asset.uri) errors.push(`${label} missing asset URI`);
  if (track.durationMs !== undefined && (!Number.isFinite(track.durationMs) || track.durationMs <= 0)) errors.push(`${label} has invalid durationMs`);
  if (track.byteSize !== undefined && (!Number.isInteger(track.byteSize) || track.byteSize <= 0)) errors.push(`${label} has invalid byteSize`);
  validateSourceIds(label, [track.sourceId], pkg, errors);
}

function validateMediaAsset(
  asset: ContentPackage['mediaAssets'][number],
  pkg: ContentPackage,
  mode: ValidationMode,
  errors: string[],
  warnings: string[]
): void {
  const label = `MediaAsset "${asset.id}"`;
  if (!asset.uri || !asset.altText || !asset.license) errors.push(`${label} missing URI, alt text, or license`);
  if (!/^[a-f0-9]{64}$/i.test(asset.checksum)) errors.push(`${label} has invalid checksum`);
  validateSourceIds(label, asset.sourceIds, pkg, errors);
  validateReviewStatus(label, asset.reviewerStatus, mode, errors, warnings);
  if (asset.reducedMotionAssetId && !pkg.mediaAssets.some(candidate => candidate.id === asset.reducedMotionAssetId)) {
    errors.push(`${label} references missing reduced-motion asset "${asset.reducedMotionAssetId}"`);
  }
}

function validateLevel(
  level: Level,
  pkg: ContentPackage,
  mode: ValidationMode,
  errors: string[],
  warnings: string[]
): void {
  const label = `Level "${level.id}"`;
  const path = pkg.learningPaths.find(candidate => candidate.id === level.pathId);
  const surah = pkg.surahs.find(candidate => candidate.id === level.surahId);
  if (!path) errors.push(`${label} references missing path "${level.pathId}"`);
  if (path && !path.levelIds.includes(level.id)) errors.push(`${label} is absent from path "${path.id}"`);
  if (!surah) errors.push(`${label} references missing surah "${level.surahId}"`);
  if (path && !path.surahIds.includes(level.surahId)) errors.push(`${label} surah is absent from path "${path.id}"`);
  if (level.durationMinutes < 5 || level.durationMinutes > 8) errors.push(`${label} duration must be 5-8 minutes`);
  if (level.steps.length === 0) errors.push(`${label} has no steps`);
  const curriculumLesson = path?.surahCurricula?.flatMap(item => item.lessons).find(item => item.levelId === level.id);
  const isIntroduction = curriculumLesson?.kind === 'introduction';
  if (pkg.schemaVersion >= 2 && !isIntroduction && (!level.completionRules?.requireMemoryActivity || !level.completionRules.requireUnderstandingActivity)) errors.push(`${label} schema v2 requires memory and understanding completion rules`);
  validateUniqueIds(`step in ${label}`, level.steps.map(step => step.id), errors);
  validateUniqueIds(`block in ${label}`, level.steps.flatMap(step => step.blocks.map(block => block.id)), errors);
  validateUniqueIds(`ayah ref in ${label}`, level.ayahRefs.map(refKey), errors);
  level.ayahRefs.forEach(ref => validateAyahRef(label, ref, pkg, errors));
  validateDiscoveryMetadata(label, level.discovery, pkg, errors, warnings);
  const structure = level.ayahRefs
    .map(ref => pkg.structureIndex?.find(entry => sameRef(entry.ayahRef, ref)))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  if (structure.length > 1) {
    const hizbs = new Set(structure.map(entry => entry.hizbNumber));
    const rubs = new Set(structure.map(entry => entry.rubElHizbNumber));
    if (hizbs.size > 1 || rubs.size > 1) warnings.push(`${label} unexpectedly crosses a Hizb or Rub boundary`);
  }

  level.unlockRules?.requiresLevelIds?.forEach(requiredId => {
    if (!path?.levelIds.includes(requiredId)) errors.push(`${label} unlock rule references level outside its path: "${requiredId}"`);
  });

  const taughtKnowledgeRefs: string[] = [];
  level.steps.forEach(step => {
    if (pkg.schemaVersion >= 2 && !step.kind) errors.push(`${label} step "${step.id}" missing kind`);
    const stepKind = getLevelStepKind(step);
    if (step.blocks.length === 0) errors.push(`${label} step "${step.id}" has no blocks`);
    const interactiveBlocks = step.blocks.filter(block => block.type === 'activity' || block.type === 'question');
    if (pkg.schemaVersion >= 2 && interactiveBlocks.length > 1) errors.push(`${label} step "${step.id}" has more than one interactive exercise`);
    step.blocks.forEach(block => {
      const blockLabel = `${label} block "${block.id}"`;
      if (pkg.schemaVersion >= 2 && !isBlockAllowedInStep(stepKind, block.type)) errors.push(`${blockLabel} is incompatible with step kind "${stepKind}"`);
      if (block.type === 'ayah_ref' || block.type === 'tafsir_ref') {
        validateBlockAyahRef(blockLabel, block.ayahRef, level, pkg, errors);
      }
      if (block.type === 'quran_passage' || block.type === 'translation' || block.type === 'audio') {
        if (block.ayahRefs.length === 0) errors.push(`${blockLabel} has no ayah refs`);
        block.ayahRefs.forEach(ref => validateBlockAyahRef(blockLabel, ref, level, pkg, errors));
      }
      if (block.type === 'translation') {
        const entries = block.ayahRefs.flatMap(ref => findAyah(pkg, ref)?.translations ?? []);
        block.translationEntryIds?.forEach(id => {
          if (!entries.some(entry => entry.id === id)) errors.push(`${blockLabel} references missing translation "${id}"`);
        });
      }
      if (block.type === 'tafsir_ref') {
        const ayah = findAyah(pkg, block.ayahRef);
        if (!ayah?.tafsirEntries.some(entry => entry.id === block.tafsirEntryId)) errors.push(`${blockLabel} references missing tafsir "${block.tafsirEntryId}"`);
      }
      if (block.type === 'word_explorer') {
        if (block.ayahRefs.length === 0) errors.push(`${blockLabel} has no ayah refs`);
        block.ayahRefs.forEach(ref => validateBlockAyahRef(blockLabel, ref, level, pkg, errors));
      }
      if (block.type === 'word_meaning') {
        if (block.wordMeaningIds.length === 0) errors.push(`${blockLabel} has no selected word meanings`);
        validateUniqueIds(`word meaning in ${blockLabel}`, block.wordMeaningIds, errors);
        const meanings = level.ayahRefs.flatMap(ref => findAyah(pkg, ref)?.wordMeanings ?? []);
        block.wordMeaningIds.forEach(id => {
          if (!meanings.some(meaning => meaning.id === id)) errors.push(`${blockLabel} references missing word meaning "${id}"`);
        });
      }
      if (block.type === 'audio') {
        if (block.reciterId && !pkg.reciters.some(reciter => reciter.id === block.reciterId)) errors.push(`${blockLabel} references missing reciter "${block.reciterId}"`);
        if (block.required && block.ayahRefs.some(ref => !pkg.recitationTracks.some(track => sameRef(track.ayahRef, ref) && (!block.reciterId || track.reciterId === block.reciterId)))) errors.push(`${blockLabel} requires unavailable recitation tracks`);
      }
      if (block.type === 'source_locked') {
        validateSourceIds(blockLabel, [block.sourceId], pkg, errors);
        if (mode === 'production') errors.push(`${blockLabel} source-locked content cannot ship in production`);
        if (step.required !== false) errors.push(`${blockLabel} source-locked step must be optional`);
        const alternative = level.steps.find(candidate => candidate.id === block.alternativeStepId);
        if (!alternative || alternative.id === step.id) errors.push(`${blockLabel} references missing alternative step "${block.alternativeStepId}"`);
        if (alternative && !alternative.blocks.some(candidate => candidate.type === 'activity' || candidate.type === 'question')) {
          errors.push(`${blockLabel} alternative step "${block.alternativeStepId}" is not interactive`);
        }
      }
      if (block.type === 'media' && !pkg.mediaAssets.some(asset => asset.id === block.assetId)) errors.push(`${blockLabel} references missing media asset "${block.assetId}"`);
      if (block.type === 'surah_overview' && block.surahId !== level.surahId) errors.push(`${blockLabel} references a different surah`);
      if (block.type === 'context' || block.type === 'question' || block.type === 'summary') {
        validateSourceIds(blockLabel, block.sourceIds, pkg, errors);
        validateReviewStatus(blockLabel, block.reviewerStatus, mode, errors, warnings);
      }
      if (block.type === 'summary' && pkg.schemaVersion >= 4 && !block.variant) errors.push(`${blockLabel} schema v4 requires a summary variant`);
      if (block.type === 'summary' && block.variant === 'reflection' && mode === 'production') {
        const namedRoles = new Set((pkg.governance?.approvals ?? [])
          .filter(approval => approval.decision === 'approved'
            && approval.target.kind === 'package_payload'
            && approval.target.id === pkg.id
            && approval.reviewer.displayName.trim().length > 0)
          .map(approval => approval.role));
        if (!namedRoles.has('editorial') || !namedRoles.has('shaykh')) errors.push(`${blockLabel} reflection lacks named editorial and Islamic approval`);
      }
      if (block.type === 'question') validateQuestion(blockLabel, block, errors);
      if (block.type === 'activity') {
        if (block.id !== block.activity.id) errors.push(`${blockLabel} activity ID must match block ID`);
        validateSourceIds(blockLabel, block.activity.sourceIds, pkg, errors);
        validateReviewStatus(blockLabel, block.activity.reviewerStatus, mode, errors, warnings);
        if (pkg.schemaVersion >= 4 && !block.activity.placement) errors.push(`${blockLabel} schema v4 requires activity placement`);
        if (block.activity.placement === 'surah_review' && curriculumLesson?.kind !== 'final_review') errors.push(`${blockLabel} surah-review activity is outside a final review`);
        if (block.activity.placement === 'segment_review' && curriculumLesson?.kind !== 'segment_review') errors.push(`${blockLabel} segment-review activity is outside a segment review`);
        if (block.activity.placement === 'lesson' && block.activity.ayahRefs.length > 1 && curriculumLesson?.kind !== 'ayah_range') errors.push(`${blockLabel} multi-ayah lesson activity is outside an ayah-range boundary`);
        const result = validateActivity(block.activity, {
          availableAyahRefs: level.ayahRefs,
          availableTokenIds: pkg.wordTokens
            .filter(token => level.ayahRefs.some(ref => sameRef(ref, token.ayahRef)))
            .map(token => token.id),
          availableMeaningIds: level.ayahRefs.flatMap(ref => findAyah(pkg, ref)?.wordMeanings?.map(meaning => meaning.id) ?? []),
          availableTranslationEntryIds: level.ayahRefs.flatMap(ref => findAyah(pkg, ref)?.translations.map(entry => entry.id) ?? []),
          taughtKnowledgeRefs,
        });
        result.errors.forEach(error => errors.push(`${blockLabel} ${error}`));
      }
      taughtKnowledgeRefs.push(block.id);
    });
  });

  const requiredSteps = level.steps.filter(step => step.required !== false);
  const memoryActivities = requiredSteps.filter(step => getLevelStepKind(step) === 'memorize' || getLevelStepKind(step) === 'memory_practice')
    .flatMap(step => step.blocks.filter(block => block.type === 'activity'));
  const understandingActivities = requiredSteps.filter(step => getLevelStepKind(step) === 'understanding_practice')
    .flatMap(step => step.blocks.filter(block => block.type === 'activity' || block.type === 'question'));
  if (level.completionRules?.requireMemoryActivity && memoryActivities.length === 0) errors.push(`${label} requires at least one memory activity`);
  if (level.completionRules?.requireUnderstandingActivity && understandingActivities.length === 0) errors.push(`${label} requires at least one understanding activity`);
}

function validateSurahCurricula(path: ContentPackage['learningPaths'][number], pkg: ContentPackage, errors: string[]): void {
  const curricula = path.surahCurricula ?? [];
  if (pkg.schemaVersion >= 4 && curricula.length === 0) {
    errors.push(`LearningPath "${path.id}" schema v4 has no Surah curricula`);
    return;
  }
  validateUniqueIds(`Surah curriculum in path "${path.id}"`, curricula.map(item => item.id), errors);
  validateUniqueIds(`Surah curriculum target in path "${path.id}"`, curricula.map(item => item.surahId), errors);

  const flattenedLevelIds = curricula.flatMap(item => item.lessons.map(lesson => lesson.levelId));
  if (pkg.schemaVersion >= 4 && flattenedLevelIds.join('|') !== path.levelIds.join('|')) {
    errors.push(`LearningPath "${path.id}" levelIds must match ordered Surah curriculum lessons`);
  }

  curricula.forEach(curriculum => {
    const label = `SurahCurriculum "${curriculum.id}"`;
    if (!path.surahIds.includes(curriculum.surahId)) errors.push(`${label} references a surah outside its path`);
    if (curriculum.lessons.length === 0) errors.push(`${label} has no lessons`);
    validateUniqueIds(`lesson in ${label}`, curriculum.lessons.map(lesson => lesson.levelId), errors);
    if (pkg.schemaVersion >= 4 && curriculum.lessons[0]?.kind !== 'introduction') errors.push(`${label} must begin with an introduction`);
    if (pkg.schemaVersion >= 4 && curriculum.lessons.at(-1)?.kind !== 'final_review') errors.push(`${label} must end with a final review`);

    curriculum.lessons.forEach(lesson => {
      const level = pkg.levels.find(candidate => candidate.id === lesson.levelId);
      if (!level) errors.push(`${label} references missing level "${lesson.levelId}"`);
      if (level && (level.pathId !== path.id || level.surahId !== curriculum.surahId)) errors.push(`${label} lesson "${lesson.levelId}" belongs to another path or surah`);
      if (lesson.kind === 'introduction' && level?.ayahRefs.length) errors.push(`${label} introduction must not own ayah references`);
      if ((lesson.kind === 'ayah' || lesson.kind === 'ayah_range') && !lesson.ayahRange) errors.push(`${label} lesson "${lesson.levelId}" has no ayah range`);
      if (lesson.ayahRange && level) {
        const first = level.ayahRefs[0];
        const last = level.ayahRefs.at(-1);
        if (!first || !last || !sameRef(first, lesson.ayahRange.start) || !sameRef(last, lesson.ayahRange.end)) errors.push(`${label} lesson "${lesson.levelId}" range does not match its level`);
      }
    });

    validateUniqueIds(`review segment in ${label}`, curriculum.reviewSegments.map(segment => segment.id), errors);
    curriculum.reviewSegments.forEach(segment => {
      if (!curriculum.lessons.some(lesson => lesson.levelId === segment.reviewLevelId && (lesson.kind === 'segment_review' || lesson.kind === 'final_review'))) errors.push(`${label} segment "${segment.id}" has an invalid review level`);
      segment.coveredLessonIds.forEach(levelId => {
        if (!curriculum.lessons.some(lesson => lesson.levelId === levelId)) errors.push(`${label} segment "${segment.id}" covers an unknown lesson "${levelId}"`);
      });
    });
    curriculum.completionEquivalences?.forEach(equivalence => {
      if (!pkg.levels.some(level => level.id === equivalence.sourceLevelId)) errors.push(`${label} completion source "${equivalence.sourceLevelId}" is unknown`);
      equivalence.equivalentLevelIds.forEach(levelId => {
        if (!curriculum.lessons.some(lesson => lesson.levelId === levelId)) errors.push(`${label} completion target "${levelId}" is outside the curriculum`);
      });
    });
    validateUniqueIds(`completion migration in ${label}`, curriculum.completionMigrations?.map(item => item.id) ?? [], errors);
    curriculum.completionMigrations?.forEach(migration => {
      if (!migration.historicalLevelId.trim()) errors.push(`${label} completion migration "${migration.id}" has no historical level ID`);
      if (migration.completedLevelIds.length === 0) errors.push(`${label} completion migration "${migration.id}" has no targets`);
      migration.completedLevelIds.forEach(levelId => {
        if (!curriculum.lessons.some(lesson => lesson.levelId === levelId)) errors.push(`${label} completion migration "${migration.id}" target "${levelId}" is outside the curriculum`);
      });
    });
  });
}

function validateTheme(
  theme: Theme,
  pkg: ContentPackage,
  mode: ValidationMode,
  errors: string[],
  warnings: string[]
): void {
  const label = `Theme "${theme.id}"`;
  if (!theme.title[pkg.localization.defaultLocale]) errors.push(`${label} missing default-locale title`);
  validateSourceIds(label, theme.sourceIds, pkg, errors);
  validateReviewStatus(label, theme.reviewerStatus, mode, errors, warnings);
  if (theme.parentId && !pkg.themes?.some(candidate => candidate.id === theme.parentId)) errors.push(`${label} references missing parent "${theme.parentId}"`);
}

function validateDiscoveryMetadata(
  label: string,
  discovery: Level['discovery'],
  pkg: ContentPackage,
  errors: string[],
  warnings: string[]
): void {
  if (!discovery) {
    warnings.push(`${label} has no discovery metadata`);
    return;
  }
  discovery.themeIds.forEach(themeId => {
    if (!pkg.themes?.some(theme => theme.id === themeId)) errors.push(`${label} references missing theme "${themeId}"`);
  });
  if (discovery.contentTypes.length === 0) errors.push(`${label} has no discovery content type`);
  if (discovery.studyLocales.length === 0) errors.push(`${label} has no discovery locale`);
  if (discovery.audiences.length === 0) errors.push(`${label} has no discovery audience`);
  const alignment = discovery.alignment;
  if (alignment.type === 'surah') {
    if (!pkg.surahs.some(surah => surah.surahNumber === alignment.surahNumber)) {
      errors.push(`${label} discovery alignment references unavailable Surah`);
    }
    return;
  }
  if (alignment.type === 'ayah_range') {
    validateDiscoveryRange(label, alignment.range, pkg, errors);
    return;
  }
  if (alignment.type === 'custom_ranges') {
    if (alignment.ranges.length === 0) errors.push(`${label} discovery alignment has no custom ranges`);
    alignment.ranges.forEach(range => validateDiscoveryRange(label, range, pkg, errors));
    return;
  }
  if (!pkg.divisions.some(division => division.kind === alignment.type && division.number === alignment.number)) {
    errors.push(`${label} discovery alignment references unavailable ${divisionLabel(alignment.type)} ${alignment.number}`);
  }
}

function validateDiscoveryRange(label: string, range: { start: AyahRef; end: AyahRef }, pkg: ContentPackage, errors: string[]): void {
  if (comparePositions(range.start, range.end) > 0) {
    errors.push(`${label} discovery alignment has a reversed range`);
    return;
  }
  validateAyahRef(`${label} discovery range start`, range.start, pkg, errors);
  validateAyahRef(`${label} discovery range end`, range.end, pkg, errors);
}

function validateStructureDivision(
  label: string,
  ayahRef: AyahRef,
  kind: QuranDivision['kind'],
  number: number,
  pkg: ContentPackage,
  errors: string[]
): void {
  const division = pkg.divisions.find(candidate => candidate.kind === kind && candidate.number === number);
  if (!division) {
    errors.push(`${label} references missing ${divisionLabel(kind)} ${number}`);
    return;
  }
  if (comparePositions(ayahRef, division.range.start) < 0 || comparePositions(ayahRef, division.range.end) > 0) {
    errors.push(`${label} falls outside ${divisionLabel(kind)} ${number} range`);
  }
}

function divisionLabel(kind: QuranDivision['kind']): string {
  if (kind === 'juz') return 'Juz';
  if (kind === 'hizb') return 'Hizb';
  if (kind === 'rub_el_hizb') return 'Rub';
  return 'Thumun';
}

function validateBoundedNumber(label: string, value: number, maximum: number, errors: string[]): void {
  if (!Number.isInteger(value) || value < 1 || value > maximum) errors.push(`${label} must be between 1 and ${maximum}`);
}

function isBlockAllowedInStep(kind: ReturnType<typeof getLevelStepKind>, blockType: Level['steps'][number]['blocks'][number]['type']): boolean {
  if (blockType === 'source_locked') return kind === 'context' || kind === 'read' || kind === 'word_meaning' || kind === 'tafsir' || kind === 'summary';
  if (kind === 'surah_introduction') return blockType === 'surah_overview' || blockType === 'context' || blockType === 'media';
  if (kind === 'context') return blockType === 'context' || blockType === 'media';
  if (kind === 'read') return blockType === 'quran_passage' || blockType === 'ayah_ref' || blockType === 'audio' || blockType === 'media';
  if (kind === 'translation') return blockType === 'translation';
  if (kind === 'word_meaning') return blockType === 'word_meaning' || blockType === 'word_explorer';
  if (kind === 'tafsir') return blockType === 'tafsir_ref';
  if (kind === 'memorize' || kind === 'memory_practice') return blockType === 'activity';
  if (kind === 'understanding_practice') return blockType === 'activity' || blockType === 'question';
  return blockType === 'summary' || blockType === 'media';
}

function validateQuestion(label: string, block: Extract<Level['steps'][number]['blocks'][number], { type: 'question' }>, errors: string[]): void {
  if (block.questionType === 'multiple-choice') {
    if (block.options.length < 2) errors.push(`${label} needs at least two options`);
    if (!Number.isInteger(block.correctAnswer) || block.correctAnswer < 0 || block.correctAnswer >= block.options.length) errors.push(`${label} has invalid correctAnswer index`);
  }
  if (block.questionType === 'true-false' && block.correctAnswer !== 0 && block.correctAnswer !== 1) errors.push(`${label} true-false answer must be 0 or 1`);
  if (block.questionType === 'fill-blank' && !block.blankText.includes('___')) errors.push(`${label} blankText must contain ___`);
  if (block.questionType === 'match') {
    if (block.matchPairs.length < 2) errors.push(`${label} needs at least two match pairs`);
    validateUniqueIds(`match pair in ${label}`, block.matchPairs.map(pair => pair.id), errors);
    validateUniqueIds(`match meaning in ${label}`, block.matchPairs.map(pair => pair.meaning), errors);
  }
}

function validateBlockAyahRef(label: string, ref: AyahRef, level: Level, pkg: ContentPackage, errors: string[]): void {
  validateAyahRef(label, ref, pkg, errors);
  if (!level.ayahRefs.some(candidate => sameRef(candidate, ref))) errors.push(`${label} references ayah outside level.ayahRefs: ${refKey(ref)}`);
}

function validateAyahRef(label: string, ref: AyahRef, pkg: ContentPackage, errors: string[]): void {
  if (!findAyah(pkg, ref)) errors.push(`${label} references missing ayah ${refKey(ref)}`);
}

function validateSourceIds(label: string, sourceIds: string[], pkg: ContentPackage, errors: string[]): void {
  if (sourceIds.length === 0) errors.push(`${label} has no source IDs`);
  sourceIds.forEach(sourceId => {
    if (!pkg.sources.some(source => source.id === sourceId)) errors.push(`${label} references unknown source "${sourceId}"`);
  });
}

function validateReviewStatus(
  label: string,
  status: ReviewerStatus,
  mode: ValidationMode,
  errors: string[],
  warnings: string[]
): void {
  if (status === 'approved') return;
  const message = `${label} reviewerStatus is "${status}"`;
  if (mode === 'production') errors.push(message);
  else warnings.push(message);
}

function validateUniqueIds(kind: string, ids: string[], errors: string[]): void {
  const seen = new Set<string>();
  ids.forEach(id => {
    if (!id) errors.push(`Missing ${kind} id`);
    if (seen.has(id)) errors.push(`Duplicate ${kind} id "${id}"`);
    seen.add(id);
  });
}

function findAyah(pkg: ContentPackage, ref: AyahRef): AyahRecord | undefined {
  return pkg.ayat.find(ayah => ayah.editionId === defaultEditionId(pkg) && sameRef(ayah.ref, ref));
}

function defaultEditionId(pkg: ContentPackage): QuranEditionId | undefined {
  return pkg.editions[0]?.id;
}

function sameRef(a: AyahRef, b: AyahRef): boolean {
  return a.surahNumber === b.surahNumber && a.ayahNumber === b.ayahNumber;
}

function refKey(ref: AyahRef): string {
  return `${ref.surahNumber}:${ref.ayahNumber}`;
}

function comparePositions(a: AyahRef & { wordIndex?: number }, b: AyahRef & { wordIndex?: number }): number {
  return a.surahNumber - b.surahNumber || a.ayahNumber - b.ayahNumber || (a.wordIndex ?? 0) - (b.wordIndex ?? 0);
}
