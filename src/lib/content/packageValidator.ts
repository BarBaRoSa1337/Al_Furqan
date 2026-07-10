// Package Validator — validates content package structure

import { AyahRecord, ContentPackage, Lesson, LessonBlock, Level, SurahRecord } from '../../types/content';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validatePackage(pkg: ContentPackage): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!pkg.id) errors.push('Package missing id');
  if (!pkg.version) errors.push('Package missing version');
  if (!pkg.title) errors.push('Package missing title');
  if (!pkg.sources || pkg.sources.length === 0) errors.push('Package has no sources defined');
  if (!pkg.surahs || pkg.surahs.length === 0) errors.push('Package has no canonical surahs');
  if (!pkg.ayat || pkg.ayat.length === 0) errors.push('Package has no canonical ayat');
  if (!pkg.learningPaths || pkg.learningPaths.length === 0) errors.push('Package has no learning paths');
  if (!pkg.levels || pkg.levels.length === 0) errors.push('Package has no levels');

  if (pkg.lessons && pkg.metadata.totalLessons !== pkg.lessons.length) {
    warnings.push(
      `metadata.totalLessons (${pkg.metadata.totalLessons}) does not match actual lesson count (${pkg.lessons.length})`
    );
  }

  pkg.lessons?.forEach(lesson => {
    const lessonResult = validateLesson(lesson, pkg.id);
    errors.push(...lessonResult.errors);
    warnings.push(...lessonResult.warnings);
  });

  pkg.surahs?.forEach(surah => {
    const surahResult = validateSurah(surah, pkg);
    errors.push(...surahResult.errors);
    warnings.push(...surahResult.warnings);
  });

  pkg.ayat?.forEach(ayah => {
    const ayahResult = validateAyahRecord(ayah, pkg);
    errors.push(...ayahResult.errors);
    warnings.push(...ayahResult.warnings);
  });

  validateUniqueIds('surah', pkg.surahs?.map(surah => surah.id) ?? [], errors);
  validateUniqueIds('ayah', pkg.ayat?.map(ayah => ayah.id) ?? [], errors);
  validateUniqueIds('learning path', pkg.learningPaths?.map(path => path.id) ?? [], errors);
  validateUniqueIds('level', pkg.levels?.map(level => level.id) ?? [], errors);

  pkg.levels?.forEach(level => {
    const levelResult = validateLevel(level, pkg);
    errors.push(...levelResult.errors);
    warnings.push(...levelResult.warnings);
  });

  pkg.learningPaths?.forEach(path => {
    path.levelIds.forEach(levelId => {
      if (!pkg.levels?.some(level => level.id === levelId)) {
        errors.push(`LearningPath "${path.id}" references missing level "${levelId}"`);
      }
    });
    path.surahIds.forEach(surahId => {
      if (!pkg.surahs?.some(surah => surah.id === surahId)) {
        errors.push(`LearningPath "${path.id}" references missing surah "${surahId}"`);
      }
    });
    path.sourceMetadata.sourceIds.forEach(sourceId => {
      if (!hasSource(pkg, sourceId)) {
        errors.push(`LearningPath "${path.id}" references unknown source "${sourceId}"`);
      }
    });
    path.levelIds.forEach(levelId => {
      const level = pkg.levels?.find(candidate => candidate.id === levelId);
      if (level && level.pathId !== path.id) {
        errors.push(`LearningPath "${path.id}" includes level "${levelId}" with pathId "${level.pathId}"`);
      }
    });
  });

  pkg.sources.forEach(source => {
    if (!source.reviewerStatus) {
      warnings.push(`Source "${source.id}" is missing reviewerStatus`);
    }
  });

  return { valid: errors.length === 0, errors, warnings };
}

