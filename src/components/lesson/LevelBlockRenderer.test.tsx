import { ContentRepository, WordMeaning } from '../../types/content';
import { resolveWordMeaningArabic } from './LevelBlockRenderer';

const baseMeaning = {
  id: 'meaning-1',
  transliteration: 'fixture',
  meaning: 'fixture',
  sourceId: 'source-1',
  reviewerStatus: 'approved',
} as const;

test('does not render an unmigrated legacy Arabic value', () => {
  const meaning: WordMeaning = { ...baseMeaning, arabic: 'legacy Arabic' };
  const repo = { getWordToken: jest.fn(() => undefined) } as unknown as Pick<ContentRepository, 'getWordToken'>;

  expect(resolveWordMeaningArabic(meaning, repo)).toBe('');
});

test('prefers canonical Arabic when a token can be resolved', () => {
  const meaning: WordMeaning = { ...baseMeaning, wordTokenId: 'token-1', arabic: 'legacy Arabic' };
  const repo = {
    getWordToken: jest.fn(() => ({ arabicText: 'canonical Arabic' })),
  } as unknown as Pick<ContentRepository, 'getWordToken'>;

  expect(resolveWordMeaningArabic(meaning, repo)).toBe('canonical Arabic');
});
