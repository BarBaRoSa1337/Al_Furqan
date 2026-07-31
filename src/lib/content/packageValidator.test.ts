import surahAlFilPackage from '../../content/packages/surah-al-fil/v1';
import { ContentPackage } from '../../types/content';
import { createFullyApprovedPackage } from '../../test/approvedGovernanceFixture';
import { validatePackage } from './packageValidator';
import { getCoreLevelSteps, getPracticeLevelSteps } from './lessonSteps';

test('accepts draft package in development with warnings', () => {
  const result = validatePackage(surahAlFilPackage, { mode: 'development' });
  expect(result.valid).toBe(true);
  expect(result.warnings.length).toBeGreaterThan(0);
});

test('requires navigation-only Surahs to match the canonical structure without embedding Quran text', () => {
  const pkg = structuredClone(surahAlFilPackage) as ContentPackage;
  const navigationSurah = pkg.surahs.find(surah => surah.navigationOnly);
  if (!navigationSurah) throw new Error('Navigation Surah fixture unavailable');
  pkg.structureIndex = pkg.structureIndex?.filter(entry => !(
    entry.ayahRef.surahNumber === navigationSurah.surahNumber
    && entry.ayahRef.ayahNumber === navigationSurah.ayahCount
  ));

  let result = validatePackage(pkg);
  expect(result.errors.some(error => error.includes('structure index contains'))).toBe(true);

  const canonicalAyah = structuredClone(pkg.ayat[0]);
  canonicalAyah.id = `${navigationSurah.surahNumber}:1`;
  canonicalAyah.ref = { surahNumber: navigationSurah.surahNumber, ayahNumber: 1 };
  pkg.ayat.push(canonicalAyah);
  result = validatePackage(pkg);
  expect(result.errors.some(error => error.includes('navigation-only but contains Quran text'))).toBe(true);
});

test('blocks draft religious content in production', () => {
  const result = validatePackage(surahAlFilPackage, { mode: 'production' });
  expect(result.valid).toBe(false);
  expect(result.errors.some(error => error.includes('reviewerStatus is "draft"'))).toBe(true);
});

test('accepts a fully evidenced package for public free distribution', () => {
  const pkg = createFullyApprovedPackage(surahAlFilPackage);
  const result = validatePackage(pkg, { mode: 'production', releaseProfile: 'public-free' });

  expect(result.valid).toBe(true);
  expect(result.diagnostics).toEqual([]);
});

