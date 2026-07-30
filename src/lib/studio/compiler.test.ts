import sourcePackage from '../../content/packages/surah-al-fil/v1';
import { ContentPackage } from '../../types/content';
import { PublishablePackageDraft } from '../../types/studio';
import { compilePackage } from './compiler';

function fixture(approved = false): { draft: PublishablePackageDraft; canonical: ContentPackage } {
  const canonical = structuredClone(sourcePackage) as ContentPackage;
  if (approved) approveFixtureContent(canonical);
  const { editions, surahs, ayat, wordTokens, divisions, ...curriculum } = canonical;
  const draft: PublishablePackageDraft = {
    state: 'approved',
    canonical: {
      editionId: editions[0].id,
      surahIds: surahs.filter(item => !item.navigationOnly).map(item => item.id),
      ayahRefs: ayat.map(item => item.ref),
      wordTokenIds: wordTokens.map(item => item.id),
      divisionIds: divisions.map(item => item.id),
    },
    curriculum,
  };
  return { draft, canonical };
}

function approveFixtureContent(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  if ('reviewerStatus' in value) (value as { reviewerStatus: string }).reviewerStatus = 'approved';
  Object.values(value).forEach(approveFixtureContent);
}

test('compiles immutable canonical selections into deterministic package data', () => {
  const { draft, canonical } = fixture(true);
  const hasher = { hash: (value: string) => String(value.length) };
  const first = compilePackage(draft, canonical, hasher);
  const second = compilePackage({ ...draft, curriculum: { ...draft.curriculum, sources: [...draft.curriculum.sources].reverse() } }, canonical, hasher);

  expect(first.diagnostics).toEqual([]);
  expect(first.contentHash).toBe(second.contentHash);
  expect(first.package.ayat[0].arabicText.text).toBe(canonical.ayat[0].arabicText.text);
});

test('rejects an unavailable canonical selection with machine-readable diagnostics', () => {
  const { draft, canonical } = fixture(true);
  draft.canonical.ayahRefs.push({ surahNumber: 1, ayahNumber: 1 });
  const result = compilePackage(draft, canonical, { hash: () => 'fixture' });

  expect(result.diagnostics.some(item => item.code === 'ayah_missing')).toBe(true);
});

test('blocks draft religious content at the compiler publication boundary', () => {
  const { draft, canonical } = fixture();
  const result = compilePackage(draft, canonical, { hash: () => 'fixture' });

  expect(result.diagnostics).toEqual(expect.arrayContaining([
    expect.objectContaining({ code: 'package_invalid', path: 'package' }),
  ]));
  expect(result.diagnostics.some(item => item.message.includes('reviewerStatus is "draft"'))).toBe(true);
});
