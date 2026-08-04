import type { AuthoredSurahSummary } from '../../types/content';

export type SurahRoadmapState = 'completed' | 'current' | 'available' | 'future';

export type SurahIllustrationKey =
  | 'elephant'
  | 'caravan'
  | 'kindness'
  | 'water'
  | 'arches'
  | 'gateway'
  | 'fibre'
  | 'medallion'
  | 'dawn'
  | 'shield'
  | 'quran';

export interface SurahRoadmapItem {
  id: string;
  surahNumber: number;
  arabicName: string;
  englishName: string;
  transliteratedName: string;
  ayahCount: number;
  revelationType: 'Makki' | 'Madani';
  state: SurahRoadmapState;
  illustrationKey: SurahIllustrationKey;
  completedLessons: number;
  totalLessons: number;
  progress: number;
}

const ILLUSTRATIONS: Partial<Record<number, SurahIllustrationKey>> = {
  105: 'elephant',
  106: 'caravan',
  107: 'kindness',
  108: 'water',
  109: 'arches',
  110: 'gateway',
  111: 'fibre',
  112: 'medallion',
  113: 'dawn',
  114: 'shield',
};

export function buildSurahRoadmapItems(
  authoredSurahs: readonly AuthoredSurahSummary[],
  completedLevelIds: readonly string[],
  activeLevelId?: string,
): SurahRoadmapItem[] {
  const completedIds = new Set(completedLevelIds);
  const activeSurahIndex = resolveActiveSurahIndex(authoredSurahs, completedIds, activeLevelId);

  return authoredSurahs.map((authored, index) => {
    const completedLessons = authored.levels.filter(level => completedIds.has(level.id)).length;
    const totalLessons = authored.levels.length;
    const state = resolveState(index, activeSurahIndex, completedLessons, totalLessons);
    return {
      id: authored.surah.id,
      surahNumber: authored.surah.surahNumber,
      arabicName: authored.surah.arabicName,
      englishName: authored.surah.englishName,
      transliteratedName: authored.surah.transliteratedName,
      ayahCount: authored.surah.ayahCount,
      revelationType: authored.surah.revelationPlace === 'makkah' ? 'Makki' : 'Madani',
      state,
      illustrationKey: ILLUSTRATIONS[authored.surah.surahNumber] ?? 'quran',
      completedLessons,
      totalLessons,
      progress: totalLessons > 0 ? completedLessons / totalLessons : 0,
    };
  });
}

function resolveActiveSurahIndex(
  authoredSurahs: readonly AuthoredSurahSummary[],
  completedIds: ReadonlySet<string>,
  activeLevelId?: string,
): number {
  const explicit = activeLevelId
    ? authoredSurahs.findIndex(item => item.levels.some(level => level.id === activeLevelId))
    : -1;
  if (explicit >= 0) return explicit;
  return authoredSurahs.findIndex(item => item.levels.some(level => !completedIds.has(level.id)));
}

function resolveState(
  index: number,
  activeIndex: number,
  completedLessons: number,
  totalLessons: number,
): SurahRoadmapState {
  if (totalLessons > 0 && completedLessons === totalLessons) return 'completed';
  if (index === activeIndex || activeIndex < 0) return 'current';
  if (completedLessons > 0 || index < activeIndex || index === activeIndex + 1) return 'available';
  return 'future';
}
