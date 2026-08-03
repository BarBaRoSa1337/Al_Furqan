import surahAlFilPackage, { HAFS_AN_ASIM_ID, surahAlFilAyat, surahAlFilWordTokens } from '../../content/packages/surah-al-fil/v1';
import { ContentPackage } from '../../types/content';
import ContentRepositoryImpl, { getContentRepository } from './repository';

test('resolves Al-Fil through the explicit Hafs edition and legacy default', () => {
  const repository = getContentRepository();
  const ref = { surahNumber: 105, ayahNumber: 1 };

  expect(repository.getEdition(HAFS_AN_ASIM_ID)?.riwayah).toBe('hafs');
  expect(repository.getSurahByNumber(105)?.id).toBe('surah-al-fil');
  expect(repository.getAyahByRef(ref, HAFS_AN_ASIM_ID)?.id).toBe('105:1');
  expect(repository.getAyahByRef(ref)?.id).toBe('105:1');
});

test('keeps canonical token IDs attached to their Hafs ayah', () => {
  const repository = getContentRepository();
  const ayah = surahAlFilAyat[0];
  const token = surahAlFilWordTokens.find(candidate => candidate.id === ayah.wordTokenIds[0]);

  expect(token?.editionId).toBe(HAFS_AN_ASIM_ID);
  expect(token?.ayahRef).toEqual(ayah.ref);
  expect(repository.getWordToken(token?.id ?? '')).toEqual(token);
  expect(ayah.wordMeanings?.[0]).not.toHaveProperty('arabic');
  expect(repository.getWordToken(ayah.wordMeanings?.[0].wordTokenId ?? '')?.arabicText).toBe('أَلَمْ');
});

test('resolves source-backed Al-Fil division memberships and the rub alias', () => {
  const repository = getContentRepository();
  const rub240Refs = repository.listAyahRefsInDivision('rub', 240, HAFS_AN_ASIM_ID);
  const rub240Surahs = repository.listSurahsInDivision('rub', 240, HAFS_AN_ASIM_ID);

  expect(repository.getDivision('juz', 30, HAFS_AN_ASIM_ID)?.range.start).toEqual({ surahNumber: 78, ayahNumber: 1 });
  expect(repository.getDivision('hizb', 60, HAFS_AN_ASIM_ID)?.range.start).toEqual({ surahNumber: 87, ayahNumber: 1 });
  expect(rub240Refs[0]).toEqual({ surahNumber: 100, ayahNumber: 9 });
  expect(rub240Refs.at(-1)).toEqual({ surahNumber: 114, ayahNumber: 6 });
  expect(rub240Refs).toEqual(expect.arrayContaining(surahAlFilAyat.map(ayah => ayah.ref)));
  expect(rub240Surahs.map(surah => surah.id)).toContain('surah-al-fil');
  expect(repository.getDivisionsForAyah({ surahNumber: 105, ayahNumber: 1 }, HAFS_AN_ASIM_ID).map(division => division.number)).toEqual([30, 60, 240]);
});

test('exposes complete Hafs navigation indexes without inventing canonical ayah text', () => {
  const repository = getContentRepository();

  expect(repository.getSurahs()).toHaveLength(114);
  expect(repository.listDivisions('juz', HAFS_AN_ASIM_ID)).toHaveLength(30);
  expect(repository.listDivisions('hizb', HAFS_AN_ASIM_ID)).toHaveLength(60);
  expect(repository.listDivisions('rub', HAFS_AN_ASIM_ID)).toHaveLength(240);
  expect(repository.getAyahByRef({ surahNumber: 1, ayahNumber: 1 }, HAFS_AN_ASIM_ID)).toBeUndefined();
});

test('aggregates authored roadmap content into one ordered Surah node', () => {
  const repository = getContentRepository();
  const authored = repository.listAuthoredSurahs('surah-al-fil-path-v1');

  expect(authored).toHaveLength(1);
  expect(authored[0].surah.id).toBe('surah-al-fil');
  expect(authored[0].levels.map(level => level.title)).toEqual([
    'Discover Al-Fil', 'Ayah 1', 'Ayah 2', 'Ayah 3', 'Ayah 4', 'Ayah 5', 'Surah Review',
  ]);
});

