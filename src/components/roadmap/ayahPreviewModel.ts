import type { ContentRepository, AuthoredSurahSummary, SummaryLevelBlock } from '../../types/content';
import type { AyahNumberRoadmapItem } from './ayahRoadmapModel';

export interface AyahPreviewData {
  ayahNumber: number;
  arabicText: string;
  translation?: string;
  shortMeaning?: string;
  targetLevelId: string;
}

export function buildAyahPreviewData(
  repo: ContentRepository,
  authored: AuthoredSurahSummary,
  item: AyahNumberRoadmapItem,
  locale: string,
): AyahPreviewData | undefined {
  const ayah = repo.getAyahByRef(
    { surahNumber: authored.surah.surahNumber, ayahNumber: item.ayahNumber },
    'hafs-an-asim',
    { activePackageIds: [authored.packageId], editionId: 'hafs-an-asim', studyLocale: locale },
  );
  if (!ayah) return undefined;
  const translation = ayah.translations.find(entry => entry.locale === locale)?.text;
  const level = authored.levels.find(candidate => candidate.id === item.targetLevelId);
  const summary = level?.steps.flatMap(step => step.blocks).find((block): block is SummaryLevelBlock => (
    block.type === 'summary'
    && block.variant === 'verified_recap'
    && (!block.locale || block.locale === locale)
    && block.ayahRange?.start.surahNumber === authored.surah.surahNumber
    && block.ayahRange.start.ayahNumber === item.ayahNumber
    && block.ayahRange.end.surahNumber === authored.surah.surahNumber
    && block.ayahRange.end.ayahNumber === item.ayahNumber
  ));
  return {
    ayahNumber: item.ayahNumber,
    arabicText: ayah.arabicText.text,
    ...(translation ? { translation } : {}),
    ...(summary?.points[0] ? { shortMeaning: summary.points[0] } : {}),
    targetLevelId: item.targetLevelId,
  };
}
