import type { AyahRecord, ContentPackage, SurahCurriculum, SurahLessonKind, WordToken } from '../../types/content';

/**
 * Resolves schema-v1 embedded Arabic to exactly one canonical token in its ayah.
 * Repeated words are intentionally rejected because there is no stable position to infer.
 */
export function resolveLegacyWordTokenId(pkg: ContentPackage, ayah: AyahRecord, arabic: string): string | undefined {
  const matches = ayah.wordTokenIds
    .map(tokenId => pkg.wordTokens.find(token => token.id === tokenId))
    .filter((token): token is WordToken => token?.arabicText === arabic);

  return matches.length === 1 ? matches[0].id : undefined;
}

/** Converts valid schema-v1 word meanings to the canonical schema-v2 representation. */
export function adaptLegacyPackage(pkg: ContentPackage): ContentPackage {
  let changed = false;
  const divisions = pkg.divisions.map(division => {
    if ((division.kind as string) !== 'rub') return division;
    changed = true;
    return { ...division, kind: 'rub_el_hizb' as const };
  });
  const ayat = pkg.schemaVersion === 1 ? pkg.ayat.map(ayah => {
    if (!ayah.wordMeanings) return ayah;

    let ayahChanged = false;
    const wordMeanings = ayah.wordMeanings.map(meaning => {
      if (meaning.wordTokenId || !('arabic' in meaning)) return meaning;
      const legacyArabic = meaning.arabic;
      if (!legacyArabic) return meaning;
      const wordTokenId = resolveLegacyWordTokenId(pkg, ayah, legacyArabic);
      if (!wordTokenId) return meaning;

      changed = true;
      ayahChanged = true;
      const { arabic: _legacyArabic, ...canonicalMeaning } = meaning;
      return { ...canonicalMeaning, wordTokenId };
    });

    return ayahChanged ? { ...ayah, wordMeanings } : ayah;
  }) : pkg.ayat;

  const learningPaths = pkg.schemaVersion < 4 ? pkg.learningPaths.map(path => {
    if (path.surahCurricula?.length) return path;
    changed = true;
    const curricula: SurahCurriculum[] = path.surahIds.map(surahId => {
      const levels = path.levelIds
        .map(levelId => pkg.levels.find(level => level.id === levelId))
        .filter(level => level?.surahId === surahId);
      return {
        id: `${path.id}:${surahId}`,
        surahId,
        lessons: levels.map(level => {
          const kind: SurahLessonKind = level!.metadata?.isFinalReview
            ? 'final_review'
            : level!.ayahRefs.length > 1 ? 'ayah_range' : 'ayah';
          const first = level!.ayahRefs[0];
          const last = level!.ayahRefs.at(-1);
          return {
            levelId: level!.id,
            kind,
            ayahRange: first && last ? { start: first, end: last } : undefined,
          };
        }),
        reviewSegments: [],
      };
    });
    return { ...path, surahCurricula: curricula };
  }) : pkg.learningPaths;

  return changed ? { ...pkg, ayat, divisions, learningPaths } : pkg;
}
