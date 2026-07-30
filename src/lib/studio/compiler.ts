import { validatePackage } from '../content/packageValidator';
import { AyahRef, ContentPackage } from '../../types/content';
import { CompiledContentPackage, ContentHasher, PublishablePackageDraft } from '../../types/studio';

export function compilePackage(draft: PublishablePackageDraft, canonical: ContentPackage, hasher: ContentHasher): CompiledContentPackage {
  const diagnostics = [] as CompiledContentPackage['diagnostics'];
  if (draft.state !== 'approved' && draft.state !== 'published') diagnostics.push({ code: 'publication_state', message: 'Only approved drafts can be compiled', path: 'state' });
  const edition = canonical.editions.find(item => item.id === draft.canonical.editionId);
  if (!edition) diagnostics.push({ code: 'edition_missing', message: 'Selected Quran edition is unavailable', path: 'canonical.editionId' });
  const surahs = canonical.surahs.filter(item => draft.canonical.surahIds.includes(item.id));
  if (surahs.length !== draft.canonical.surahIds.length) diagnostics.push({ code: 'surah_missing', message: 'Selected canonical surah is unavailable', path: 'canonical.surahIds' });
  const ayat = canonical.ayat.filter(item => item.editionId === draft.canonical.editionId && draft.canonical.ayahRefs.some(ref => sameRef(ref, item.ref)));
  if (ayat.length !== draft.canonical.ayahRefs.length) diagnostics.push({ code: 'ayah_missing', message: 'Selected canonical ayah is unavailable', path: 'canonical.ayahRefs' });
  const wordTokens = canonical.wordTokens.filter(item => draft.canonical.wordTokenIds.includes(item.id));
  if (wordTokens.length !== draft.canonical.wordTokenIds.length) diagnostics.push({ code: 'token_missing', message: 'Selected canonical word token is unavailable', path: 'canonical.wordTokenIds' });
  const divisions = canonical.divisions.filter(item => draft.canonical.divisionIds.includes(item.id));
  if (divisions.length !== draft.canonical.divisionIds.length) diagnostics.push({ code: 'division_missing', message: 'Selected canonical division is unavailable', path: 'canonical.divisionIds' });

  const pkg: ContentPackage = {
    ...draft.curriculum,
    editions: edition ? [edition] : [],
    surahs: sortById(surahs),
    ayat: sortById(ayat),
    wordTokens: sortById(wordTokens),
    divisions: sortById(divisions),
    structureIndex: canonical.structureIndex?.filter(entry => ayat.some(ayah => sameRef(ayah.ref, entry.ayahRef))),
    sources: sortById(draft.curriculum.sources),
    reciters: sortById(draft.curriculum.reciters),
    recitationTracks: sortById(draft.curriculum.recitationTracks),
  };
  const validation = validatePackage(pkg, { mode: 'production' });
  validation.errors.forEach(message => diagnostics.push({ code: 'package_invalid', message, path: 'package' }));
  return { package: pkg, contentHash: hasher.hash(stableStringify(pkg)), diagnostics };
}

function sortById<T extends { id: string }>(items: T[]): T[] { return [...items].sort((a, b) => a.id.localeCompare(b.id)); }
function sameRef(a: AyahRef, b: AyahRef): boolean { return a.surahNumber === b.surahNumber && a.ayahNumber === b.ayahNumber; }

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
