import type { AuthoredSurahSummary, SurahLesson, SurahLessonKind } from '../../types/content';
import type { RoadmapState } from './surahRoadmapModel';

export type RoadmapMilestoneKind = 'intro' | 'context' | 'checkpoint' | 'final_review';

interface AyahRoadmapItemBase { id: string; state: RoadmapState; targetLevelId: string; }
export interface AyahNumberRoadmapItem extends AyahRoadmapItemBase { kind: 'ayah'; ayahNumber: number; }
export interface MilestoneRoadmapItem extends AyahRoadmapItemBase { kind: 'milestone'; milestoneKind: RoadmapMilestoneKind; }
export type AyahRoadmapItem = AyahNumberRoadmapItem | MilestoneRoadmapItem;
export interface AyahRoadmapModel { items: AyahRoadmapItem[]; }

export function buildAyahRoadmapModel(authored: AuthoredSurahSummary, completedLevelIds: readonly string[]): AyahRoadmapModel {
  const completed = new Set(completedLevelIds);
  const activeLesson = authored.curriculum.lessons.find(lesson => !completed.has(lesson.levelId));
  const items = authored.curriculum.lessons.flatMap((lesson): AyahRoadmapItem[] => {
    const state: RoadmapState = completed.has(lesson.levelId) ? 'completed' : lesson.levelId === activeLesson?.levelId ? 'current' : 'upcoming';
    const milestoneKind = toMilestoneKind(lesson.kind);
    if (milestoneKind) return [{ id: `milestone:${lesson.levelId}`, kind: 'milestone', milestoneKind, state, targetLevelId: lesson.levelId }];
    return ayahItems(lesson, authored.surah.ayahCount, state);
  });
  return { items };
}

export function findAyahRoadmapIndex(items: readonly AyahRoadmapItem[], ayahNumber: number): number {
  return items.findIndex(item => item.kind === 'ayah' && item.ayahNumber === ayahNumber);
}

function ayahItems(lesson: SurahLesson, ayahCount: number, state: RoadmapState): AyahRoadmapItem[] {
  const start = lesson.ayahRange?.start.ayahNumber;
  const end = lesson.ayahRange?.end.ayahNumber ?? start;
  if (!start || !end) return [];
  const boundedStart = Math.min(Math.max(start, 1), ayahCount);
  const boundedEnd = Math.min(Math.max(end, boundedStart), ayahCount);
  return Array.from({ length: boundedEnd - boundedStart + 1 }, (_, index) => {
    const ayahNumber = boundedStart + index;
    return { id: `${lesson.levelId}:ayah:${ayahNumber}`, kind: 'ayah' as const, ayahNumber, state, targetLevelId: lesson.levelId };
  });
}

function toMilestoneKind(kind: SurahLessonKind): RoadmapMilestoneKind | undefined {
  if (kind === 'introduction') return 'intro';
  if (kind === 'context_section') return 'context';
  if (kind === 'segment_review') return 'checkpoint';
  if (kind === 'final_review') return 'final_review';
  return undefined;
}