test('rejects stale package approvals and commercial use not covered by a grant', () => {
  const pkg = createFullyApprovedPackage(surahAlFilPackage);
  pkg.description = `${pkg.description} changed`;

  const publicResult = validatePackage(pkg, { mode: 'production', releaseProfile: 'public-free' });
  const commercialResult = validatePackage(pkg, { mode: 'production', releaseProfile: 'commercial' });

  expect(publicResult.diagnostics.some(item => item.code === 'approval_missing_or_stale')).toBe(true);
  expect(commercialResult.diagnostics.some(item => item.code === 'license_grant_missing_or_insufficient')).toBe(true);
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

test('rejects block and activity identity reused across levels', () => {
  const pkg = structuredClone(surahAlFilPackage) as ContentPackage;
  const first = pkg.levels[0].steps.flatMap(step => step.blocks).find(block => block.type === 'activity');
  const second = pkg.levels[1].steps.flatMap(step => step.blocks).find(block => block.type === 'activity');
  if (!first || first.type !== 'activity' || !second || second.type !== 'activity') throw new Error('Activity fixtures unavailable');
  second.id = first.id;
  second.activity.id = first.activity.id;

  expect(validatePackage(pkg).errors.some(error => error.includes('Duplicate block id'))).toBe(true);
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

test('keeps schema-v1 word meanings readable without canonical token references', () => {
  const pkg = structuredClone(surahAlFilPackage) as ContentPackage;
  const meaning = pkg.ayat[0].wordMeanings?.[0];
  if (!meaning) throw new Error('Word meaning fixture unavailable');
  const arabic = pkg.wordTokens.find(token => token.id === meaning.wordTokenId)?.arabicText;
  if (!arabic) throw new Error('Canonical token fixture unavailable');
  pkg.schemaVersion = 1;
  pkg.ayat[0].wordMeanings![0] = { ...meaning, wordTokenId: undefined, arabic } as unknown as typeof meaning;

  expect(validatePackage(pkg).valid).toBe(true);
});

test('rejects schema-v1 word meanings whose Arabic is not canonical', () => {
  const pkg = structuredClone(surahAlFilPackage) as ContentPackage;
  const meaning = pkg.ayat[0].wordMeanings?.[0];
  if (!meaning) throw new Error('Word meaning fixture unavailable');
  pkg.schemaVersion = 1;
  pkg.ayat[0].wordMeanings![0] = { ...meaning, wordTokenId: undefined, arabic: 'غير مطابق' } as unknown as typeof meaning;

  const result = validatePackage(pkg);

  expect(result.valid).toBe(false);
  expect(result.errors.some(error => error.includes('does not match exactly one canonical token'))).toBe(true);
});

test('requires canonical word references and rejects embedded Arabic in schema v2', () => {
  const pkg = structuredClone(surahAlFilPackage) as ContentPackage;
  const meaning = pkg.ayat[0].wordMeanings?.[0];
  if (!meaning) throw new Error('Word meaning fixture unavailable');
  pkg.ayat[0].wordMeanings![0] = { ...meaning, wordTokenId: undefined, arabic: 'legacy' } as unknown as typeof meaning;

  const result = validatePackage(pkg);

  expect(result.errors.some(error => error.includes('missing canonical token reference'))).toBe(true);
  expect(result.errors.some(error => error.includes('duplicates canonical Arabic text'))).toBe(true);
});

test('authors Al-Fil Level 1 as a focused core loop plus optional practice', () => {
  expect(getCoreLevelSteps(surahAlFilPackage.levels[0]).map(step => step.kind)).toEqual([
    'context', 'read', 'translation', 'word_meaning', 'tafsir',
    'memorize',
    'understanding_practice', 'summary',
  ]);
  expect(getPracticeLevelSteps(surahAlFilPackage.levels[0]).map(step => step.id)).toEqual(expect.arrayContaining([
    'l1-memory-practice', 'l1-type-recall', 'l1-match-translation-practice', 'l1-quiz-practice',
  ]));
});

test('authors Levels 2-4 as complete memorization-first development slices', () => {
  expect(surahAlFilPackage.version).toBe('3.0');
  expect(surahAlFilPackage.revisionId).toBe('surah-al-fil-v1-r13');
  expect(getCoreLevelSteps(surahAlFilPackage.levels[1]).map(step => step.kind)).toEqual([
    'context', 'read', 'translation', 'memory_practice', 'word_meaning',
    'understanding_practice', 'tafsir', 'memory_practice', 'summary',
  ]);
  expect(getCoreLevelSteps(surahAlFilPackage.levels[2]).map(step => step.kind)).toEqual([
    'context', 'read', 'translation', 'memory_practice', 'word_meaning',
    'understanding_practice', 'tafsir', 'memory_practice', 'summary',
  ]);
  expect(getCoreLevelSteps(surahAlFilPackage.levels[3]).map(step => step.kind)).toEqual([
    'context', 'read', 'translation', 'word_meaning', 'understanding_practice', 'tafsir',
    'memory_practice', 'memory_practice', 'summary',
  ]);
  expect(surahAlFilPackage.levels.slice(1).flatMap(level => level.steps)
    .flatMap(step => step.blocks)
    .filter(block => block.type === 'activity')
    .map(block => block.activity.kind)).toEqual(expect.arrayContaining([
      'choose_continuation', 'order_ayat', 'match_word_meaning', 'order_tokens',
    ]));
});

test('rejects schema-v2 steps with multiple interactive exercises', () => {
  const pkg = structuredClone(surahAlFilPackage) as ContentPackage;
  const practice = pkg.levels[0].steps.find(step => step.id === 'l1-match-translation-practice');
  if (!practice) throw new Error('Practice fixture unavailable');
  practice.blocks.push(structuredClone(pkg.levels[0].steps.find(step => step.id === 'l1-quiz-practice')!.blocks[0]));

  expect(validatePackage(pkg).errors.some(error => error.includes('more than one interactive exercise'))).toBe(true);
});

test('rejects invented Hafs Thumun metadata and inconsistent structure ranges', () => {
  const pkg = structuredClone(surahAlFilPackage) as ContentPackage;
  pkg.structureIndex![0].thumunAlHizbNumber = 480;
  pkg.divisions.find(division => division.kind === 'rub_el_hizb' && division.number === 1)!.range.start = { surahNumber: 2, ayahNumber: 1 };

  const result = validatePackage(pkg);

  expect(result.errors.some(error => error.includes('unsupported Hafs Thumun'))).toBe(true);
  expect(result.errors.some(error => error.includes('outside Rub 1 range'))).toBe(true);
});

test('rejects discovery metadata outside the package canonical selection', () => {
  const pkg = structuredClone(surahAlFilPackage) as ContentPackage;
  pkg.learningPaths[0].discovery = {
    ...pkg.learningPaths[0].discovery!,
    alignment: { type: 'hizb', number: 61 },
  };
  pkg.levels[0].discovery = {
    ...pkg.levels[0].discovery!,
    alignment: {
      type: 'ayah_range',
      range: { start: { surahNumber: 105, ayahNumber: 5 }, end: { surahNumber: 105, ayahNumber: 1 } },
    },
  };

  const result = validatePackage(pkg);

  expect(result.errors.some(error => error.includes('unavailable Hizb 61'))).toBe(true);
  expect(result.errors.some(error => error.includes('reversed range'))).toBe(true);
});

test('rejects malformed continuation content through package validation', () => {
  const pkg = structuredClone(surahAlFilPackage) as ContentPackage;
  const block = pkg.levels[1].steps.flatMap(step => step.blocks)
    .find(candidate => candidate.type === 'activity' && candidate.activity.kind === 'choose_continuation');
  if (!block || block.type !== 'activity' || block.activity.kind !== 'choose_continuation') throw new Error('Continuation fixture unavailable');
  block.activity.config.correctOptionId = 'missing-option';

  expect(validatePackage(pkg).errors.some(error => error.includes('Continuation answer references unavailable option'))).toBe(true);
});
