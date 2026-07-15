import { getContentRepository } from '../content/repository';
import { resolveTypedTarget } from './activityContext';

test('resolves typed answers from canonical ayah and token records', () => {
  const repo = getContentRepository();
  expect(resolveTypedTarget(repo, { kind: 'ayah', ayahRef: { surahNumber: 105, ayahNumber: 1 } }))
    .toBe(repo.getAyahByRef({ surahNumber: 105, ayahNumber: 1 })?.arabicText.text);
  expect(resolveTypedTarget(repo, { kind: 'token_sequence', tokenIds: ['105:1:word:1', '105:1:word:2'] }))
    .toBe('أَلَمْ تَرَ');
});
