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
  WordToken,
} from '../../types/content';
import { RecitationTrack, Reciter } from '../../types/media';
import { validateActivity } from '../activities/activityEngine';
import { getLevelStepKind } from './stepKind';

export type ValidationMode = 'development' | 'production';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validatePackage(
  pkg: ContentPackage,
  options: { mode?: ValidationMode } = {}
): ValidationResult {
  const mode = options.mode ?? 'development';
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!pkg.id) errors.push('Package missing id');
  if (!pkg.version) errors.push('Package missing version');
  if (pkg.schemaVersion !== 1 && pkg.schemaVersion !== 2) errors.push(`Unsupported package schemaVersion "${pkg.schemaVersion}"`);
  if (!pkg.revisionId) errors.push('Package missing revisionId');
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

  validateUniqueIds('source', pkg.sources.map(source => source.id), errors);
  validateUniqueIds('edition', pkg.editions.map(edition => edition.id), errors);
  validateUniqueIds('surah', pkg.surahs.map(surah => surah.id), errors);
  validateUniqueIds('ayah', pkg.ayat.map(ayah => ayah.id), errors);
  validateUniqueIds('ayah ref', pkg.ayat.map(ayah => `${ayah.editionId}:${refKey(ayah.ref)}`), errors);
  validateUniqueIds('word token', pkg.wordTokens.map(token => token.id), errors);
  validateUniqueIds('division', pkg.divisions.map(division => division.id), errors);
  validateUniqueIds('reciter', pkg.reciters.map(reciter => reciter.id), errors);
  validateUniqueIds('recitation track', pkg.recitationTracks.map(track => track.id), errors);
  validateUniqueIds('media asset', pkg.mediaAssets.map(asset => asset.id), errors);
  validateUniqueIds('division key', pkg.divisions.map(division => `${division.editionId}:${division.kind}:${division.number}`), errors);
  validateUniqueIds('learning path', pkg.learningPaths.map(path => path.id), errors);
  validateUniqueIds('level', pkg.levels.map(level => level.id), errors);
  validateUniqueIds('block', pkg.levels.flatMap(level => level.steps.flatMap(step => step.blocks.map(block => block.id))), errors);

  pkg.sources.forEach(source => validateReviewStatus(`Source "${source.id}"`, source.reviewerStatus, mode, errors, warnings));
  pkg.editions.forEach(edition => {
    validateSourceIds(`Edition "${edition.id}"`, [edition.textSourceId], pkg, errors);
    if (!edition.version) errors.push(`Edition "${edition.id}" missing version`);
  });
  pkg.surahs.forEach(surah => validateSurah(surah, pkg, mode, errors, warnings));
  pkg.ayat.forEach(ayah => validateAyah(ayah, pkg, mode, errors, warnings));
  pkg.wordTokens.forEach(token => validateWordToken(token, pkg, errors));
  pkg.divisions.forEach(division => validateDivision(division, pkg, errors));
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
  });
  if (pkg.metadata.defaultLearningPathId && !pkg.learningPaths.some(path => path.id === pkg.metadata.defaultLearningPathId)) {
    errors.push(`metadata.defaultLearningPathId references missing path "${pkg.metadata.defaultLearningPathId}"`);
  }
  pkg.levels.forEach(level => validateLevel(level, pkg, mode, errors, warnings));

  return { valid: errors.length === 0, errors, warnings };
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
  if (actualAyahCount !== surah.ayahCount) errors.push(`${label} declares ${surah.ayahCount} ayat but package contains ${actualAyahCount}`);
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
    validateSourceIds(wordLabel, [entry.sourceId], pkg, errors);
    validateReviewStatus(wordLabel, entry.reviewerStatus, mode, errors, warnings);
    if (!entry.wordTokenId) errors.push(`${wordLabel} missing canonical token reference`);
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
  if (!division.sourceVersion) errors.push(`${label} missing sourceVersion`);
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
  if (!track.license || !/^[a-f0-9]{64}$/i.test(track.checksum)) errors.push(`${label} missing license or has invalid checksum`);
  if (!track.asset.uri) errors.push(`${label} missing asset URI`);
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
  if (pkg.schemaVersion >= 2 && (!level.completionRules?.requireMemoryActivity || !level.completionRules.requireUnderstandingActivity)) errors.push(`${label} schema v2 requires memory and understanding completion rules`);
  validateUniqueIds(`step in ${label}`, level.steps.map(step => step.id), errors);
  validateUniqueIds(`block in ${label}`, level.steps.flatMap(step => step.blocks.map(block => block.id)), errors);
  validateUniqueIds(`ayah ref in ${label}`, level.ayahRefs.map(refKey), errors);
  level.ayahRefs.forEach(ref => validateAyahRef(label, ref, pkg, errors));

  level.unlockRules?.requiresLevelIds?.forEach(requiredId => {
    if (!path?.levelIds.includes(requiredId)) errors.push(`${label} unlock rule references level outside its path: "${requiredId}"`);
  });

  const taughtKnowledgeRefs: string[] = [];
  level.steps.forEach(step => {
    if (pkg.schemaVersion >= 2 && !step.kind) errors.push(`${label} step "${step.id}" missing kind`);
    const stepKind = getLevelStepKind(step);
    if (step.blocks.length === 0) errors.push(`${label} step "${step.id}" has no blocks`);
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
      if (block.type === 'media' && !pkg.mediaAssets.some(asset => asset.id === block.assetId)) errors.push(`${blockLabel} references missing media asset "${block.assetId}"`);
      if (block.type === 'context' || block.type === 'question' || block.type === 'summary') {
        validateSourceIds(blockLabel, block.sourceIds, pkg, errors);
        validateReviewStatus(blockLabel, block.reviewerStatus, mode, errors, warnings);
      }
      if (block.type === 'question') validateQuestion(blockLabel, block, errors);
      if (block.type === 'activity') {
        if (block.id !== block.activity.id) errors.push(`${blockLabel} activity ID must match block ID`);
        validateSourceIds(blockLabel, block.activity.sourceIds, pkg, errors);
        validateReviewStatus(blockLabel, block.activity.reviewerStatus, mode, errors, warnings);
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

function isBlockAllowedInStep(kind: ReturnType<typeof getLevelStepKind>, blockType: Level['steps'][number]['blocks'][number]['type']): boolean {
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
