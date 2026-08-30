import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EXPECTED_AYAH_COUNTS, MP3QURAN_PERMISSION_URL, PREVIEW_SURAH_NUMBERS } from './constants';
import type { PreviewAudioInputs } from './types';

test('retains one validated direct-stream Al-Husary record for every preview Surah', () => {
  const input = JSON.parse(readFileSync(join(process.cwd(), 'packages/content-preview/source-inputs/mp3quran/husary-118/streams.json'), 'utf8')) as PreviewAudioInputs;
  expect(input.streams.map(stream => stream.surahId)).toEqual(PREVIEW_SURAH_NUMBERS);
  input.streams.forEach(stream => {
    expect(stream).toMatchObject({ reciterId: 118, mushafId: 118, riwayahId: 1, deliveryMode: 'stream_only', permissionEvidenceUrl: MP3QURAN_PERMISSION_URL });
    expect(new URL(stream.uri).hostname).toBe('server13.mp3quran.net');
    expect(stream.segments).toHaveLength(EXPECTED_AYAH_COUNTS[stream.surahId]);
  });
  expect(input.streams.reduce((total, stream) => total + stream.segments.length, 0)).toBe(157);
});
