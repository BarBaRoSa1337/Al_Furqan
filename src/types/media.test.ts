import { RecitationTrack, resolveRecitationAsset } from './media';
import surahAlFilPackage from '../content/packages/surah-al-fil/v1';

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

test('declares stream-only MP3Quran Al-Husary segments for every Al-Fil ayah', () => {
  const reciter = surahAlFilPackage.reciters.find(candidate => candidate.id === 'mahmoud-khalil-al-husary');

  expect(reciter?.providerResourceId).toBe('mp3quran:reciter:118:mushaf:118');
  expect(surahAlFilPackage.recitationTracks).toHaveLength(5);
  surahAlFilPackage.recitationTracks.forEach((candidate, index) => {
    expect(candidate.ayahRef).toEqual({ surahNumber: 105, ayahNumber: index + 1 });
    expect(candidate.asset.uri).toBe('https://server13.mp3quran.net/husr/105.mp3');
    expect(candidate.deliveryMode).toBe('stream_only');
    expect(candidate.approvedHostnames).toContain('server13.mp3quran.net');
    expect(candidate.startMs).toBeGreaterThanOrEqual(0);
    expect(candidate.endMs).toBeGreaterThan(candidate.startMs!);
    expect(candidate.checksum).toBeUndefined();
  });
});
