export interface CacheEntry<T> {
  value: T;
  fetchedAt: string;
  expiresAt: string;
  provider: string;
  sourceVersion: string;
}

export interface ServerCache {
  get<T>(key: string): Promise<CacheEntry<T> | undefined>;
  set<T>(key: string, entry: CacheEntry<T>): Promise<void>;
  delete(key: string): Promise<void>;
  deleteExpired(now?: Date): Promise<number>;
}

export class MemoryServerCache implements ServerCache {
  private readonly entries = new Map<string, CacheEntry<unknown>>();

  async get<T>(key: string): Promise<CacheEntry<T> | undefined> {
    return this.entries.get(key) as CacheEntry<T> | undefined;
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    this.entries.set(key, entry);
  }

  async delete(key: string): Promise<void> {
    this.entries.delete(key);
  }

  async deleteExpired(now = new Date()): Promise<number> {
    let deleted = 0;
    for (const [key, entry] of this.entries) {
      if (Date.parse(entry.expiresAt) <= now.getTime()) {
        this.entries.delete(key);
        deleted += 1;
      }
    }
    return deleted;
  }
}

export const QF_MAX_CACHE_SECONDS = 7 * 24 * 60 * 60;

export function boundedCacheSeconds(cacheControl: string | null): number | undefined {
  if (cacheControl?.toLowerCase().includes('no-store')) return undefined;
  const match = cacheControl?.match(/(?:s-maxage|max-age)=(\d+)/i);
  const upstreamSeconds = match ? Number(match[1]) : QF_MAX_CACHE_SECONDS;
  if (!Number.isFinite(upstreamSeconds) || upstreamSeconds <= 0) return undefined;
  return Math.min(upstreamSeconds, QF_MAX_CACHE_SECONDS);
}
