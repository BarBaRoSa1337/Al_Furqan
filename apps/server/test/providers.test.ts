import assert from 'node:assert/strict';
import test from 'node:test';
import { Mp3QuranClient } from '../src/mp3Quran';
import { QuranEncClient } from '../src/quranEnc';

test('MP3Quran validates exact Husary Hafs identity and returns ayah timing', async () => {
  const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (init?.method === 'HEAD') return new Response(null, { headers: { 'content-type': 'audio/mpeg', 'content-length': '2048' } });
    if (url.includes('/reciters')) return Response.json({ reciters: [{ id: 118, name: 'Mahmoud Khalil Al-Hussary', moshaf: [{ id: 118, rewaya_id: 1, server: 'https://server13.mp3quran.net/husr/', surah_list: '104,105,106' }] }] });
    return Response.json([{ ayah: 0, start_time: 0, end_time: 1000 }, { ayah: 1, start_time: 1000, end_time: 2000 }]);
  };
  const stream = await new Mp3QuranClient(fetcher as typeof fetch).resolveHusaryHafs(105);
  assert.equal(stream.uri, 'https://server13.mp3quran.net/husr/105.mp3');
  assert.deepEqual(stream.segments, [{ ayah: 1, startMs: 1000, endMs: 2000 }]);
  assert.equal(stream.deliveryMode, 'stream_only');
});

test('MP3Quran rejects a stream that is not audio', async () => {
  const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (init?.method === 'HEAD') return new Response(null, { headers: { 'content-type': 'text/html', 'content-length': '2048' } });
    if (url.includes('/reciters')) return Response.json({ reciters: [{ id: 118, name: 'Mahmoud Khalil Al-Hussary', moshaf: [{ id: 118, rewaya_id: 1, server: 'https://server13.mp3quran.net/husr/', surah_list: '105' }] }] });
    return Response.json([{ ayah: 1, start_time: 1000, end_time: 2000 }]);
  };
  await assert.rejects(new Mp3QuranClient(fetcher as typeof fetch).resolveHusaryHafs(105), /content type/);
});

test('MP3Quran rejects mismatched stream origins', async () => {
  const fetcher = async () => Response.json({ reciters: [{ id: 118, name: 'Mahmoud Khalil Al-Hussary', moshaf: [{ id: 118, rewaya_id: 1, server: 'https://evil.example/husr/', surah_list: '105' }] }] });
  await assert.rejects(new Mp3QuranClient(fetcher as typeof fetch).resolveHusaryHafs(105), /origin/);
});

test('QuranEnc preserves provider payload and blocks unreviewed version updates', async () => {
  const translation = { result: [{ sura: '105', aya: '1', translation: 'Exact provider text.' }] };
  const fetcher = async (input: string | URL | Request) => String(input).includes('/translations/list/')
    ? Response.json([{ key: 'english_rwwad', version: '1.0.19' }])
    : Response.json(translation);
  assert.deepEqual(await new QuranEncClient(fetcher as typeof fetch).getSurah('quranenc-english-rowwad', 105), {
    provider: 'quranenc', resourceId: 'quranenc-english-rowwad', providerResourceId: 'english_rwwad',
    version: '1.0.19', locale: 'en', publisher: 'Rowwad Translation Center',
    attributionText: 'Rowwad Translation Center, provided by QuranEnc. Provider text is unmodified.', data: translation,
  });

  const updated = async () => Response.json([{ key: 'english_rwwad', version: '1.0.20' }]);
  await assert.rejects(new QuranEncClient(updated as typeof fetch).getSurah('quranenc-english-rowwad', 105), /requires review/);
});
