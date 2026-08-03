import { getContentRepository } from '../content/repository';
import surahAlFilPackage from '../../content/packages/surah-al-fil/v1';
import type { ActivityReviewState } from '../../types/progress';
import { resolveDueReviewItems } from './reviewQueue';

const state: ActivityReviewState = {
  activityId: 'l1-fill-gap-1', levelId: 'al-fil-level-1-context-ayah-1', packageRevisionId: surahAlFilPackage.revisionId,
  stage: 1, dueAt: '2026-01-01T00:00:00.000Z', lastOutcome: 'correct', lastReviewedAt: '2025-12-31T00:00:00.000Z', mastered: false,
};

test('resolves only review activities from the active package revision', () => {
  const repo = getContentRepository();
  expect(resolveDueReviewItems(repo, [state])).toHaveLength(1);
  expect(resolveDueReviewItems(repo, [{ ...state, packageRevisionId: 'surah-al-fil-v1-r13' }])).toEqual([]);
  expect(resolveDueReviewItems(repo, [{ ...state, activityId: 'l1-order-ayah-1' }])).toEqual([]);
  expect(resolveDueReviewItems(repo, [{ ...state, levelId: 'al-fil-level-2-ayah-2' }])).toEqual([]);
});
