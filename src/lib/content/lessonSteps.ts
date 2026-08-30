import type { ContentRepository, Level, LevelBlock, LevelStep } from '../../types/content';

/** Core steps are the focused daily loop. Optional interactive steps remain available as extra practice. */
export function getCoreLevelSteps(level: Pick<Level, 'steps'>): LevelStep[] {
  return level.steps.filter(step => step.required !== false || !isInteractiveStep(step));
}

export function getLocalizedCoreLevelSteps(
  level: Pick<Level, 'steps'>,
  repo: ContentRepository,
  contentLocale: string,
): LevelStep[] {
  return getCoreLevelSteps(level).filter(step => step.blocks.some(block => blockHasLocaleContent(block, repo, contentLocale)));
}

export function getPracticeLevelSteps(level: Pick<Level, 'steps'>): LevelStep[] {
  return level.steps.filter(step => step.required === false && isInteractiveStep(step));
}

export function hasPracticeSteps(level: Pick<Level, 'steps'>): boolean {
  return getPracticeLevelSteps(level).length > 0;
}

function isInteractiveStep(step: LevelStep): boolean {
  return step.blocks.some(block => block.type === 'activity' || block.type === 'question');
}

function blockHasLocaleContent(block: LevelBlock, repo: ContentRepository, locale: string): boolean {
  if (block.type === 'source_locked') return false;
  if (block.type === 'tafsir_ref') {
    return repo.getAyahByRef(block.ayahRef)?.tafsirEntries.some(entry => entry.locale === locale) ?? false;
  }
  if (block.type === 'translation') {
    return block.locale === locale && repo.getAyatByRefs(block.ayahRefs)
      .some(ayah => ayah.translations.some(entry => entry.locale === locale));
  }
  if (block.type === 'word_explorer') {
    return block.ayahRefs.some(ref => repo.getAyahByRef(ref)?.wordMeanings?.some(word => (
      word.locale === locale || (!word.locale && repo.getSourceById(word.sourceId)?.language === locale)
    )));
  }
  if (block.type === 'word_meaning') {
    const ids = new Set(block.wordMeaningIds);
    return repo.ayat.some(ayah => ayah.wordMeanings?.some(word => ids.has(word.id) && (
      word.locale === locale || (!word.locale && repo.getSourceById(word.sourceId)?.language === locale)
    )));
  }
  return true;
}
