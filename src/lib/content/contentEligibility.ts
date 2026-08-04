import type { ContentPackage, LevelBlock } from '../../types/content';

export function isBlockEligibleForProduction(block: LevelBlock, pkg: ContentPackage): boolean {
  if (block.type === 'source_locked') return false;
  const sourcesApproved = (sourceIds: string[]) => sourceIds.length > 0 && sourceIds.every(id => pkg.sources.find(source => source.id === id)?.reviewerStatus === 'approved');
  if (block.type === 'context' || block.type === 'question' || block.type === 'summary') {
    return block.reviewerStatus === 'approved' && sourcesApproved(block.sourceIds);
  }
  if (block.type === 'activity') {
    return block.activity.reviewerStatus === 'approved' && sourcesApproved(block.activity.sourceIds);
  }
  if (block.type === 'surah_overview') {
    const surah = pkg.surahs.find(candidate => candidate.id === block.surahId);
    return Boolean(surah && surah.sourceMetadata.reviewerStatus === 'approved' && sourcesApproved([surah.sourceMetadata.quranTextSourceId]));
  }
  if (block.type === 'tafsir_ref') {
    const ayah = pkg.ayat.find(candidate => sameRef(candidate.ref, block.ayahRef));
    const tafsir = ayah?.tafsirEntries.find(entry => entry.id === block.tafsirEntryId);
    return Boolean(tafsir && tafsir.reviewerStatus === 'approved' && sourcesApproved([tafsir.sourceId]));
  }
  if (block.type === 'translation') {
    const entries = pkg.ayat.filter(ayah => block.ayahRefs.some(ref => sameRef(ref, ayah.ref))).flatMap(ayah => ayah.translations)
      .filter(entry => entry.locale === block.locale && (!block.translationEntryIds || block.translationEntryIds.includes(entry.id)));
    return entries.length > 0 && entries.every(entry => entry.reviewerStatus === 'approved' && sourcesApproved([entry.sourceId]));
  }
  if (block.type === 'word_meaning') {
    const selected = pkg.ayat.flatMap(ayah => ayah.wordMeanings ?? []).filter(meaning => block.wordMeaningIds.includes(meaning.id));
    return selected.length === block.wordMeaningIds.length && selected.every(meaning => meaning.reviewerStatus === 'approved' && sourcesApproved([meaning.sourceId]));
  }
  if (block.type === 'word_explorer') {
    const meanings = pkg.ayat.filter(ayah => block.ayahRefs.some(ref => sameRef(ref, ayah.ref))).flatMap(ayah => ayah.wordMeanings ?? []);
    return meanings.length > 0 && meanings.every(meaning => meaning.reviewerStatus === 'approved' && sourcesApproved([meaning.sourceId]));
  }
  if (block.type === 'media') {
    const asset = pkg.mediaAssets.find(candidate => candidate.id === block.assetId);
    return Boolean(asset && asset.reviewerStatus === 'approved' && sourcesApproved(asset.sourceIds) && /^[a-f0-9]{64}$/i.test(asset.checksum));
  }
  return true;
}

function sameRef(a: { surahNumber: number; ayahNumber: number }, b: { surahNumber: number; ayahNumber: number }): boolean {
  return a.surahNumber === b.surahNumber && a.ayahNumber === b.ayahNumber;
}
