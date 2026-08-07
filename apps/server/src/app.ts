import type { ApiErrorResponse, ContentMode, SourceAttribution, SupportedLocale } from '../../../packages/api-contracts/src';
import { isSupportedLocale } from '../../../packages/api-contracts/src';
import type { ContentPackage } from '../../../src/types/content';
import { validatePackage } from '../../../src/lib/content/packageValidator';
import type { QuranContentProvider } from './quranContentProvider';
import type { QuranEncClient } from './quranEnc';
import type { Mp3QuranClient } from './mp3Quran';

export interface ServerDependencies {
  quranFoundation: QuranContentProvider;
  quranEnc: QuranEncClient;
  mp3Quran: Mp3QuranClient;
  allowedOrigins: string[];
  approvedQuranFoundationTafsirIds?: string[];
  previewPackage?: (packageId: string, locale: SupportedLocale) => Promise<{ package: unknown; attributions: SourceAttribution[] } | undefined>;
  publishedPackage?: (packageId: string, locale: SupportedLocale) => Promise<{ package: unknown; attributions: SourceAttribution[] } | undefined>;
  security?: {
    maxRequestsPerMinute?: number;
    now?: () => number;
  };
}

export function createApp(dependencies: ServerDependencies): (request: Request) => Promise<Response> {
  const requestWindows = new Map<string, { startedAt: number; count: number }>();
  const maxRequests = dependencies.security?.maxRequestsPerMinute ?? 120;
  const now = dependencies.security?.now ?? Date.now;

  return async request => {
    const origin = request.headers.get('origin');
    if (origin && !dependencies.allowedOrigins.includes(origin)) return error(403, 'bad_request', 'Origin is not allowed', false);
    if (request.url.length > 2_048) return error(400, 'bad_request', 'Request URL is too large', false, origin);
    if (!consumeRequest(requestWindows, request, maxRequests, now())) return error(429, 'rate_limited', 'Too many requests', true, origin);
    if (request.method !== 'GET') return error(405, 'bad_request', 'Method not allowed', false);
    const url = new URL(request.url);
    try {
      if (url.pathname === '/health') return json({ status: 'ok' }, 200, origin);
      if (url.pathname === '/v1/quran/chapters') {
        const language = locale(url.searchParams.get('language'));
        const result = await dependencies.quranFoundation.listChapters(language);
        return json({ ...result, data: { chapters: result.data } }, 200, origin, 'no-store');
      }
      const verse = url.pathname.match(/^\/v1\/quran\/verses\/(\d{1,3})\/(\d{1,3})$/);
      if (verse) {
        const [surah, ayah] = [bounded(verse[1], 114), bounded(verse[2], 300)];
        const result = await dependencies.quranFoundation.getVerse(surah, ayah, 'ar');
        return json({ ...result, data: { verse: result.data } }, 200, origin, 'no-store');
      }
      const structure = url.pathname.match(/^\/v1\/quran\/structure\/(\d{1,3})$/);
      if (structure) {
        const surah = bounded(structure[1], 114);
        const result = await dependencies.quranFoundation.getChapterVerses(surah, 'ar');
        return json({ ...result, data: { verses: result.data } }, 200, origin, 'no-store');
      }
      const tafsir = url.pathname.match(/^\/v1\/tafsir\/quran-foundation\/(\d+)\/(\d{1,3})\/(\d{1,3})$/);
      if (tafsir) {
        const tafsirId = tafsir[1];
        if (!dependencies.approvedQuranFoundationTafsirIds?.includes(tafsirId)) throw new Error('QF tafsir resource is not approved');
        const [surah, ayah] = [bounded(tafsir[2], 114), bounded(tafsir[3], 300)];
        const result = await dependencies.quranFoundation.getTafsir(surah, ayah, Number(tafsirId));
        return json({ ...result, data: { tafsir: result.data } }, 200, origin, 'no-store');
      }
      const translation = url.pathname.match(/^\/v1\/translations\/quranenc\/([a-z0-9-]+)\/(\d{1,3})$/);
      if (translation) return json(await dependencies.quranEnc.getSurah(translation[1], bounded(translation[2], 114)), 200, origin, 'no-store');
      const audio = url.pathname.match(/^\/v1\/audio\/mp3quran\/mahmoud-khalil-al-husary\/(\d{1,3})$/);
      if (audio) return json(await dependencies.mp3Quran.resolveHusaryHafs(bounded(audio[1], 114)), 200, origin, 'no-store');
      const availability = url.pathname.match(/^\/v1\/content\/lessons\/([a-z0-9-]+)\/availability$/);
      if (availability) return json({ lessonId: availability[1], publications: [{ locale: 'en', status: 'draft', version: 'candidate', availableAlternatives: [] }, { locale: 'ar', status: 'unavailable', version: '0', availableAlternatives: ['en'] }, { locale: 'fr', status: 'unavailable', version: '0', availableAlternatives: ['en'] }] }, 200, origin, 'no-store');
      const runtime = url.pathname.match(/^\/v1\/content\/packages\/([a-z0-9-]+)$/);
      if (runtime) {
        const selectedLocale = locale(url.searchParams.get('locale'));
        const selectedMode = contentMode(url.searchParams.get('contentMode'));
        const resolver = selectedMode === 'preview' ? dependencies.previewPackage : dependencies.publishedPackage;
        const contentPackage = await resolver?.(runtime[1], selectedLocale);
        if (!contentPackage) {
          const message = selectedMode === 'preview'
            ? 'Preview lesson package is unavailable'
            : 'No approved lesson package is available';
          return error(404, 'not_available', message, false, origin);
        }
        const validation = validatePackage(contentPackage.package as ContentPackage, {
          mode: selectedMode === 'preview' ? 'development' : 'production',
        });
        if (!validation.valid) return error(503, 'upstream_unavailable', `${selectedMode} package validation failed`, false, origin);
        return json({ packageId: runtime[1], locale: selectedLocale, contentMode: selectedMode, package: contentPackage.package, attributions: contentPackage.attributions }, 200, origin, 'no-store');
      }
      return error(404, 'not_found', 'Route not found', false, origin);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Upstream request failed';
      const badInput = /invalid|not approved|allowlisted/i.test(message);
      return error(badInput ? 400 : 503, badInput ? 'bad_request' : 'upstream_unavailable', message, !badInput, origin);
    }
  };
}

