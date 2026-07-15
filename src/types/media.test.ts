import { RecitationTrack, resolveRecitationAsset } from './media';

const track: RecitationTrack = {
  id: 'track-105-1', reciterId: 'reciter-1', editionId: 'hafs-an-asim', ayahRef: { surahNumber: 105, ayahNumber: 1 }, sourceId: 'audio-source', license: 'licensed', checksum: 'a'.repeat(64), asset: { kind: 'local', uri: 'audio/105-1.mp3' },
};

test('resolves installed audio but preserves unavailable local fallback', async () => {
  await expect(resolveRecitationAsset(track, { resolveLocal: async () => undefined })).resolves.toEqual({ available: false, isLocal: true });
  await expect(resolveRecitationAsset(track, { resolveLocal: async uri => `file://${uri}` })).resolves.toEqual({ available: true, isLocal: true, uri: 'file://audio/105-1.mp3' });
});

test('returns a declared remote URL without fetching it', async () => {
  const remote = { ...track, asset: { kind: 'remote' as const, uri: 'https://example.test/105-1.mp3' } };
  await expect(resolveRecitationAsset(remote, { resolveLocal: async () => { throw new Error('must not resolve'); } })).resolves.toEqual({ available: true, isLocal: false, uri: remote.asset.uri });
});
