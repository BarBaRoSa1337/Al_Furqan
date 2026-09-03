import type { QuranSearchResult } from '../../../packages/api-contracts/src';
import type { AuthoredSurahSummary, ContentRepository } from '../../types/content';

export function resolveRoadmapSearchTarget(
  result: QuranSearchResult,
  authoredSurahs: readonly AuthoredSurahSummary[],
  repo: Pick<ContentRepository, 'listAyahRefsInDivision'>,
): string | undefined {
  if (result.kind === 'surah' && result.surahNumber) {
    const authored = authoredSurahs.find(item => item.surah.surahNumber === result.surahNumber);
    return authored ? `/roadmap?focusSurah=${encodeURIComponent(authored.surah.id)}` : undefined;
  }
  if (result.kind === 'ayah' && result.surahNumber && result.ayahNumber) {
    return ayahTarget(authoredSurahs, result.surahNumber, result.ayahNumber);
  }
  if (result.kind === 'hizb' || result.kind === 'juz') {
    const number = Number(result.key);
    if (!Number.isInteger(number)) return undefined;
    const authoredNumbers = new Set(authoredSurahs.map(item => item.surah.surahNumber));
    const first = repo.listAyahRefsInDivision(result.kind, number, 'hafs-an-asim').find(ref => authoredNumbers.has(ref.surahNumber));
    return first ? ayahTarget(authoredSurahs, first.surahNumber, first.ayahNumber) : undefined;
  }
  return undefined;
}

function ayahTarget(authoredSurahs: readonly AuthoredSurahSummary[], surahNumber: number, ayahNumber: number): string | undefined {
  const authored = authoredSurahs.find(item => item.surah.surahNumber === surahNumber);
  if (!authored || ayahNumber < 1 || ayahNumber > authored.surah.ayahCount) return undefined;
  return `/surah/${encodeURIComponent(authored.surah.id)}?focusAyah=${ayahNumber}`;
}
