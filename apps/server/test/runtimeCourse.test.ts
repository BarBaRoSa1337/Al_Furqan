import assert from 'node:assert/strict';
import test from 'node:test';
import surahAlFilPackage from '../../../src/content/packages/surah-al-fil/v1';
import { validatePackage } from '../../../src/lib/content/packageValidator';
import type { QuranContentProvider, QuranProviderResult } from '../src/quranContentProvider';
import { QuranEncClient } from '../src/quranEnc';
import { buildShortSurahRuntimeCourse } from '../src/runtimeCourse';

const selected = surahAlFilPackage.surahs.filter(surah => surah.surahNumber >= 105);
const resources = { translationId: 131, tafsirId: 169, chapterInfoId: 1, recitationId: 6 };

function result<T>(data: T): QuranProviderResult<T> {
  return {
    data,
    fetchedAt: '2026-08-03T00:00:00.000Z',
    expiresAt: '2026-08-10T00:00:00.000Z',
    provider: 'quran-foundation',
    sourceVersion: 'content-api-v4',
    cacheStatus: 'miss',
  };
}

function ayahCount(surah: number): number {
  return selected.find(item => item.surahNumber === surah)?.ayahCount ?? 0;
}

function provider(overrides: Partial<QuranContentProvider> = {}): QuranContentProvider {
  const base: QuranContentProvider = {
    searchQuran: async () => result({ result: { navigation: [], verses: [] } }),
    listChapters: async () => result(selected.map(surah => ({
      id: surah.surahNumber,
      versesCount: surah.ayahCount,
      revelationOrder: surah.revelationOrder,
      revelationPlace: surah.revelationPlace === 'makkah' ? 'makkah' : 'madinah',
      nameArabic: surah.arabicName,
      nameSimple: surah.transliteratedName,
      translatedName: { name: surah.englishName, languageName: 'english' },
    }))),
    getVerse: async (surah, ayah) => result(verse(surah, ayah)),
    getChapterVerses: async surah => result(Array.from({ length: ayahCount(surah) }, (_, index) => verse(surah, index + 1))),
    getChapterInfo: async surah => result({
      id: surah,
      chapterId: surah,
      text: `<p>Exact chapter information ${surah}</p>`,
      shortText: `<p>Exact short chapter information ${surah}</p>`,
      source: 'Quran Foundation',
      languageName: 'english',
      resourceId: resources.chapterInfoId,
    }),
    getChapterRecitation: async surah => result(Array.from({ length: ayahCount(surah) }, (_, index) => ({
      verseKey: `${surah}:${index + 1}`,
      audioUrl: `https://verses.quran.com/mock/${surah}${String(index + 1).padStart(3, '0')}.mp3`,
      format: 'mp3',
    }))),
    getTafsir: async (surah, ayah) => result({
      resourceId: resources.tafsirId,
      resourceName: 'Mock Tafsir',
      languageName: 'english',
      text: `<p>Exact tafsir ${surah}:${ayah}</p>`,
    }),
    listResources: async () => result({
      translations: [{ id: resources.translationId, name: 'Mock Translation', authorName: 'Mock Publisher', languageName: 'english' }],
      tafsirs: [{ id: resources.tafsirId, name: 'Mock Tafsir', authorName: 'Mock Publisher', languageName: 'english' }],
      chapterInfos: [{ id: resources.chapterInfoId, name: 'Mock Chapter Information', languageName: 'english' }],
      recitations: [{ id: resources.recitationId, reciterName: 'Mahmoud Khalil Al-Husary', style: 'Hafs' }],
    }),
  };
  return { ...base, ...overrides };
}