test('searches Quran references separately from matching learning paths', () => {
  const repository = getContentRepository();

  const referenceSearch = repository.searchDiscovery('105:1');
  expect(referenceSearch.quranReferences[0]).toMatchObject({
    label: '105:1',
    lessonAvailability: 'published',
  });
  expect(referenceSearch.learningPaths[0]?.packageId).toBe(surahAlFilPackage.id);

  const themeSearch = repository.searchDiscovery('stories');
  expect(themeSearch.quranReferences).toEqual(expect.arrayContaining([
    expect.objectContaining({ lookup: { type: 'surah', surahNumber: 28 }, lessonAvailability: 'no_published_lesson' }),
  ]));
  expect(themeSearch.learningPaths.map(result => result.path.id)).toContain('surah-al-fil-path-v1');
});

test('rejects level identities owned by another installed package', () => {
  const repository = new ContentRepositoryImpl();
  const duplicate = structuredClone(surahAlFilPackage) as ContentPackage;
  duplicate.id = 'another-package';

  expect(() => repository.registerPackage(duplicate)).toThrow('already owned by another package');
});

test('migrates valid schema-v1 word meanings to canonical token references', () => {
  const repository = new ContentRepositoryImpl();
  const legacy = structuredClone(surahAlFilPackage) as ContentPackage;
  const meaning = legacy.ayat[0].wordMeanings?.[0];
  if (!meaning) throw new Error('Word meaning fixture unavailable');
  const arabic = legacy.wordTokens.find(token => token.id === meaning.wordTokenId)?.arabicText;
  if (!arabic) throw new Error('Canonical token fixture unavailable');
  legacy.schemaVersion = 1;
  legacy.ayat[0].wordMeanings![0] = { ...meaning, wordTokenId: undefined, arabic } as unknown as typeof meaning;

  repository.registerPackage(legacy);

  const migrated = repository.getPackageById(legacy.id)?.ayat[0].wordMeanings?.[0];
  expect(migrated?.wordTokenId).toBe(meaning.wordTokenId);
  expect(migrated).not.toHaveProperty('arabic');
});

test('keeps media and discovery ownership inside the package that declares the block', () => {
  const repository = new ContentRepositoryImpl();
  const downloaded = cloneWithOwnedLearningIds(surahAlFilPackage, '-downloaded');
  downloaded.id = 'downloaded-al-fil';
  downloaded.revisionId = 'downloaded-al-fil-r1';
  downloaded.mediaAssets.push({
    id: 'downloaded-context-art',
    kind: 'image',
    uri: 'images/downloaded-context.png',
    altText: 'Downloaded context illustration',
    sourceIds: ['quran-arabic-madani'],
    license: 'fixture',
    checksum: 'a'.repeat(64),
    reviewerStatus: 'approved',
  });
  const mediaBlock = { id: 'downloaded-media-block', type: 'media' as const, assetId: 'downloaded-context-art' };
  downloaded.levels[0].steps[0].blocks.push(mediaBlock);

  repository.registerPackage(downloaded, false, 'downloaded');

  expect(repository.getPackageForBlock(mediaBlock.id)?.id).toBe(downloaded.id);
  expect(repository.getPackageForBlock(mediaBlock.id)?.mediaAssets.find(a => a.id === 'downloaded-context-art')?.uri).toBe('images/downloaded-context.png');
  expect(repository.listLearningPaths({ downloadedOnly: true }).map(result => result.packageId)).toEqual([downloaded.id]);
});

function cloneWithOwnedLearningIds(pkg: ContentPackage, suffix: string): ContentPackage {
  const replacements = new Map<string, string>();
  pkg.learningPaths.forEach(path => replacements.set(path.id, `${path.id}${suffix}`));
  pkg.levels.forEach(level => {
    replacements.set(level.id, `${level.id}${suffix}`);
    level.steps.flatMap(step => step.blocks).forEach(block => replacements.set(block.id, `${block.id}${suffix}`));
  });
  return JSON.parse(JSON.stringify(pkg, (_key, value: unknown) => (
    typeof value === 'string' ? replacements.get(value) ?? value : value
  ))) as ContentPackage;
}
