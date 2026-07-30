import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  QuranStructureSnapshot,
  stableStringify,
} from '../src/lib/content/structureImporter';

const DEFAULT_API_BASE = 'https://api.quran.com/api/v4';
const SOURCE_ID = 'quran-foundation-structure-v4';
const EDITION_ID = 'hafs-an-asim';
const CONCURRENCY = 8;

interface ProviderChapter {
  id: number;
  revelation_place: 'makkah' | 'madinah';
  revelation_order: number;
  name_simple: string;
  name_arabic: string;
  verses_count: number;
  translated_name: { name: string };
}

interface ProviderVerse {
  verse_key: string;
  juz_number: number;
  hizb_number: number;
  rub_el_hizb_number: number;
  page_number?: number;
  ruku_number?: number;
  manzil_number?: number;
}

interface Pagination {
  current_page: number;
  next_page: number | null;
}

async function main() {
  const apiBase = process.env.QURAN_API_BASE ?? DEFAULT_API_BASE;
  const retrievedAt = new Date().toISOString();
  const chaptersResponse = await getJson<{ chapters: ProviderChapter[] }>(`${apiBase}/chapters?language=en`);
  if (chaptersResponse.chapters.length !== 114) {
    throw new Error(`Expected 114 Surahs, received ${chaptersResponse.chapters.length}`);
  }

  const chapterNumbers = Array.from({ length: 114 }, (_, index) => index + 1);
  const verseGroups = await mapConcurrent(chapterNumbers, CONCURRENCY, number => fetchChapterVerses(apiBase, number));
  const verses = verseGroups.flat().sort((a, b) => compareVerseKeys(a.verse_key, b.verse_key));
  if (verses.length !== 6236) throw new Error(`Expected 6236 ayat, received ${verses.length}`);

  const normalizedVerses = verses.map(verse => ({
    verseKey: verse.verse_key,
    juzNumber: verse.juz_number,
    hizbNumber: verse.hizb_number,
    rubElHizbNumber: verse.rub_el_hizb_number,
    pageNumber: verse.page_number,
    rukuNumber: verse.ruku_number,
    manzilNumber: verse.manzil_number,
  }));
  const divisions = [
    ...buildDivisions('juz', 30, normalizedVerses, verse => verse.juzNumber),
    ...buildDivisions('hizb', 60, normalizedVerses, verse => verse.hizbNumber),
    ...buildDivisions('rub_el_hizb', 240, normalizedVerses, verse => verse.rubElHizbNumber),
  ];
  const surahs = chaptersResponse.chapters
    .sort((a, b) => a.id - b.id)
    .map(chapter => ({
      number: chapter.id,
      arabicName: chapter.name_arabic,
      transliteratedName: chapter.name_simple,
      englishName: chapter.translated_name.name,
      ayahCount: chapter.verses_count,
      revelationOrder: chapter.revelation_order,
      revelationPlace: chapter.revelation_place,
    }));
  const contentHash = createHash('sha256')
    .update(stableStringify({ divisions, surahs, verses: normalizedVerses }))
    .digest('hex');
  const snapshot: QuranStructureSnapshot = {
    source: {
      id: SOURCE_ID,
      version: `content-api-v4-${retrievedAt.slice(0, 10)}`,
      endpoint: apiBase,
      retrievedAt,
      contentHash,
    },
    editionId: EDITION_ID,
    surahs,
    divisions,
    verses: normalizedVerses,
  };
  const outputPath = resolve(process.cwd(), process.argv[2] ?? 'src/content/structure/hafs/full.json');
  writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${surahs.length} Surahs, ${verses.length} ayat, and ${divisions.length} divisions to ${outputPath}`);
}

async function fetchChapterVerses(apiBase: string, chapter: number): Promise<ProviderVerse[]> {
  const verses: ProviderVerse[] = [];
  let page = 1;
  do {
    const fields = 'verse_key,juz_number,hizb_number,rub_el_hizb_number,page_number,ruku_number,manzil_number';
    const response = await getJson<{ verses: ProviderVerse[]; pagination: Pagination }>(
      `${apiBase}/verses/by_chapter/${chapter}?fields=${fields}&per_page=50&page=${page}`,
    );
    verses.push(...response.verses);
    if (!response.pagination.next_page) break;
    page = response.pagination.next_page;
  } while (true);
  return verses;
}

async function getJson<T>(url: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (process.env.QF_ACCESS_TOKEN) headers['x-auth-token'] = process.env.QF_ACCESS_TOKEN;
  if (process.env.QF_CLIENT_ID) headers['x-client-id'] = process.env.QF_CLIENT_ID;
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json() as T;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise(resolveDelay => setTimeout(resolveDelay, attempt * 500));
    }
  }
  throw new Error(`Quran Foundation request failed for ${url}: ${String(lastError)}`);
}

function buildDivisions(
  kind: 'juz' | 'hizb' | 'rub_el_hizb',
  count: number,
  verses: QuranStructureSnapshot['verses'],
  numberFor: (verse: QuranStructureSnapshot['verses'][number]) => number,
): QuranStructureSnapshot['divisions'] {
  return Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    const members = verses.filter(verse => numberFor(verse) === number);
    if (members.length === 0) throw new Error(`${kind} ${number} has no ayat`);
    return { kind, number, start: members[0].verseKey, end: members[members.length - 1].verseKey };
  });
}

async function mapConcurrent<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index]);
    }
  }));
  return results;
}

function compareVerseKeys(a: string, b: string): number {
  const [aSurah, aAyah] = a.split(':').map(Number);
  const [bSurah, bAyah] = b.split(':').map(Number);
  return aSurah - bSurah || aAyah - bAyah;
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
