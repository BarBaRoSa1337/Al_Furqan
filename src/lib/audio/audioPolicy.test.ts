import surahAlFilPackage from '../../content/packages/surah-al-fil/v1';
import { createFullyApprovedPackage } from '../../test/approvedGovernanceFixture';
import { resolveAudioAccessPolicy } from './audioPolicy';

const track = surahAlFilPackage.recitationTracks[0];

test('uses the evidence-bound direct stream without persistence', () => {
  expect(resolveAudioAccessPolicy(surahAlFilPackage, track, 'android', { development: true })).toEqual(
    expect.objectContaining({ mode: 'stream', reason: expect.stringContaining('Offline storage is disabled') }),
  );
});

test('uses the public-free stream grant outside development', () => {
  expect(resolveAudioAccessPolicy(surahAlFilPackage, track, 'web')).toEqual(
    expect.objectContaining({ mode: 'stream' }),
  );
});

test('uses exact resource grants to enable bounded verified persistence', () => {
  const cacheCandidate = {
    ...surahAlFilPackage,
    recitationTracks: surahAlFilPackage.recitationTracks.map(candidate => ({
      ...candidate,
      deliveryMode: 'cache_allowed' as const,
      checksum: 'a'.repeat(64),
      byteSize: 2048,
    })),
    governance: { evidence: [], approvals: [], licenseGrants: [] },
  };
  const pkg = createFullyApprovedPackage(cacheCandidate);
  const cacheGrant = pkg.governance!.licenseGrants.find(grant => grant.sourceId === track.sourceId)!;
  cacheGrant.retention = { kind: 'bounded', maxAgeSeconds: 7 * 24 * 60 * 60 };
  const policy = resolveAudioAccessPolicy(pkg, pkg.recitationTracks[0], 'web');

  expect(policy).toEqual(expect.objectContaining({
    mode: 'persist',
    retentionSeconds: 7 * 24 * 60 * 60,
  }));
});

test('does not persist when a cache claim has no retention right', () => {
  const candidate = { ...track, deliveryMode: 'cache_allowed' as const, checksum: 'a'.repeat(64), byteSize: 2048 };
  const pkg = createFullyApprovedPackage({ ...surahAlFilPackage, recitationTracks: [candidate], governance: { evidence: [], approvals: [], licenseGrants: [] } });
  expect(resolveAudioAccessPolicy(pkg, pkg.recitationTracks[0], 'web')).toEqual(expect.objectContaining({ mode: 'stream' }));
});

test('does not treat a public-free grant as commercial permission', () => {
  const pkg = createFullyApprovedPackage(surahAlFilPackage);

  expect(resolveAudioAccessPolicy(pkg, pkg.recitationTracks[0], 'android', { profile: 'commercial' })).toEqual(
    expect.objectContaining({ mode: 'blocked' }),
  );
});
