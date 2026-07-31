import type { ServerCache } from './cache';
import { boundedCacheSeconds } from './cache';

interface TokenResponse { access_token: string; expires_in: number; }
interface FetchLike { (input: string | URL | Request, init?: RequestInit): Promise<Response>; }

export interface QuranFoundationConfig {
  environment: 'prelive' | 'production';
  clientId: string;
  clientSecret: string;
}

export interface ProviderResult<T> {
  data: T;
  fetchedAt: string;
  expiresAt?: string;
  provider: 'quran-foundation';
  sourceVersion: 'content-api-v4';
  cacheStatus: 'hit' | 'miss' | 'no-store';
}

export class QuranFoundationClient {
  private token?: { value: string; expiresAt: number };
  private tokenRequest?: Promise<string>;

  constructor(
    private readonly config: QuranFoundationConfig,
    private readonly cache: ServerCache,
    private readonly fetcher: FetchLike = fetch,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async get<T>(path: string, query: URLSearchParams): Promise<ProviderResult<T>> {
    if (!APPROVED_PATHS.some(pattern => pattern.test(path))) throw new Error('QF route is not allowlisted');
    const url = new URL(`${this.apiBase}/content/api/v4${path}`);
    url.search = query.toString();
    const key = `qf:${url.pathname}?${url.searchParams.toString()}`;
    const cached = await this.cache.get<T>(key);
    if (cached && Date.parse(cached.expiresAt) > this.now().getTime()) {
      return { data: cached.value, fetchedAt: cached.fetchedAt, expiresAt: cached.expiresAt, provider: 'quran-foundation', sourceVersion: 'content-api-v4', cacheStatus: 'hit' };
    }
    if (cached) await this.cache.delete(key);

    const response = await this.request(url, true);
    const data = await response.json() as T;
    const fetchedAt = this.now();
    const cacheSeconds = boundedCacheSeconds(response.headers.get('cache-control'));
    if (!cacheSeconds) return { data, fetchedAt: fetchedAt.toISOString(), provider: 'quran-foundation', sourceVersion: 'content-api-v4', cacheStatus: 'no-store' };
    const expiresAt = new Date(fetchedAt.getTime() + cacheSeconds * 1000).toISOString();
    await this.cache.set(key, { value: data, fetchedAt: fetchedAt.toISOString(), expiresAt, provider: 'quran-foundation', sourceVersion: 'content-api-v4' });
    return { data, fetchedAt: fetchedAt.toISOString(), expiresAt, provider: 'quran-foundation', sourceVersion: 'content-api-v4', cacheStatus: 'miss' };
  }

  private async request(url: URL, retry401: boolean): Promise<Response> {
    const token = await this.accessToken();
    const response = await this.fetcher(url, {
      headers: { 'x-auth-token': token, 'x-client-id': this.config.clientId, accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 401 && retry401) {
      this.token = undefined;
      return this.request(url, false);
    }
    if (!response.ok) throw new Error(`Quran Foundation upstream returned ${response.status}`);
    return response;
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt - 30_000 > this.now().getTime()) return this.token.value;
    if (!this.tokenRequest) this.tokenRequest = this.fetchToken().finally(() => { this.tokenRequest = undefined; });
    return this.tokenRequest;
  }

  private async fetchToken(): Promise<string> {
    const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
    const response = await this.fetcher(`${this.authBase}/oauth2/token`, {
      method: 'POST',
      headers: { authorization: `Basic ${credentials}`, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'content' }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Quran Foundation token request returned ${response.status}`);
    const token = await response.json() as TokenResponse;
    if (!token.access_token || !Number.isFinite(token.expires_in)) throw new Error('Quran Foundation token response is invalid');
    this.token = { value: token.access_token, expiresAt: this.now().getTime() + token.expires_in * 1000 };
    return token.access_token;
  }

  private get authBase(): string {
    return this.config.environment === 'production' ? 'https://oauth2.quran.foundation' : 'https://prelive-oauth2.quran.foundation';
  }

  private get apiBase(): string {
    return this.config.environment === 'production' ? 'https://apis.quran.foundation' : 'https://apis-prelive.quran.foundation';
  }
}

const APPROVED_PATHS = [
  /^\/chapters$/,
  /^\/verses\/by_key\/\d{1,3}:\d{1,3}$/,
  /^\/verses\/by_chapter\/\d{1,3}$/,
  /^\/verses\/by_juz\/\d{1,2}$/,
  /^\/quran\/tafsirs\/\d+\/by_ayah\/\d{1,3}:\d{1,3}$/,
];
