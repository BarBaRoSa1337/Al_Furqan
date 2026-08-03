import assert from 'node:assert/strict';
import test from 'node:test';
import surahAlFilPackage from '../../../src/content/packages/surah-al-fil/v1';
import { validatePackage } from '../../../src/lib/content/packageValidator';
import { buildShortSurahRuntimeCourse } from '../src/runtimeCourse';

const selected = surahAlFilPackage.surahs.filter(surah => surah.surahNumber >= 105);

const dependencies = {
  quranFoundation: {
    get: async (path: string) => {
      const match = path.match(/(\d+):(\d+)$/);
      if (!match) throw new Error('Unexpected Quran Foundation path');
      const [surah, ayah] = [Number(match[1]), Number(match[2])];
      return {
        data: { verse: { verse_key: `${surah}:${ayah}`, text_uthmani: `نَصّ ${surah}:${ayah}`, words: [
          { position: 1, text_uthmani: 'نَصّ', char_type_name: 'word', transliteration: { text: 'nass' } },
          { position: 2, text_uthmani: 'قُرْآن', char_type_name: 'word', transliteration: { text: 'quran' } },
        ] } },
        fetchedAt: '2026-08-03T00:00:00.000Z', expiresAt: '2026-08-04T00:00:00.000Z',
        provider: 'quran-foundation' as const, sourceVersion: 'content-api-v4' as const, cacheStatus: 'miss' as const,
      };
    },
  },
  quranEnc: {
    getSurah: async (_resource: string, surah: number) => ({
      provider: 'quranenc' as const, resourceId: 'quranenc-english-rowwad' as const, providerResourceId: 'english_rwwad',
      version: '1.0.19', locale: 'en', publisher: 'Rowwad Translation Center', attributionText: 'Provider text is unmodified.',
      data: { result: Array.from({ length: selected.find(item => item.surahNumber === surah)?.ayahCount ?? 0 }, (_, index) => ({ sura: String(surah), aya: String(index + 1), translation: `Translation ${surah}:${index + 1}` })) },
    }),
  },
  mp3Quran: {
    resolveHusaryHafs: async (surah: number) => ({
      provider: 'mp3quran' as const, reciterId: 118 as const, mushafId: 118 as const, riwayahId: 1 as const, surahId: surah,
      uri: `https://server13.mp3quran.net/husr/${String(surah).padStart(3, '0')}.mp3`, approvedHostnames: ['server13.mp3quran.net'] as const,
      segments: Array.from({ length: selected.find(item => item.surahNumber === surah)?.ayahCount ?? 0 }, (_, index) => ({ ayah: index + 1, startMs: index * 1000, endMs: (index + 1) * 1000 })),
      deliveryMode: 'stream_only' as const, providerVersion: 'api-v3' as const, attributionText: 'Streamed from MP3Quran.net.', permissionEvidenceUrl: 'https://www.mp3quran.net/privacy-en.html',
    }),
  },
};

test('assembles a validated ten-Surah canonical practice course', async () => {
  const result = await buildShortSurahRuntimeCourse('en', dependencies as never);
  assert.ok(result);
  const contentPackage = result.package;
  assert.equal(contentPackage.ayat.length, 48);
  assert.equal(contentPackage.learningPaths[0].surahCurricula?.length, 10);
  assert.equal(contentPackage.levels.length, 68);
  assert.deepEqual(contentPackage.learningPaths[0].surahIds.at(-1), 'surah-114');
  assert.deepEqual(contentPackage.learningPaths[0].surahCurricula?.[0].lessons.map(item => item.levelId), [
    'al-fil-level-introduction', 'al-fil-level-1-context-ayah-1', 'al-fil-level-2-ayah-2',
    'al-fil-level-3-ayah-3', 'al-fil-level-4-ayah-4', 'al-fil-level-5-ayah-5', 'al-fil-level-final-review',
  ]);
  assert.deepEqual(validatePackage(contentPackage, { mode: 'development' }).errors, []);
});

test('fails closed for incomplete lesson locales', async () => {
  assert.equal(await buildShortSurahRuntimeCourse('fr', dependencies as never), undefined);
  assert.equal(await buildShortSurahRuntimeCourse('ar', dependencies as never), undefined);
});
