import sourcePackage from '../../content/packages/surah-al-fil/v1';
import { ContentPackage } from '../../types/content';
import { PublishablePackageDraft } from '../../types/studio';
import { compilePackage } from './compiler';

function fixture(): PublishablePackageDraft {
  const canonical = structuredClone(sourcePackage) as ContentPackage;
  const { editions, surahs, ayat, wordTokens, divisions, ...curriculum } = canonical;
  return { state: 'approved', canonical: { editionId: editions[0].id, surahIds: surahs.map(item => item.id), ayahRefs: ayat.map(item => item.ref), wordTokenIds: wordTokens.map(item => item.id), divisionIds: divisions.map(item => item.id) }, curriculum };
}

test('compiles immutable canonical selections into deterministic package data', () => {
  const draft = fixture();
  const hasher = { hash: (value: string) => String(value.length) };
  const first = compilePackage(draft, sourcePackage, hasher);
  const second = compilePackage({ ...draft, curriculum: { ...draft.curriculum, sources: [...draft.curriculum.sources].reverse() } }, sourcePackage, hasher);

  expect(first.diagnostics).toEqual([]);
  expect(first.contentHash).toBe(second.contentHash);
  expect(first.package.ayat[0].arabicText.text).toBe(sourcePackage.ayat[0].arabicText.text);
});

test('rejects an unavailable canonical selection with machine-readable diagnostics', () => {
  const draft = fixture();
  draft.canonical.ayahRefs.push({ surahNumber: 1, ayahNumber: 1 });
  const result = compilePackage(draft, sourcePackage, { hash: () => 'fixture' });

  expect(result.diagnostics.some(item => item.code === 'ayah_missing')).toBe(true);
});
