import { AsyncLocalStorage } from 'node:async_hooks';
import { createServerClient } from '@quranjs/api/server';
import type { ServerCache } from './cache';
import { boundedCacheSeconds, QF_MAX_CACHE_SECONDS } from './cache';
import type {
  QuranContentProvider,
  QuranProviderChapter,
  QuranProviderChapterInfo,
  QuranProviderLocale,
  QuranProviderRecitation,
  QuranProviderResourceCatalog,
  QuranProviderResourceConfig,
  QuranProviderResult,
  QuranProviderTafsir,
  QuranProviderVerse,
} from './quranContentProvider';

type ApiParams = Record<string, string | number | boolean | unknown[] | undefined | Record<string, boolean>>;

interface QuranFoundationSdk {
  content: {
    v4: {
      chapters: {
        list(query?: ApiParams): Promise<QuranProviderChapter[]>;
        getInfoResponse(id: string, query?: ApiParams): Promise<{ chapterInfo?: QuranProviderChapterInfo | null }>;
      };
      verses: {
        byKey(key: string, query?: ApiParams): Promise<QuranProviderVerse>;
        byChapter(id: string, query?: ApiParams): Promise<QuranProviderVerse[]>;
      };
      audio: {
        verseRecitation: {
          byChapter(chapterId: string, recitationId: string, query?: ApiParams): Promise<{ audioFiles: QuranProviderRecitation[] }>;
        };
      };
      resources: {
        translations: { list(query?: ApiParams): Promise<QuranProviderResourceCatalog['translations']> };
        tafsirs: { list(query?: ApiParams): Promise<QuranProviderResourceCatalog['tafsirs']> };
        chapterInfos: { list(query?: ApiParams): Promise<QuranProviderResourceCatalog['chapterInfos']> };
        recitations: { list(query?: ApiParams): Promise<QuranProviderResourceCatalog['recitations']> };
      };
      raw: {
        getFootNote(request: { path: { id: string } }): Promise<unknown>;
      };
    };
  };
}

export interface QuranFoundationConfig {
  environment: 'prelive' | 'production';
  clientId: string;
  clientSecret: string;
}

interface CachePolicyContext {
  cacheSeconds: number;
  noStore: boolean;
}

interface FetchLike {
  (input: string | URL | Request, init?: RequestInit): Promise<Response>;
}

export class QuranFoundationProvider implements QuranContentProvider {
  private readonly policyContext = new AsyncLocalStorage<CachePolicyContext>();
  private readonly sdk: QuranFoundationSdk;

  constructor(
    private readonly config: QuranFoundationConfig,
    private readonly cache: ServerCache,
    private readonly fetcher: FetchLike = fetch,
    private readonly now: () => Date = () => new Date(),
    sdk?: QuranFoundationSdk,
  ) {
    this.sdk = sdk ?? createServerClient({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      fetch: this.policyAwareFetch,
      ...(config.environment === 'prelive' ? {
        services: {
          gatewayUrl: 'https://apis-prelive.quran.foundation',
          oauth2BaseUrl: 'https://prelive-oauth2.quran.foundation',
        },
      } : {}),
    }) as unknown as QuranFoundationSdk;
  }

  listChapters(locale: QuranProviderLocale): Promise<QuranProviderResult<QuranProviderChapter[]>> {
    return this.cached(`chapters:${locale}`, () => this.sdk.content.v4.chapters.list({ language: locale }));
  }

  getVerse(chapter: number, ayah: number, locale: QuranProviderLocale): Promise<QuranProviderResult<QuranProviderVerse>> {
    const verseKey = this.verseKey(chapter, ayah);
    return this.cached(`verse:${verseKey}:${locale}`, () => this.sdk.content.v4.verses.byKey(verseKey, {
      fields: { textUthmani: true },
      language: locale,
      wordFields: { location: true, textUthmani: true },
      words: true,
    }));
  }

