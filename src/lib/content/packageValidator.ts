import {
  AyahRecord,
  AyahRef,
  ContentPackage,
  Level,
  ReviewerStatus,
  SurahRecord,
} from '../../types/content';

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
  if (!pkg.title) errors.push('Package missing title');
  if (pkg.sources.length === 0) errors.push('Package has no sources');
  if (pkg.surahs.length === 0) errors.push('Package has no canonical surahs');
  if (pkg.ayat.length === 0) errors.push('Package has no canonical ayat');
  if (pkg.learningPaths.length === 0) errors.push('Package has no learning paths');
  if (pkg.levels.length === 0) errors.push('Package has no levels');
  if (pkg.metadata.totalLevels !== pkg.levels.length) {
    errors.push(`metadata.totalLevels (${pkg.metadata.totalLevels}) does not match level count (${pkg.levels.length})`);
  }

  validateUniqueIds('source', pkg.sources.map(source => source.id), errors);
  validateUniqueIds('surah', pkg.surahs.map(surah => surah.id), errors);
  validateUniqueIds('ayah', pkg.ayat.map(ayah => ayah.id), errors);
  validateUniqueIds('ayah ref', pkg.ayat.map(ayah => refKey(ayah.ref)), errors);
  validateUniqueIds('learning path', pkg.learningPaths.map(path => path.id), errors);
  validateUniqueIds('level', pkg.levels.map(level => level.id), errors);

  pkg.sources.forEach(source => validateReviewStatus(`Source "${source.id}"`, source.reviewerStatus, mode, errors, warnings));
  pkg.surahs.forEach(surah => validateSurah(surah, pkg, mode, errors, warnings));
  pkg.ayat.forEach(ayah => validateAyah(ayah, pkg, mode, errors, warnings));
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
  pkg.levels.forEach(level => validateLevel(level, pkg, mode, errors, warnings));

  return { valid: errors.length === 0, errors, warnings };
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
  if (!ayah.arabicText.text) errors.push(`${label} missing Arabic text`);
  validateSourceIds(label, [ayah.arabicText.sourceId], pkg, errors);
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
  });
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
  validateUniqueIds(`step in ${label}`, level.steps.map(step => step.id), errors);
  validateUniqueIds(`block in ${label}`, level.steps.flatMap(step => step.blocks.map(block => block.id)), errors);
  validateUniqueIds(`ayah ref in ${label}`, level.ayahRefs.map(refKey), errors);
  level.ayahRefs.forEach(ref => validateAyahRef(label, ref, pkg, errors));

  level.unlockRules?.requiresLevelIds?.forEach(requiredId => {
    if (!path?.levelIds.includes(requiredId)) errors.push(`${label} unlock rule references level outside its path: "${requiredId}"`);
  });

  level.steps.forEach(step => {
    if (step.blocks.length === 0) errors.push(`${label} step "${step.id}" has no blocks`);
    step.blocks.forEach(block => {
      const blockLabel = `${label} block "${block.id}"`;
      if (block.type === 'ayah_ref' || block.type === 'tafsir_ref') {
        validateBlockAyahRef(blockLabel, block.ayahRef, level, pkg, errors);
      }
      if (block.type === 'tafsir_ref') {
        const ayah = findAyah(pkg, block.ayahRef);
        if (!ayah?.tafsirEntries.some(entry => entry.id === block.tafsirEntryId)) errors.push(`${blockLabel} references missing tafsir "${block.tafsirEntryId}"`);
      }
      if (block.type === 'word_explorer') {
        if (block.ayahRefs.length === 0) errors.push(`${blockLabel} has no ayah refs`);
        block.ayahRefs.forEach(ref => validateBlockAyahRef(blockLabel, ref, level, pkg, errors));
      }
      if (block.type === 'context' || block.type === 'question' || block.type === 'summary') {
        validateSourceIds(blockLabel, block.sourceIds, pkg, errors);
        validateReviewStatus(blockLabel, block.reviewerStatus, mode, errors, warnings);
      }
      if (block.type === 'question') validateQuestion(blockLabel, block, errors);
    });
  });
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
  return pkg.ayat.find(ayah => sameRef(ayah.ref, ref));
}

function sameRef(a: AyahRef, b: AyahRef): boolean {
  return a.surahNumber === b.surahNumber && a.ayahNumber === b.ayahNumber;
}

function refKey(ref: AyahRef): string {
  return `${ref.surahNumber}:${ref.ayahNumber}`;
}
