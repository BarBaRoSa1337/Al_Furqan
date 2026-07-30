import snapshot from '../../content/structure/hafs/al-fil.json';
import { importQuranStructureSnapshot, stableStringify } from './structureImporter';

test('imports the source-backed Al-Fil structure fixture deterministically', () => {
  const imported = importQuranStructureSnapshot(snapshot, {
    hash: () => snapshot.source.contentHash,
  });

  expect(imported.divisions.map(division => [division.kind, division.number, division.range])).toEqual([
    ['juz', 30, { start: { surahNumber: 78, ayahNumber: 1 }, end: { surahNumber: 114, ayahNumber: 6 } }],
    ['hizb', 60, { start: { surahNumber: 87, ayahNumber: 1 }, end: { surahNumber: 114, ayahNumber: 6 } }],
    ['rub_el_hizb', 240, { start: { surahNumber: 100, ayahNumber: 9 }, end: { surahNumber: 114, ayahNumber: 6 } }],
  ]);
  expect(imported.structureIndex).toHaveLength(5);
  expect(imported.structureIndex[0]).toMatchObject({
    ayahRef: { surahNumber: 105, ayahNumber: 1 },
    juzNumber: 30,
    hizbNumber: 60,
    rubElHizbNumber: 240,
  });
});

test('rejects a snapshot whose source hash does not match', () => {
  expect(() => importQuranStructureSnapshot(snapshot, { hash: () => '0'.repeat(64) })).toThrow('hash does not match');
});

test('stableStringify sorts object keys recursively', () => {
  expect(stableStringify({ z: 1, a: { y: 2, b: 3 } })).toBe('{"a":{"b":3,"y":2},"z":1}');
});
