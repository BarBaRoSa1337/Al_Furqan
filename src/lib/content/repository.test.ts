import { HAFS_AN_ASIM_ID, surahAlFilAyat, surahAlFilWordTokens } from '../../content/packages/surah-al-fil/v1';
import { getContentRepository } from './repository';

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
});

test('exposes empty division indexes until a verified boundary source is installed', () => {
  const repository = getContentRepository();

  expect(repository.listDivisions('juz', HAFS_AN_ASIM_ID)).toEqual([]);
  expect(repository.getDivision('hizb', 60, HAFS_AN_ASIM_ID)).toBeUndefined();
  expect(repository.listSurahsInDivision('rub', 1, HAFS_AN_ASIM_ID)).toEqual([]);
});
