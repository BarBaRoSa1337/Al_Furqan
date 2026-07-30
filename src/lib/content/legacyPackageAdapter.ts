import type { AyahRecord, ContentPackage, WordToken } from '../../types/content';

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

  return changed ? { ...pkg, ayat, divisions } : pkg;
}
