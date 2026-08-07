import assert from 'node:assert/strict';
import test from 'node:test';
import { MemoryServerCache, QF_MAX_CACHE_SECONDS } from '../src/cache';
import type { QuranProviderVerse } from '../src/quranContentProvider';
import { QuranFoundationProvider } from '../src/quranFoundation';

function sdk(chapterCalls: { count: number }) {
  return {
    content: { v4: {
      chapters: {
        list: async () => {
          chapterCalls.count += 1;
          return [{ id: 105, versesCount: 5, nameArabic: 'الفيل' }];
        },
        getInfoResponse: async () => ({ chapterInfo: undefined }),
      },
      verses: {
        byKey: async () => ({ id: 1, verseNumber: 1, verseKey: '105:1' }),
        byChapter: async (): Promise<QuranProviderVerse[]> => [],
      },
      audio: { verseRecitation: { byChapter: async () => ({ audioFiles: [] }) } },
      resources: {
        translations: { list: async () => [] },
        tafsirs: { list: async () => [] },
        chapterInfos: { list: async () => [] },
        recitations: { list: async () => [] },
      },
      raw: { getFootNote: async ({ path }: { path: { id: string } }) => ({ footNote: { id: Number(path.id), text: `Exact footnote ${path.id}.` } }) },
    } },
  };
}

test('QF provider caches an allowlisted SDK operation for no more than seven days', async () => {
  const calls = { count: 0 };
  const now = new Date('2026-01-01T00:00:00.000Z');
  const provider = new QuranFoundationProvider(
    { environment: 'prelive', clientId: 'client', clientSecret: 'secret' },
    new MemoryServerCache(),
    fetch,
    () => now,
    sdk(calls) as never,
  );

  const first = await provider.listChapters('en');
  const second = await provider.listChapters('en');
  assert.equal(first.cacheStatus, 'miss');
  assert.equal(second.cacheStatus, 'hit');
  assert.equal(calls.count, 1);
  assert.equal(Date.parse(first.expiresAt!) - Date.parse(first.fetchedAt), QF_MAX_CACHE_SECONDS * 1000);
  assert.equal(JSON.stringify(first).includes('secret'), false);
});

test('QF provider deletes expired content and refreshes it', async () => {
  const calls = { count: 0 };
  let now = new Date('2026-01-01T00:00:00.000Z');
  const provider = new QuranFoundationProvider(
    { environment: 'production', clientId: 'client', clientSecret: 'secret' },
    new MemoryServerCache(),
    fetch,
    () => now,
    sdk(calls) as never,
  );
  await provider.listChapters('en');
  now = new Date('2026-01-08T00:00:00.001Z');
  const refreshed = await provider.listChapters('en');
  assert.equal(refreshed.cacheStatus, 'miss');
  assert.equal(calls.count, 2);
});

test('QF provider rejects malformed identifiers and exposes no generic proxy method', async () => {
  const provider = new QuranFoundationProvider(
    { environment: 'prelive', clientId: 'client', clientSecret: 'secret' },
    new MemoryServerCache(),
    fetch,
    undefined,
    sdk({ count: 0 }) as never,
  );
  assert.throws(() => provider.getVerse(115, 1, 'en'), /chapter identifier/);
  assert.throws(() => provider.getTafsir(105, 1, 0), /resource identifier/);
  assert.equal('get' in provider, false);
});

test('QF provider hydrates referenced translation footnotes without rewriting them', async () => {
  const mock = sdk({ count: 0 });
  mock.content.v4.verses.byChapter = async () => [{
    id: 1,
    verseNumber: 1,
    verseKey: '105:1',
    translations: [{ resourceId: 131, text: 'Provider text.<sup foot_note=42>1</sup>' }],
  }];
  const provider = new QuranFoundationProvider(
    { environment: 'prelive', clientId: 'client', clientSecret: 'secret' },
    new MemoryServerCache(),
    fetch,
    undefined,
    mock as never,
  );
  const response = await provider.getChapterVerses(105, 'en', { translationId: 131 });
  assert.equal(response.data[0].translations?.[0].text, 'Provider text.<sup foot_note=42>1</sup>');
  assert.deepEqual(response.data[0].translations?.[0].footNotes, { '42': 'Exact footnote 42.' });
});
