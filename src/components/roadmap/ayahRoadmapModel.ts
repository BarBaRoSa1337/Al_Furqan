import type { AuthoredSurahSummary, SurahLesson } from '../../types/content';
import type { RoadmapState } from './surahRoadmapModel';

export interface AyahRoadmapItem {
  id: string;
  ayahNumber: number;
  state: RoadmapState;
  targetLevelId: string;
}

export interface AyahRoadmapModel {
  header: { state: RoadmapState; targetLevelId?: string };
  items: AyahRoadmapItem[];
}

export function buildAyahRoadmapModel(
  authored: AuthoredSurahSummary,
  completedLevelIds: readonly string[],
): AyahRoadmapModel {
  const completed = new Set(completedLevelIds);
  const lessons = authored.curriculum.lessons;
  const activeLesson = lessons.find(lesson => !completed.has(lesson.levelId));
  const intro = lessons.find(lesson => lesson.kind === 'introduction');
  const owners = new Map<number, SurahLesson>();

  lessons.forEach(lesson => {
    if (lesson.kind !== 'ayah' && lesson.kind !== 'ayah_range') return;
    const start = lesson.ayahRange?.start.ayahNumber;
    const end = lesson.ayahRange?.end.ayahNumber ?? start;
    if (!start || !end) return;
    for (let ayahNumber = start; ayahNumber <= end; ayahNumber += 1) owners.set(ayahNumber, lesson);
  });

  const anchor = activeLesson && activeLesson.kind !== 'introduction' && activeLesson.kind !== 'ayah' && activeLesson.kind !== 'ayah_range'
    ? anchorAyah(activeLesson, authored.surah.ayahCount)
    : undefined;

  const items = Array.from({ length: authored.surah.ayahCount }, (_, index): AyahRoadmapItem => {
    const ayahNumber = index + 1;
    const owner = owners.get(ayahNumber);
    const activeOwner = owner?.levelId === activeLesson?.levelId;
    const anchored = anchor === ayahNumber;
    return {
      id: owner ? `${owner.levelId}:ayah:${ayahNumber}` : `${authored.surah.id}:ayah:${ayahNumber}`,
      ayahNumber,
      state: activeOwner || anchored ? 'current' : owner && completed.has(owner.levelId) ? 'completed' : 'upcoming',
      targetLevelId: anchored ? activeLesson!.levelId : owner?.levelId ?? activeLesson?.levelId ?? authored.levels[0]?.id ?? '',
    };
  });

  return {
    header: {
      state: intro && activeLesson?.levelId === intro.levelId
        ? 'current'
        : intro && completed.has(intro.levelId)
          ? 'completed'
          : 'upcoming',
      targetLevelId: intro?.levelId,
    },
    items,
  };
}

function anchorAyah(lesson: SurahLesson, ayahCount: number): number {
  if (lesson.kind === 'context_section') return clampAyah(lesson.ayahRange?.start.ayahNumber ?? 1, ayahCount);
  return clampAyah(lesson.ayahRange?.end.ayahNumber ?? ayahCount, ayahCount);
}

function clampAyah(value: number, ayahCount: number): number {
  return Math.min(Math.max(value, 1), Math.max(ayahCount, 1));
}