function verse(surah: number, ayah: number) {
  return {
    id: surah * 1000 + ayah,
    verseNumber: ayah,
    verseKey: `${surah}:${ayah}`,
    chapterId: surah,
    textUthmani: `نَصٌّ ${surah}:${ayah}`,
    words: [
      { position: 1, textUthmani: 'نَصٌّ', charTypeName: 'word', transliteration: { text: 'nass' }, translation: { text: 'text' } },
      { position: 2, textUthmani: 'قُرْآن', charTypeName: 'word', transliteration: { text: 'quran' }, translation: { text: 'Quran' } },
    ],
    translations: [{
      resourceId: resources.translationId,
      resourceName: 'Mock Translation',
      languageName: 'english',
      verseKey: `${surah}:${ayah}`,
      text: `<p>Translation ${surah}:${ayah}<sup foot_note=1>1</sup></p>`,
      footNotes: { '1': `Footnote ${surah}:${ayah}` },
    }],
  };
}

const dependencies = { quranFoundation: provider(), resources };

test('assembles a validated ten-Surah Quran Foundation practice course', async () => {
  const built = await buildShortSurahRuntimeCourse('en', dependencies);
  assert.ok(built);
  const contentPackage = built.package;
  assert.equal(contentPackage.ayat.length, 48);
  assert.equal(contentPackage.learningPaths[0].surahCurricula?.length, 10);
  assert.equal(contentPackage.levels.length, 69);
  assert.equal(contentPackage.ayat.every(ayah => ayah.wordMeanings?.length === ayah.wordTokenIds.length), true);
  assert.equal(contentPackage.ayat.every(ayah => ayah.tafsirEntries.length === 1), true);
  assert.equal(contentPackage.recitationTracks.length, 48);
  assert.equal(contentPackage.sources.every(source => source.publisher === 'Quran Foundation'), true);
  assert.equal(built.attributions.every(item => item.provider === 'quran-foundation'), true);
  assert.equal(contentPackage.ayat[0].translations[0].providerText, '<p>Translation 105:1<sup foot_note=1>1</sup></p>');
  assert.deepEqual(contentPackage.ayat[0].translations[0].providerFootnotes, { '1': 'Footnote 105:1' });
  assert.equal(contentPackage.levels.some(level => level.steps.some(step => step.blocks.some(block => block.type === 'context'))), true);
  assert.equal(contentPackage.levels.some(level => level.steps.some(step => step.blocks.some(block => block.type === 'activity' && block.activity.kind === 'complete_ayah'))), true);
  assert.equal(contentPackage.levels.some(level => level.steps.some(step => step.blocks.some(block => block.type === 'activity' && block.activity.kind === 'type_missing_text'))), false);
  assert.equal(contentPackage.learningPaths[0].surahCurricula?.flatMap(curriculum => curriculum.lessons).filter(lesson => lesson.kind === 'segment_review').length, 1);
  assert.deepEqual(contentPackage.learningPaths[0].surahIds.at(-1), 'surah-114');
  assert.deepEqual(contentPackage.learningPaths[0].surahCurricula?.[0].lessons.map(item => item.levelId), [
    'al-fil-level-introduction', 'al-fil-level-1-context-ayah-1', 'al-fil-level-2-ayah-2',
    'al-fil-level-3-ayah-3', 'al-fil-level-4-ayah-4', 'al-fil-level-5-ayah-5', 'al-fil-level-final-review',
  ]);
  assert.deepEqual(validatePackage(contentPackage, { mode: 'development' }).errors, []);
});

test('omits unavailable optional QF resources without fabricating learner locks', async () => {
  const unavailable = async () => { throw new Error('Resource unavailable'); };
  const built = await buildShortSurahRuntimeCourse('en', {
    resources,
    quranFoundation: provider({
      getTafsir: unavailable,
      getChapterInfo: unavailable,
      getChapterRecitation: unavailable,
    }),
  });
  assert.ok(built);
  const locked = built.package.levels.flatMap(level => level.steps.flatMap(step => step.blocks)).filter(block => block.type === 'source_locked');
  assert.equal(locked.length, 0);
  assert.equal(built.package.levels.some(level => level.steps.some(step => step.blocks.some(block => block.type === 'context'))), false);
  assert.equal(built.package.levels.some(level => level.steps.some(step => step.blocks.some(block => block.type === 'audio'))), false);
  assert.deepEqual(validatePackage(built.package, { mode: 'development' }).errors, []);
});

