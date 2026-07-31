const API_BASE = 'https://www.mp3quran.net/api/v3';
const APPROVED_STREAM_HOSTS = ['server13.mp3quran.net'] as const;

interface ProviderMushaf { id: number; rewaya_id?: number; server: string; surah_list: string; }
interface ProviderReciter { id: number; name: string; moshaf: ProviderMushaf[]; }
interface Timing { ayah: number; start_time: number; end_time: number; }

export interface Mp3QuranStream {
  provider: 'mp3quran';
  reciterId: 118;
  mushafId: 118;
  riwayahId: 1;
  surahId: number;
  uri: string;
  approvedHostnames: readonly string[];
  segments: Array<{ ayah: number; startMs: number; endMs: number }>;
  deliveryMode: 'stream_only';
}

export class Mp3QuranClient {
  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async resolveHusaryHafs(surah: number): Promise<Mp3QuranStream> {
    if (!Number.isInteger(surah) || surah < 1 || surah > 114) throw new Error('Invalid Surah');
    const catalog = await this.json<{ reciters: ProviderReciter[] }>(`${API_BASE}/reciters?language=eng&reciter=118&sura=${surah}`);
    const reciter = catalog.reciters.find(item => item.id === 118);
    const mushaf = reciter?.moshaf.find(item => item.id === 118 && item.rewaya_id === 1);
    if (!reciter || !/Huss?ary/i.test(reciter.name) || !mushaf) throw new Error('MP3Quran Al-Husary Hafs identity mismatch');
    const available = mushaf.surah_list.split(',').map(Number);
    if (!available.includes(surah)) throw new Error('Surah absent from MP3Quran provider catalog');
    const server = new URL(mushaf.server);
    if (server.protocol !== 'https:' || !APPROVED_STREAM_HOSTS.includes(server.hostname as typeof APPROVED_STREAM_HOSTS[number])) throw new Error('MP3Quran stream origin is not approved');
    const timings = await this.json<Timing[]>(`${API_BASE}/ayat_timing?surah=${surah}&read=118`);
    const segments = timings.filter(item => item.ayah > 0).map(item => ({ ayah: item.ayah, startMs: item.start_time, endMs: item.end_time }));
    if (segments.length === 0 || segments.some(item => item.startMs < 0 || item.endMs <= item.startMs)) throw new Error('MP3Quran timing response is invalid');
    const uri = new URL(`${String(surah).padStart(3, '0')}.mp3`, server).toString();
    await this.probeStream(uri);
    return {
      provider: 'mp3quran', reciterId: 118, mushafId: 118, riwayahId: 1, surahId: surah,
      uri, approvedHostnames: APPROVED_STREAM_HOSTS,
      segments, deliveryMode: 'stream_only',
    };
  }

  private async probeStream(uri: string): Promise<void> {
    const response = await this.fetcher(uri, {
      method: 'HEAD',
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
      headers: { accept: 'audio/mpeg' },
    });
    if (response.status >= 300 && response.status < 400) throw new Error('MP3Quran stream redirect is not approved');
    if (!response.ok) throw new Error(`MP3Quran stream returned ${response.status}`);
    const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (contentType !== 'audio/mpeg' && contentType !== 'audio/mp3') throw new Error('MP3Quran stream content type is invalid');
    const byteSize = Number(response.headers.get('content-length'));
    if (!Number.isFinite(byteSize) || byteSize <= 0 || byteSize > 250 * 1024 * 1024) throw new Error('MP3Quran stream size is invalid');
  }

  private async json<T>(url: string): Promise<T> {
    const response = await this.fetcher(url, { redirect: 'manual', signal: AbortSignal.timeout(10_000), headers: { accept: 'application/json' } });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('MP3Quran redirect has no location');
      const redirected = new URL(location, url);
      if (redirected.protocol !== 'https:' || redirected.hostname !== 'www.mp3quran.net') throw new Error('MP3Quran redirected outside approved API origin');
      const followed = await this.fetcher(redirected, { redirect: 'manual', signal: AbortSignal.timeout(10_000), headers: { accept: 'application/json' } });
      if (!followed.ok) throw new Error(`MP3Quran returned ${followed.status}`);
      return followed.json() as Promise<T>;
    }
    if (!response.ok) throw new Error(`MP3Quran returned ${response.status}`);
    return response.json() as Promise<T>;
  }
}
