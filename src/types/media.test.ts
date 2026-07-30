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

test('declares checksum-verified Al-Husary Hafs audio for every published Al-Fil ayah', () => {
  const reciter = surahAlFilPackage.reciters.find(candidate => candidate.id === 'mahmoud-khalil-al-husary');

  expect(reciter?.providerResourceId).toBe('6');
  expect(surahAlFilPackage.recitationTracks).toHaveLength(5);
  surahAlFilPackage.recitationTracks.forEach((candidate, index) => {
    expect(candidate.ayahRef).toEqual({ surahNumber: 105, ayahNumber: index + 1 });
    expect(candidate.asset.uri).toMatch(/^https:\/\/mirrors\.quranicaudio\.com\//);
    expect(candidate.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(candidate.byteSize).toBeGreaterThan(0);
  });
});
