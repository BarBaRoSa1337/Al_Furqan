import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';
import { getContentRepository } from '../../lib/content/repository';
import type { SummaryLevelBlock } from '../../types/content';
import WisdomCard, { buildWisdomShareMessage } from './WisdomCard';

const block: SummaryLevelBlock = {
  id: 'wisdom',
  type: 'summary',
  title: 'Remember',
  points: ['Trust Allah while taking responsible action.'],
  sourceIds: ['quran-arabic-madani'],
  reviewerStatus: 'approved',
};

test('shares approved package-authored wisdom', async () => {
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
  const repo = getContentRepository();
  const screen = render(<WisdomCard block={block} repo={repo} />);

  fireEvent.press(screen.getByRole('button', { name: 'Share Remember' }));

  const source = repo.getSourceById(block.sourceIds[0])?.name ?? '';
  await waitFor(() => expect(share).toHaveBeenCalledWith({
    message: buildWisdomShareMessage(block, 'Source', source),
  }));
  share.mockRestore();
});

test('does not expose sharing for draft religious content', () => {
  const screen = render(<WisdomCard block={{ ...block, reviewerStatus: 'draft' }} repo={getContentRepository()} />);

  expect(screen.queryByRole('button', { name: 'Share Remember' })).toBeNull();
  expect(screen.queryByText('Draft religious explanation pending review')).toBeNull();
});