function consumeRequest(
  windows: Map<string, { startedAt: number; count: number }>,
  request: Request,
  limit: number,
  now: number,
): boolean {
  const key = request.headers.get('x-real-ip') ?? 'anonymous';
  const current = windows.get(key);
  if (!current || now - current.startedAt >= 60_000) {
    windows.set(key, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}

function bounded(raw: string, maximum: number): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > maximum) throw new Error('Invalid identifier');
  return value;
}

function locale(raw: string | null): SupportedLocale {
  const value = raw ?? 'en';
  if (!isSupportedLocale(value)) throw new Error('Invalid locale');
  return value;
}

function contentMode(raw: string | null): ContentMode {
  if (raw === 'preview' || raw === 'production') return raw;
  return 'production';
}

function json(value: unknown, status: number, origin?: string | null, cacheControl = 'no-store'): Response {
  const headers: Record<string, string> = { 'content-type': 'application/json; charset=utf-8', 'cache-control': cacheControl, 'x-content-type-options': 'nosniff' };
  if (origin) { headers['access-control-allow-origin'] = origin; headers.vary = 'origin'; }
  return new Response(JSON.stringify(value), { status, headers });
}

function error(status: number, code: ApiErrorResponse['error']['code'], message: string, retryable: boolean, origin?: string | null): Response {
  return json({ error: { code, message, retryable } } satisfies ApiErrorResponse, status, origin);
}
