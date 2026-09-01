import {
  isQuranSearchResponse,
  type QuranSearchResult,
  type SupportedLocale,
} from '../../../packages/api-contracts/src';
import type { ContentRepository, QuranLookup } from '../../types/content';
import { getRuntimeApiBaseUrl } from './runtimeClient';
import { getContentRepository } from './repository';

export interface QuranSearchOutcome {
  results: QuranSearchResult[];
  remoteUnavailable: boolean;
}

export function buildQuranSearchUrl(baseUrl: string, query: string, language: SupportedLocale): string {
  const params = new URLSearchParams({ q: query, language });
  return `${baseUrl}/v1/quran/search?${params}`;
}

export async function searchQuran(query: string, language: SupportedLocale, signal?: AbortSignal): Promise<QuranSearchOutcome> {
  const normalized = query.trim();
  if (!normalized) return { results: [], remoteUnavailable: false };
  const repo = getContentRepository();
  const local = searchLocalQuran(repo, normalized);
  const baseUrl = getRuntimeApiBaseUrl();
  if (!baseUrl) return { results: local, remoteUnavailable: true };
  try {
    const response = await fetch(buildQuranSearchUrl(baseUrl, normalized, language), { headers: { accept: 'application/json' }, signal });
    const body = await response.json() as unknown;
    if (!response.ok || !isQuranSearchResponse(body)) throw new Error('Quran search response is unavailable.');
    return { results: mergeResults(local, body.results), remoteUnavailable: false };
  } catch (cause) {
    if (signal?.aborted) throw cause;
    return { results: local, remoteUnavailable: true };
  }
}

export function searchLocalQuran(repo: ContentRepository, query: string): QuranSearchResult[] {
  const pkg = repo.getActivePackage();
  if (!pkg) return [];
  const scope = { activePackageIds: [pkg.id], editionId: 'hafs-an-asim' as const, studyLocale: pkg.localization.defaultLocale };
  const parsed = repo.parseDiscoveryQuery(query, scope);
  if (parsed.query.kind === 'quran_lookup') return lookupResult(repo, parsed.query.lookup, scope);

  const normalized = normalizeSearchValue(query);
  const arabicQuery = /[\u0600-\u06FF]/.test(normalized);
  const surahs = pkg.surahs.filter(surah => [surah.arabicName, surah.transliteratedName].some(name => {
    const candidate = normalizeSearchValue(name);
    return arabicQuery ? candidate === normalized : candidate.includes(normalized);
  })).map(surah => ({
    id: `surah:${surah.surahNumber}`,
    kind: 'surah' as const,
    key: String(surah.surahNumber),
    displayName: surah.transliteratedName,
    arabicText: surah.arabicName,
    surahNumber: surah.surahNumber,
  }));
  const ayat = pkg.ayat.filter(ayah => normalizeSearchValue(ayah.arabicText.text).includes(normalized)).slice(0, 20).map(ayah => ({
    id: `ayah:${ayah.ref.surahNumber}:${ayah.ref.ayahNumber}`,
    kind: 'ayah' as const,
    key: `${ayah.ref.surahNumber}:${ayah.ref.ayahNumber}`,
    arabicText: ayah.arabicText.text,
    surahNumber: ayah.ref.surahNumber,
    ayahNumber: ayah.ref.ayahNumber,
  }));
  return mergeResults(surahs, ayat).slice(0, 20);
}

function lookupResult(repo: ContentRepository, lookup: QuranLookup, scope: Parameters<ContentRepository['parseDiscoveryQuery']>[1]): QuranSearchResult[] {
  if (lookup.type === 'surah') {
    const surah = repo.getSurahByNumber(lookup.surahNumber, scope);
    return surah ? [{ id: `surah:${surah.surahNumber}`, kind: 'surah', key: String(surah.surahNumber), displayName: surah.transliteratedName, arabicText: surah.arabicName, surahNumber: surah.surahNumber }] : [];
  }
  if (lookup.type === 'ayah') {
    const ayah = repo.getAyahByRef(lookup.ayahRef, 'hafs-an-asim', scope);
    return ayah ? [{ id: `ayah:${ayah.ref.surahNumber}:${ayah.ref.ayahNumber}`, kind: 'ayah', key: `${ayah.ref.surahNumber}:${ayah.ref.ayahNumber}`, arabicText: ayah.arabicText.text, surahNumber: ayah.ref.surahNumber, ayahNumber: ayah.ref.ayahNumber }] : [];
  }
  if (lookup.type === 'juz' || lookup.type === 'hizb') {
    const refs = repo.listAyahRefsInDivision(lookup.type, lookup.number, 'hafs-an-asim', scope);
    return refs.length > 0 ? [{ id: `${lookup.type}:${lookup.number}`, kind: lookup.type, key: String(lookup.number), displayName: `${lookup.type === 'juz' ? 'Juz' : 'Hizb'} ${lookup.number}` }] : [];
  }
  return [];
}

function normalizeSearchValue(value: string): string {
  return value.normalize('NFKD').replace(/[\u0640\u064B-\u065F\u0670]/g, '').trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

function mergeResults(first: readonly QuranSearchResult[], second: readonly QuranSearchResult[]): QuranSearchResult[] {
  const seen = new Set<string>();
  return [...first, ...second].filter(item => !seen.has(item.id) && Boolean(seen.add(item.id))).slice(0, 20);
}