function validateSurah(surah: SurahRecord, pkg: ContentPackage): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const prefix = `Surah "${surah.id}":`;

  if (!surah.id) errors.push(`${prefix} missing id`);
  if (!surah.surahNumber) errors.push(`${prefix} missing surahNumber`);
  if (!surah.ayahCount) errors.push(`${prefix} missing ayahCount`);
  if (!surah.sourceMetadata?.quranTextSourceId) {
    errors.push(`${prefix} missing quranTextSourceId`);
  } else if (!hasSource(pkg, surah.sourceMetadata.quranTextSourceId)) {
    errors.push(`${prefix} quranTextSourceId references unknown source "${surah.sourceMetadata.quranTextSourceId}"`);
  }
  surah.sourceMetadata?.translationSourceIds.forEach(sourceId => {
    if (!hasSource(pkg, sourceId)) errors.push(`${prefix} translationSourceIds references unknown source "${sourceId}"`);
  });
  surah.sourceMetadata?.tafsirSourceIds.forEach(sourceId => {
    if (!hasSource(pkg, sourceId)) errors.push(`${prefix} tafsirSourceIds references unknown source "${sourceId}"`);
  });
  if (surah.sourceMetadata?.reviewerStatus !== 'approved') {
    warnings.push(`${prefix} sourceMetadata reviewerStatus is "${surah.sourceMetadata?.reviewerStatus}"`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateAyahRecord(ayah: AyahRecord, pkg: ContentPackage): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const prefix = `Ayah "${ayah.id}":`;

  if (!ayah.id) errors.push(`${prefix} missing id`);
  if (!ayah.ref?.surahNumber || !ayah.ref?.ayahNumber) errors.push(`${prefix} missing ref`);
  if (!ayah.arabicText?.text) errors.push(`${prefix} missing arabic text`);
  if (!ayah.arabicText?.sourceId) errors.push(`${prefix} missing arabic sourceId`);
  if (ayah.arabicText?.sourceId && !hasSource(pkg, ayah.arabicText.sourceId)) {
    errors.push(`${prefix} arabic sourceId references unknown source "${ayah.arabicText.sourceId}"`);
  }
  if (!ayah.translations || ayah.translations.length === 0) {
    errors.push(`${prefix} missing translations`);
  }
  ayah.translations?.forEach(translation => {
    if (!translation.sourceId) errors.push(`${prefix} translation "${translation.id}" missing sourceId`);
    if (translation.sourceId && !hasSource(pkg, translation.sourceId)) {
      errors.push(`${prefix} translation "${translation.id}" references unknown source "${translation.sourceId}"`);
    }
    if (!translation.reviewerStatus) errors.push(`${prefix} translation "${translation.id}" missing reviewerStatus`);
  });
  ayah.tafsirEntries?.forEach(entry => {
    if (!entry.sourceId) errors.push(`${prefix} tafsir "${entry.id}" missing sourceId`);
    if (entry.sourceId && !hasSource(pkg, entry.sourceId)) {
      errors.push(`${prefix} tafsir "${entry.id}" references unknown source "${entry.sourceId}"`);
    }
    if (!entry.reviewerStatus) errors.push(`${prefix} tafsir "${entry.id}" missing reviewerStatus`);
    if (entry.reviewerStatus !== 'approved') {
      warnings.push(`${prefix} tafsir "${entry.id}" reviewerStatus is "${entry.reviewerStatus}"`);
    }
  });

  return { valid: errors.length === 0, errors, warnings };
}

function validateLevel(level: Level, pkg: ContentPackage): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const prefix = `Level "${level.id}":`;
  const ayat = pkg.ayat ?? [];

  if (!level.id) errors.push(`${prefix} missing id`);
  if (!level.pathId) errors.push(`${prefix} missing pathId`);
  if (!level.surahId) errors.push(`${prefix} missing surahId`);
  if (!level.difficulty) errors.push(`${prefix} missing difficulty`);
  if (!level.steps || level.steps.length === 0) errors.push(`${prefix} has no steps`);
  if (!pkg.surahs?.some(surah => surah.id === level.surahId)) {
    errors.push(`${prefix} references missing surah "${level.surahId}"`);
  }

  level.ayahRefs.forEach(ref => {
    if (!findAyah(ayat, ref)) {
      errors.push(`${prefix} references missing ayah ${ref.surahNumber}:${ref.ayahNumber}`);
    }
  });

  level.steps.forEach(step => {
    if (!step.id) errors.push(`${prefix} has step missing id`);
    if (!step.blocks || step.blocks.length === 0) errors.push(`${prefix} step "${step.id}" has no blocks`);
    step.blocks.forEach(block => {
      if (!block.id) errors.push(`${prefix} step "${step.id}" has block missing id`);
      if ((block.type === 'ayah_ref' || block.type === 'tafsir_ref') && !findAyah(ayat, block.ayahRef)) {
        errors.push(`${prefix} block "${block.id}" references missing ayah`);
      }
      if (block.type === 'tafsir_ref') {
        const ayah = findAyah(ayat, block.ayahRef);
        if (!ayah?.tafsirEntries.some(entry => entry.id === block.tafsirEntryId)) {
          errors.push(`${prefix} block "${block.id}" references missing tafsir entry "${block.tafsirEntryId}"`);
        }
      }
      if (block.type === 'question') {
        if ((block.questionType === 'multiple-choice' || block.questionType === 'true-false') && (!block.options || block.options.length < 2)) {
          errors.push(`${prefix} question block "${block.id}" needs at least two options`);
        }
        if (typeof block.correctAnswer === 'number' && (!block.options || block.correctAnswer < 0 || block.correctAnswer >= block.options.length)) {
          errors.push(`${prefix} question block "${block.id}" has an invalid correctAnswer index`);
        }
        if (block.questionType === 'fill-blank' && !block.blankText?.includes('___')) {
          errors.push(`${prefix} fill-blank block "${block.id}" needs blankText containing ___`);
        }
        if (block.questionType === 'match' && (!block.matchPairs || block.matchPairs.length < 2)) {
          errors.push(`${prefix} match block "${block.id}" needs at least two matchPairs`);
        }
      }
      if ('reviewerStatus' in block && !block.reviewerStatus) {
        errors.push(`${prefix} block "${block.id}" missing reviewerStatus`);
      }
      if ('sourceIds' in block && block.sourceIds.length === 0) {
        errors.push(`${prefix} block "${block.id}" missing sourceIds`);
      }
      if ('sourceIds' in block) {
        block.sourceIds.forEach(sourceId => {
          if (!hasSource(pkg, sourceId)) {
            errors.push(`${prefix} block "${block.id}" references unknown source "${sourceId}"`);
          }
        });
      }
    });
  });

  return { valid: errors.length === 0, errors, warnings };
}

