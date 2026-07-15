import surahAlFilPackage from '../../content/packages/surah-al-fil/v1';
import { ContentPackage } from '../../types/content';
import { validatePackage } from './packageValidator';

test('accepts draft package in development with warnings', () => {
  const result = validatePackage(surahAlFilPackage, { mode: 'development' });
  expect(result.valid).toBe(true);
  expect(result.warnings.length).toBeGreaterThan(0);
});

test('blocks draft religious content in production', () => {
  const result = validatePackage(surahAlFilPackage, { mode: 'production' });
  expect(result.valid).toBe(false);
  expect(result.errors.some(error => error.includes('reviewerStatus is "draft"'))).toBe(true);
});

test('rejects duplicate block IDs and passage refs outside level', () => {
  const pkg = structuredClone(surahAlFilPackage) as ContentPackage;
  const level = pkg.levels[0];
  level.steps[1].blocks[0].id = level.steps[0].blocks[0].id;
  const passageBlock = level.steps.flatMap(step => step.blocks).find(block => block.type === 'quran_passage');
  if (passageBlock?.type === 'quran_passage') passageBlock.ayahRefs = [{ surahNumber: 105, ayahNumber: 2 }];

  const result = validatePackage(pkg);
  expect(result.valid).toBe(false);
  expect(result.errors.some(error => error.includes('Duplicate block'))).toBe(true);
  expect(result.errors.some(error => error.includes('outside level.ayahRefs'))).toBe(true);
});

test('rejects canonical records with an unavailable Quran edition', () => {
  const pkg = structuredClone(surahAlFilPackage) as ContentPackage;
  pkg.ayat[0].editionId = 'unknown-edition' as never;

  const result = validatePackage(pkg);

  expect(result.valid).toBe(false);
  expect(result.errors.some(error => error.includes('unknown edition'))).toBe(true);
});

test('rejects recitation tracks incompatible with their Hafs reciter', () => {
  const pkg = structuredClone(surahAlFilPackage) as ContentPackage;
  pkg.reciters.push({ id: 'reciter', displayName: 'Fixture', editionId: 'hafs-an-asim', sourceId: 'quran-arabic-madani', license: 'fixture', reviewerStatus: 'approved' });
  pkg.recitationTracks.push({ id: 'track', reciterId: 'reciter', editionId: 'other' as never, ayahRef: { surahNumber: 105, ayahNumber: 1 }, sourceId: 'quran-arabic-madani', license: 'fixture', checksum: 'a'.repeat(64), asset: { kind: 'local', uri: 'audio/105-1.mp3' } });

  const result = validatePackage(pkg);

  expect(result.valid).toBe(false);
  expect(result.errors.some(error => error.includes('edition does not match reciter'))).toBe(true);
});

test('requires semantic step kinds and separates content from practice in schema v2', () => {
  const pkg = structuredClone(surahAlFilPackage) as ContentPackage;
  pkg.levels[0].steps[1].kind = undefined;
  pkg.levels[0].steps[2].blocks.push(pkg.levels[0].steps[5].blocks[0]);

  const result = validatePackage(pkg);

  expect(result.errors.some(error => error.includes('missing kind'))).toBe(true);
  expect(result.errors.some(error => error.includes('incompatible with step kind'))).toBe(true);
});

test('keeps schema-v1 packages readable through inferred step kinds', () => {
  const pkg = structuredClone(surahAlFilPackage) as ContentPackage;
  pkg.schemaVersion = 1;
  pkg.levels.forEach(level => {
    level.completionRules = undefined;
    level.steps.forEach(step => { step.kind = undefined; });
  });

  expect(validatePackage(pkg).valid).toBe(true);
});

test('authors Al-Fil Level 1 in the memorization-first sequence', () => {
  expect(surahAlFilPackage.levels[0].steps.map(step => step.kind)).toEqual([
    'context', 'read', 'translation', 'word_meaning', 'tafsir',
    'memorize', 'memory_practice', 'memory_practice', 'memory_practice',
    'understanding_practice', 'summary',
  ]);
});

test('authors Levels 2-4 as complete memorization-first development slices', () => {
  expect(surahAlFilPackage.version).toBe('2.2');
  expect(surahAlFilPackage.revisionId).toBe('surah-al-fil-v1-r4');
  expect(surahAlFilPackage.levels[1].steps.map(step => step.kind)).toEqual([
    'context', 'read', 'translation', 'memory_practice', 'word_meaning',
    'understanding_practice', 'tafsir', 'memory_practice', 'summary',
  ]);
  expect(surahAlFilPackage.levels[2].steps.map(step => step.kind)).toEqual([
    'context', 'read', 'translation', 'memory_practice', 'word_meaning',
    'understanding_practice', 'tafsir', 'memory_practice', 'summary',
  ]);
  expect(surahAlFilPackage.levels[3].steps.map(step => step.kind)).toEqual([
    'context', 'read', 'translation', 'memory_practice', 'word_meaning',
    'understanding_practice', 'tafsir', 'understanding_practice',
    'memory_practice', 'memory_practice', 'summary',
  ]);
  expect(surahAlFilPackage.levels.slice(1).flatMap(level => level.steps)
    .flatMap(step => step.blocks)
    .filter(block => block.type === 'activity')
    .map(block => block.activity.kind)).toEqual(expect.arrayContaining([
      'choose_continuation', 'order_ayat', 'match_word_meaning', 'recall_then_reveal',
    ]));
});

test('rejects malformed continuation content through package validation', () => {
  const pkg = structuredClone(surahAlFilPackage) as ContentPackage;
  const block = pkg.levels[1].steps.flatMap(step => step.blocks)
    .find(candidate => candidate.type === 'activity' && candidate.activity.kind === 'choose_continuation');
  if (!block || block.type !== 'activity' || block.activity.kind !== 'choose_continuation') throw new Error('Continuation fixture unavailable');
  block.activity.config.correctOptionId = 'missing-option';

  expect(validatePackage(pkg).errors.some(error => error.includes('Continuation answer references unavailable option'))).toBe(true);
});
