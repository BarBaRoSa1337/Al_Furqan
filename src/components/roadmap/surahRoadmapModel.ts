import type { AuthoredSurahSummary } from '../../types/content';

export type RoadmapState = 'completed' | 'current' | 'upcoming';

export interface SurahRoadmapItem {
  id: string;
  arabicName: string;
  /** Latin-script Surah name. Never use SurahRecord.englishName here. */
  englishName: string;
  state: RoadmapState;
  /** Retained for progress logic and future package consumers; never rendered. */
  progress: number;
}

export function buildSurahRoadmapItems(
  authoredSurahs: readonly AuthoredSurahSummary[],
  completedLevelIds: readonly string[],
  activeLevelId?: string,
): SurahRoadmapItem[] {
  const completedIds = new Set(completedLevelIds);
  const activeSurahId = authoredSurahs.find(item => item.levels.some(level => level.id === activeLevelId))?.surah.id;

  return authoredSurahs.map(authored => {
    const completedLessons = authored.levels.filter(level => completedIds.has(level.id)).length;
    const totalLessons = authored.levels.length;
    return {
      id: authored.surah.id,
      arabicName: authored.surah.arabicName,
      englishName: authored.surah.transliteratedName,
      state: totalLessons > 0 && completedLessons === totalLessons
        ? 'completed'
        : authored.surah.id === activeSurahId
          ? 'current'
          : 'upcoming',
      progress: totalLessons > 0 ? completedLessons / totalLessons : 0,
    };
  });
}
