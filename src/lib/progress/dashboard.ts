import type { ContentRepository, Level } from '../../types/content';
import type { ActivityReviewState, CompletionReceipt } from '../../types/progress';

export interface QuranLocationSummary {
  surahName: string;
  surahNumber: number;
  ayahLabel: string;
  juzNumber?: number;
  hizbNumber?: number;
  rubNumber?: number;
  pageNumber?: number;
}

export type HomePrimaryAction =
  | { kind: 'review'; href: '/review' }
  | { kind: 'lesson'; href: `/lesson/${string}` }
  | { kind: 'practice'; href: `/practice/${string}` }
  | { kind: 'explore'; href: '/discover' };

export function isDailyGoalComplete(
  receipt: CompletionReceipt | null,
  reviews: readonly ActivityReviewState[],
  now: Date = new Date()
): boolean {
  return Boolean(
    (receipt && isSameLocalDate(receipt.completedAt, now))
    || reviews.some(review => isSameLocalDate(review.lastReviewedAt, now))
  );
}

export function resolveHomePrimaryAction(
  dueReviewCount: number,
  activeLevel: Level | undefined,
  latestCompletedLevel: Level | undefined,
  latestHasPractice: boolean
): HomePrimaryAction {
  if (dueReviewCount > 0) return { kind: 'review', href: '/review' };
  if (activeLevel) return { kind: 'lesson', href: `/lesson/${activeLevel.id}` };
  if (latestCompletedLevel && latestHasPractice) {
    return { kind: 'practice', href: `/practice/${latestCompletedLevel.id}` };
  }
  return { kind: 'explore', href: '/discover' };
}

export function resolveQuranLocation(
  repo: Pick<ContentRepository, 'getSurahById' | 'getAyahStructure'>,
  level: Level | undefined
): QuranLocationSummary | undefined {
  const firstRef = level?.ayahRefs[0];
  if (!level || !firstRef) return undefined;
  const lastRef = level.ayahRefs.at(-1) ?? firstRef;
  const surah = repo.getSurahById(level.surahId);
  const structure = repo.getAyahStructure(firstRef);
  const sameSurah = firstRef.surahNumber === lastRef.surahNumber;
  const ayahLabel = sameSurah && firstRef.ayahNumber !== lastRef.ayahNumber
    ? `${firstRef.ayahNumber}-${lastRef.ayahNumber}`
    : String(firstRef.ayahNumber);

  return {
    surahName: surah?.transliteratedName ?? `Surah ${firstRef.surahNumber}`,
    surahNumber: firstRef.surahNumber,
    ayahLabel,
    juzNumber: structure?.juzNumber,
    hizbNumber: structure?.hizbNumber,
    rubNumber: structure?.rubElHizbNumber,
    pageNumber: structure?.pageNumber,
  };
}

function isSameLocalDate(value: string, now: Date): boolean {
  const candidate = new Date(value);
  return candidate.getFullYear() === now.getFullYear()
    && candidate.getMonth() === now.getMonth()
    && candidate.getDate() === now.getDate();
}
