import surahAlFilPackage from '../../content/packages/surah-al-fil/v1';
import { createFullyApprovedPackage } from '../../test/approvedGovernanceFixture';
import { resolveAudioAccessPolicy } from './audioPolicy';

const track = surahAlFilPackage.recitationTracks[0];

test('keeps unlicensed audio streaming-only in development', () => {
  expect(resolveAudioAccessPolicy(surahAlFilPackage, track, 'android', { development: true })).toEqual(
    expect.objectContaining({ mode: 'stream', reason: expect.stringContaining('Development-only') }),
  );
});

test('blocks unlicensed audio outside development', () => {
  expect(resolveAudioAccessPolicy(surahAlFilPackage, track, 'web')).toEqual(
    expect.objectContaining({ mode: 'blocked' }),
  );
});

test('uses exact resource grants to enable bounded verified persistence', () => {
  const pkg = createFullyApprovedPackage(surahAlFilPackage);
  const policy = resolveAudioAccessPolicy(pkg, pkg.recitationTracks[0], 'web');

  expect(policy).toEqual(expect.objectContaining({
    mode: 'persist',
    retentionSeconds: 7 * 24 * 60 * 60,
  }));
});

test('does not treat a public-free grant as commercial permission', () => {
  const pkg = createFullyApprovedPackage(surahAlFilPackage);

  expect(resolveAudioAccessPolicy(pkg, pkg.recitationTracks[0], 'android', { profile: 'commercial' })).toEqual(
    expect.objectContaining({ mode: 'blocked' }),
  );
});