  getChapterVerses(
    chapter: number,
    locale: QuranProviderLocale,
    resources: Partial<QuranProviderResourceConfig> = {},
  ): Promise<QuranProviderResult<QuranProviderVerse[]>> {
    this.chapterId(chapter);
    const key = [chapter, locale, resources.translationId ?? '-', resources.tafsirId ?? '-'].join(':');
    return this.cached(`chapter-verses:${key}`, async () => {
      const verses = await this.sdk.content.v4.verses.byChapter(String(chapter), {
        fields: { chapterId: true, textUthmani: true },
        language: locale,
        perPage: 50,
        tafsirs: resources.tafsirId ? [resources.tafsirId] : undefined,
        translationFields: { languageName: true, resourceName: true, verseKey: true },
        translations: resources.translationId ? [resources.translationId] : undefined,
        wordFields: { location: true, textUthmani: true },
        words: true,
      });
      return this.hydrateTranslationFootnotes(verses);
    });
  }

  getChapterInfo(
    chapter: number,
    locale: QuranProviderLocale,
    resourceId: number,
  ): Promise<QuranProviderResult<QuranProviderChapterInfo | undefined>> {
    this.chapterId(chapter);
    this.resourceId(resourceId);
    return this.cached(`chapter-info:${chapter}:${locale}:${resourceId}`, async () => {
      const response = await this.sdk.content.v4.chapters.getInfoResponse(String(chapter), {
        includeResources: true,
        language: locale,
        resourceId,
      });
      return response.chapterInfo ?? undefined;
    });
  }

  getChapterRecitation(chapter: number, recitationId: number): Promise<QuranProviderResult<QuranProviderRecitation[]>> {
    this.chapterId(chapter);
    this.resourceId(recitationId);
    return this.cached(`recitation:${chapter}:${recitationId}`, async () => {
      const response = await this.sdk.content.v4.audio.verseRecitation.byChapter(String(chapter), String(recitationId), {
        fields: { chapterId: true, format: true, segments: true },
        perPage: 50,
      });
      return response.audioFiles;
    });
  }

  getTafsir(chapter: number, ayah: number, tafsirId: number): Promise<QuranProviderResult<QuranProviderTafsir | undefined>> {
    const verseKey = this.verseKey(chapter, ayah);
    this.resourceId(tafsirId);
    return this.cached(`tafsir:${tafsirId}:${verseKey}`, async () => {
      const verse = await this.sdk.content.v4.verses.byKey(verseKey, { tafsirs: [tafsirId] });
      return verse.tafsirs?.find(tafsir => tafsir.resourceId === tafsirId);
    });
  }

  listResources(locale: QuranProviderLocale): Promise<QuranProviderResult<QuranProviderResourceCatalog>> {
    return this.cached(`resources:${locale}`, async () => {
      const [translations, tafsirs, chapterInfos, recitations] = await Promise.all([
        this.sdk.content.v4.resources.translations.list({ language: locale }),
        this.sdk.content.v4.resources.tafsirs.list({ language: locale }),
        this.sdk.content.v4.resources.chapterInfos.list({ language: locale }),
        this.sdk.content.v4.resources.recitations.list({ language: locale }),
      ]);
      return { translations, tafsirs, chapterInfos, recitations };
    });
  }

  private async cached<T>(key: string, operation: () => Promise<T>): Promise<QuranProviderResult<T>> {
    const cacheKey = `qf:${this.config.environment}:${key}`;
    const cached = await this.cache.get<T>(cacheKey);
    if (cached && Date.parse(cached.expiresAt) > this.now().getTime()) {
      return this.result(cached.value, cached.fetchedAt, cached.expiresAt, 'hit');
    }
    if (cached) await this.cache.delete(cacheKey);

    const policy: CachePolicyContext = { cacheSeconds: QF_MAX_CACHE_SECONDS, noStore: false };
    const data = await this.policyContext.run(policy, operation);
    const fetchedAt = this.now();
    if (policy.noStore || policy.cacheSeconds <= 0) return this.result(data, fetchedAt.toISOString(), undefined, 'no-store');
    const expiresAt = new Date(fetchedAt.getTime() + policy.cacheSeconds * 1000).toISOString();
    await this.cache.set(cacheKey, {
      value: data,
      fetchedAt: fetchedAt.toISOString(),
      expiresAt,
      provider: 'quran-foundation',
      sourceVersion: 'content-api-v4',
    });
    return this.result(data, fetchedAt.toISOString(), expiresAt, 'miss');
  }

