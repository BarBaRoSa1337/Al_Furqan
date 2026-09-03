import type { AuthoredSurahSummary } from '../../types/content';

export type RoadmapState = 'completed' | 'current' | 'upcoming';

export interface SurahRoadmapItem {
  id: string;
  arabicName: string;
  /** Locale display label; canonical English meaning is never used here. */
  localizedName: string;
  state: RoadmapState;
  /** Retained for progress logic and future package consumers; never rendered. */
  progress: number;
}

export function buildSurahRoadmapItems(
  authoredSurahs: readonly AuthoredSurahSummary[],
  completedLevelIds: readonly string[],
  activeLevelId?: string,
  resolveLocalizedName: (surah: AuthoredSurahSummary['surah']) => string = surah => surah.transliteratedName,
): SurahRoadmapItem[] {
  const completedIds = new Set(completedLevelIds);
  const activeSurahId = authoredSurahs.find(item => item.levels.some(level => level.id === activeLevelId))?.surah.id;

  return authoredSurahs.map(authored => {
    const completedLessons = authored.levels.filter(level => completedIds.has(level.id)).length;
    const totalLessons = authored.levels.length;
    return {
      id: authored.surah.id,
      arabicName: authored.surah.arabicName,
      localizedName: resolveLocalizedName(authored.surah),
      state: totalLessons > 0 && completedLessons === totalLessons
        ? 'completed'
        : authored.surah.id === activeSurahId
          ? 'current'
          : 'upcoming',
      progress: totalLessons > 0 ? completedLessons / totalLessons : 0,
    };
  });
}

export function resolveSurahRoadmapName(
  surah: AuthoredSurahSummary['surah'],
  locale: string,
  getText: (key: string, locale: string) => string,
): string {
  const key = `roadmap.surah.${surah.id}.displayName`;
  const localized = getText(key, locale).trim();
  return localized && localized !== key ? localized : surah.transliteratedName;
}