function validateUniqueIds(kind: string, ids: string[], errors: string[]): void {
  const seen = new Set<string>();
  ids.forEach(id => {
    if (seen.has(id)) errors.push(`Duplicate ${kind} id "${id}"`);
    seen.add(id);
  });
}

function findAyah(ayat: AyahRecord[], ref: { surahNumber: number; ayahNumber: number }): AyahRecord | undefined {
  return ayat.find(ayah => ayah.ref.surahNumber === ref.surahNumber && ayah.ref.ayahNumber === ref.ayahNumber);
}

function hasSource(pkg: ContentPackage, sourceId: string): boolean {
  return pkg.sources.some(source => source.id === sourceId);
}

function validateLesson(lesson: Lesson, packageId: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const prefix = `Lesson "${lesson.id}":`;

  if (!lesson.id) errors.push(`${prefix} missing id`);
  if (lesson.packageId !== packageId) errors.push(`${prefix} packageId mismatch`);
  if (!lesson.title) errors.push(`${prefix} missing title`);
  if (!lesson.blocks || lesson.blocks.length === 0) errors.push(`${prefix} has no blocks`);
  if (!lesson.metadata?.sourceMetadata) {
    errors.push(`${prefix} missing sourceMetadata`);
  } else {
    if (!lesson.metadata.sourceMetadata.quranTextSourceId) {
      errors.push(`${prefix} sourceMetadata missing quranTextSourceId`);
    }
    if (!lesson.metadata.sourceMetadata.translationSourceId) {
      errors.push(`${prefix} sourceMetadata missing translationSourceId`);
    }
    if (!lesson.metadata.sourceMetadata.reviewerStatus) {
      errors.push(`${prefix} sourceMetadata missing reviewerStatus`);
    }
    if (lesson.metadata.sourceMetadata.reviewerStatus !== 'approved') {
      warnings.push(
        `${prefix} content reviewerStatus is "${lesson.metadata.sourceMetadata.reviewerStatus}"`
      );
    }
  }

  lesson.blocks.forEach(block => {
    const blockResult = validateBlock(block, lesson.id);
    errors.push(...blockResult.errors);
    warnings.push(...blockResult.warnings);
  });

  return { valid: errors.length === 0, errors, warnings };
}

function validateBlock(block: LessonBlock, lessonId: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const prefix = `Block "${block.id}" in lesson "${lessonId}":`;

  if (!block.id) errors.push(`${prefix} missing id`);
  if (!block.type) errors.push(`${prefix} missing type`);
  if (block.content === undefined || block.content === null) {
    errors.push(`${prefix} missing content`);
  }

  if (block.type === 'ayah') {
    const content = block.content as {
      quranText?: {
        arabic?: string;
        translation?: string;
        arabicSourceId?: string;
        translationSourceId?: string;
      };
      wordBreakdown?: Array<{ sourceId?: string }>;
    };
    if (!content?.quranText?.arabic) errors.push(`${prefix} ayah block missing arabic text`);
    if (!content?.quranText?.translation) errors.push(`${prefix} ayah block missing translation`);
    if (!content?.quranText?.arabicSourceId) {
      errors.push(`${prefix} ayah block missing arabicSourceId`);
    }
    if (!content?.quranText?.translationSourceId) {
      errors.push(`${prefix} ayah block missing translationSourceId`);
    }
    content.wordBreakdown?.forEach((word, index) => {
      if (!word.sourceId) {
        errors.push(`${prefix} wordBreakdown[${index}] missing sourceId`);
      }
    });
  }

  if (block.type === 'tafsir') {
    const content = block.content as { tafsir?: { text?: string; sourceId?: string } };
    if (!content?.tafsir?.text) errors.push(`${prefix} tafsir block missing text`);
    if (!content?.tafsir?.sourceId) errors.push(`${prefix} tafsir block missing sourceId`);
  }

  return { valid: errors.length === 0, errors, warnings };
}