  private readonly policyAwareFetch: typeof fetch = async (input, init) => {
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    const response = await this.fetcher(input, {
      ...init,
      signal: init?.signal
        ? AbortSignal.any([init.signal, AbortSignal.timeout(10_000)])
        : AbortSignal.timeout(10_000),
    });
    const policy = this.policyContext.getStore();
    if (policy && method === 'GET' && this.isQuranFoundationContentHost(url.hostname)) {
      const seconds = boundedCacheSeconds(response.headers.get('cache-control'));
      if (seconds === undefined) policy.noStore = true;
      else policy.cacheSeconds = Math.min(policy.cacheSeconds, seconds);
    }
    return response;
  };

  private result<T>(
    data: T,
    fetchedAt: string,
    expiresAt: string | undefined,
    cacheStatus: QuranProviderResult<T>['cacheStatus'],
  ): QuranProviderResult<T> {
    return { data, fetchedAt, expiresAt, provider: 'quran-foundation', sourceVersion: 'content-api-v4', cacheStatus };
  }

  private async hydrateTranslationFootnotes(verses: QuranProviderVerse[]): Promise<QuranProviderVerse[]> {
    const ids = new Set<string>();
    verses.forEach(verse => verse.translations?.forEach(translation => {
      for (const id of this.footnoteIds(translation.text)) ids.add(id);
    }));
    const entries = await Promise.all([...ids].map(async id => [
      id,
      this.footnoteText(await this.sdk.content.v4.raw.getFootNote({ path: { id } }), id),
    ] as const));
    const footnotes = new Map(entries);
    return verses.map(verse => ({
      ...verse,
      translations: verse.translations?.map(translation => ({
        ...translation,
        footNotes: Object.fromEntries(this.footnoteIds(translation.text).map(id => [id, footnotes.get(id)!])),
      })),
    }));
  }

  private footnoteIds(text: string): string[] {
    return [...text.matchAll(/foot_note=["']?(\d+)/gi)].map(match => match[1]);
  }

  private footnoteText(response: unknown, id: string): string {
    if (!response || typeof response !== 'object') throw new Error(`Quran Foundation footnote ${id} is invalid`);
    const record = response as Record<string, unknown>;
    const candidate = (record.footNote ?? record.footnote ?? record) as Record<string, unknown>;
    if (typeof candidate.text !== 'string' || !candidate.text.trim()) throw new Error(`Quran Foundation footnote ${id} is invalid`);
    return candidate.text;
  }

  private chapterId(value: number): number {
    if (!Number.isInteger(value) || value < 1 || value > 114) throw new Error('Invalid Quran Foundation chapter identifier');
    return value;
  }

  private verseKey(chapter: number, ayah: number): string {
    this.chapterId(chapter);
    if (!Number.isInteger(ayah) || ayah < 1 || ayah > 300) throw new Error('Invalid Quran Foundation ayah identifier');
    return `${chapter}:${ayah}`;
  }

  private resourceId(value: number): number {
    if (!Number.isInteger(value) || value < 1) throw new Error('Invalid Quran Foundation resource identifier');
    return value;
  }

  private isQuranFoundationContentHost(hostname: string): boolean {
    return hostname === 'apis.quran.foundation' || hostname === 'apis-prelive.quran.foundation';
  }
}

/** Compatibility export for server code migrating from the pre-SDK client name. */
export { QuranFoundationProvider as QuranFoundationClient };
export type { QuranProviderResult as ProviderResult } from './quranContentProvider';
