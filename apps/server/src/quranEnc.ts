export const QURANENC_RESOURCES = {
  'quranenc-english-rowwad': { key: 'english_rwwad', locale: 'en', version: '1.0.19', publisher: 'Rowwad Translation Center' },
  'quranenc-french-rashid': { key: 'french_rashid', locale: 'fr', version: '1.0.3', publisher: 'Rachid Maach' },
} as const;

type QuranEncResourceId = keyof typeof QURANENC_RESOURCES;

export interface QuranEncRow {
  sura: string;
  aya: string;
  translation: string;
  footnotes?: string;
}

const EXPECTED_AYAH_COUNTS: Record<number, number> = {
  105: 5, 106: 4, 107: 7, 108: 3, 109: 6,
  110: 3, 111: 5, 112: 4, 113: 5, 114: 6,
};

export interface QuranEncResult {
  provider: 'quranenc';
  resourceId: QuranEncResourceId;
  providerResourceId: string;
  version: string;
  locale: string;
  publisher: string;
  title: string;
  description: string;
  lastUpdatedAt: string;
  retrievedAt: string;
  attributionText: string;
  attributionUrl: string;
  data: QuranEncRow[];
}

export class QuranEncClient {
  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getSurah(resourceId: string, surah: number): Promise<QuranEncResult> {
    if (!(resourceId in QURANENC_RESOURCES)) throw new Error('QuranEnc resource is not approved');
    if (!Number.isInteger(surah) || surah < 1 || surah > 114) throw new Error('Invalid Surah');
    const resource = QURANENC_RESOURCES[resourceId as QuranEncResourceId];
    const listResponse = await this.fetcher(`https://quranenc.com/api/v1/translations/list/${resource.locale}?localization=en`, { signal: AbortSignal.timeout(10_000) });
    if (!listResponse.ok) throw new Error(`QuranEnc catalog returned ${listResponse.status}`);
    const listData = await listResponse.json() as unknown;
    if (!isRecord(listData) || !Array.isArray(listData.translations)) throw new Error('QuranEnc catalog payload is invalid');
    const current = listData.translations.find(item => isRecord(item) && item.key === resource.key);
    if (!current) throw new Error('Pinned QuranEnc resource disappeared');
    const version = requiredString(current, 'version');
    if (version !== resource.version) throw new Error(`QuranEnc update candidate ${version} requires review; pinned ${resource.version}`);
    const title = requiredString(current, 'title');
    const description = requiredString(current, 'description');
    const lastUpdatedAt = String(current.last_update ?? '').trim();
    if (!lastUpdatedAt) throw new Error('QuranEnc catalog resource is missing last_update');
    const response = await this.fetcher(`https://quranenc.com/api/v1/translation/sura/${resource.key}/${surah}`, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`QuranEnc translation returned ${response.status}`);
    const data = parseSurahPayload(await response.json(), resource.key, surah);
    return {
      provider: 'quranenc',
      resourceId: resourceId as QuranEncResourceId,
      providerResourceId: resource.key,
      version: resource.version,
      locale: resource.locale,
      publisher: resource.publisher,
      title,
      description,
      lastUpdatedAt,
      retrievedAt: this.now().toISOString(),
      attributionText: `${resource.publisher}, provided by QuranEnc (quranenc.com). Version ${resource.version}. Provider text is unmodified.`,
      attributionUrl: 'https://quranenc.com',
      data,
    };
  }
}

function parseSurahPayload(value: unknown, resourceKey: string, surah: number): QuranEncRow[] {
  if (!isRecord(value) || !Array.isArray(value.result)) throw new Error(`QuranEnc ${resourceKey} Surah ${surah} payload is invalid`);
  const expected = EXPECTED_AYAH_COUNTS[surah];
  if (!expected) throw new Error(`QuranEnc runtime fallback does not support Surah ${surah}`);
  const seen = new Set<number>();
  const rows = value.result.map((value, index) => {
    if (!isRecord(value) || typeof value.sura !== 'string' || typeof value.aya !== 'string' || typeof value.translation !== 'string') {
      throw new Error(`QuranEnc ${resourceKey} Surah ${surah} row ${index + 1} is incomplete`);
    }
    const ayah = Number(value.aya);
    if (Number(value.sura) !== surah || !Number.isInteger(ayah) || ayah < 1 || ayah > expected) {
      throw new Error(`QuranEnc ${resourceKey} contains an invalid coordinate in Surah ${surah}`);
    }
    if (seen.has(ayah)) throw new Error(`QuranEnc ${resourceKey} contains duplicate ayah ${surah}:${ayah}`);
    if (!value.translation.trim()) throw new Error(`QuranEnc ${resourceKey} contains blank translation ${surah}:${ayah}`);
    if (value.footnotes !== undefined && typeof value.footnotes !== 'string') {
      throw new Error(`QuranEnc ${resourceKey} footnotes for ${surah}:${ayah} must be text`);
    }
    seen.add(ayah);
    return {
      sura: value.sura,
      aya: value.aya,
      translation: value.translation,
      ...(typeof value.footnotes === 'string' ? { footnotes: value.footnotes } : {}),
    };
  });
  if (rows.length !== expected || Array.from({ length: expected }, (_, index) => index + 1).some(ayah => !seen.has(ayah))) {
    throw new Error(`QuranEnc ${resourceKey} Surah ${surah} does not contain exact ayat 1-${expected}`);
  }
  return rows;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requiredString(value: Record<string, unknown>, key: string): string {
  const candidate = value[key];
  if (typeof candidate !== 'string' || !candidate.trim()) throw new Error(`QuranEnc catalog resource is missing ${key}`);
  return candidate;
}