test('fails closed for incomplete lesson locales', async () => {
  assert.equal(await buildShortSurahRuntimeCourse('fr', dependencies), undefined);
  assert.equal(await buildShortSurahRuntimeCourse('ar', dependencies), undefined);
});

test('uses QuranEnc fallback with exact provenance when configured QF translation is absent', async () => {
  const fallbackProvider = provider({
    listResources: async () => result({
      translations: [],
      tafsirs: [{ id: resources.tafsirId, name: 'Mock Tafsir', authorName: 'Mock Publisher', languageName: 'english' }],
      chapterInfos: [{ id: resources.chapterInfoId, name: 'Mock Chapter Information', languageName: 'english' }],
      recitations: [{ id: resources.recitationId, reciterName: 'Mahmoud Khalil Al-Husary', style: 'Hafs' }],
    }),
  });
  const registry = { translations: [{
    key: 'english_rwwad', version: '1.0.19', last_update: '2026-03-12',
    title: 'Rowwad Translation', description: 'Exact transcript information.',
  }] };
  const fetcher = async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes('/translations/list/')) return Response.json(registry);
    const surah = Number(url.split('/').at(-1));
    return Response.json({ result: Array.from({ length: ayahCount(surah) }, (_, index) => ({
      sura: String(surah), aya: String(index + 1),
      translation: `  Exact QuranEnc ${surah}:${index + 1}.  `,
      footnotes: index === 0 ? `Footnote ${surah}.` : '',
    })) });
  };
  const built = await buildShortSurahRuntimeCourse('en', {
    quranFoundation: fallbackProvider,
    quranEnc: new QuranEncClient(fetcher as typeof fetch, () => new Date('2026-08-13T00:00:00.000Z')),
    resources,
  });
  assert.ok(built);
  const translation = built.package.ayat[0].translations[0];
  assert.equal(translation.text, '  Exact QuranEnc 105:1.  ');
  assert.equal(translation.footnotes, 'Footnote 105.');
  assert.equal(translation.sourceId, 'quranenc-english-rowwad');
  assert.equal(translation.providerResourceId, 'english_rwwad');
  assert.equal(translation.resourceVersion, '1.0.19');
  assert.equal(built.package.sources.some(source => source.id === 'quranenc-english-rowwad' && source.publisher === 'QuranEnc'), true);
  assert.equal(built.attributions.some(item => item.provider === 'quranenc' && item.resourceId === 'english_rwwad'), true);
  assert.equal(built.package.sources.some(source => source.id === 'quran-foundation-translation'), false);
  assert.deepEqual(validatePackage(built.package, { mode: 'development' }).errors, []);
});

test('does not hide QF operational failures behind QuranEnc fallback', async () => {
  const fetcher = async () => { throw new Error('QuranEnc must not be called'); };
  await assert.rejects(buildShortSurahRuntimeCourse('en', {
    quranFoundation: provider({
      getChapterVerses: async () => { throw new Error('401 Unauthorized'); },
    }),
    quranEnc: new QuranEncClient(fetcher as typeof fetch),
    resources,
  }), /401 Unauthorized/);
});

test('requires explicit English tafsir selection and propagates auth failures', async () => {
  await assert.rejects(buildShortSurahRuntimeCourse('en', {
    quranFoundation: provider({
      getTafsir: async () => { throw new Error('401 Unauthorized'); },
    }),
    resources,
  }), /401 Unauthorized/);

  await assert.rejects(buildShortSurahRuntimeCourse('en', {
    quranFoundation: provider({
      listResources: async () => result({
        translations: [{ id: resources.translationId, name: 'Mock Translation', languageName: 'english' }],
        tafsirs: [{ id: resources.tafsirId, name: 'Russian Tafsir', languageName: 'russian' }],
        chapterInfos: [{ id: resources.chapterInfoId, name: 'Mock Chapter Information', languageName: 'english' }],
        recitations: [{ id: resources.recitationId, reciterName: 'Mahmoud Khalil Al-Husary' }],
      }),
    }),
    resources,
  }), /not English/);
});
