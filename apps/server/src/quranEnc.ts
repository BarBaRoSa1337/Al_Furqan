export const QURANENC_RESOURCES = {
  'quranenc-english-rowwad': { key: 'english_rwwad', locale: 'en', version: '1.0.19', publisher: 'Rowwad Translation Center' },
  'quranenc-french-rashid': { key: 'french_rashid', locale: 'fr', version: '1.0.3', publisher: 'Rachid Maach' },
} as const;

type QuranEncResourceId = keyof typeof QURANENC_RESOURCES;

export interface QuranEncResult {
  provider: 'quranenc';
  resourceId: QuranEncResourceId;
  providerResourceId: string;
  version: string;
  locale: string;
  publisher: string;
  attributionText: string;
  attributionUrl: string;
  data: unknown;
}

export class QuranEncClient {
  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async getSurah(resourceId: string, surah: number): Promise<QuranEncResult> {
    if (!(resourceId in QURANENC_RESOURCES)) throw new Error('QuranEnc resource is not approved');
    if (!Number.isInteger(surah) || surah < 1 || surah > 114) throw new Error('Invalid Surah');
    const resource = QURANENC_RESOURCES[resourceId as QuranEncResourceId];
    const listResponse = await this.fetcher(`https://quranenc.com/api/v1/translations/list/${resource.locale}?localization=en`, { signal: AbortSignal.timeout(10_000) });
    if (!listResponse.ok) throw new Error(`QuranEnc catalog returned ${listResponse.status}`);
    const list = await listResponse.json() as Array<{ key: string; version: string }>;
    const current = list.find(item => item.key === resource.key);
    if (!current) throw new Error('Pinned QuranEnc resource disappeared');
    if (current.version !== resource.version) throw new Error(`QuranEnc update candidate ${current.version} requires review; pinned ${resource.version}`);
    const response = await this.fetcher(`https://quranenc.com/api/v1/translation/sura/${resource.key}/${surah}`, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`QuranEnc translation returned ${response.status}`);
    return {
      provider: 'quranenc',
      resourceId: resourceId as QuranEncResourceId,
      providerResourceId: resource.key,
      version: resource.version,
      locale: resource.locale,
      publisher: resource.publisher,
      attributionText: `${resource.publisher}, provided by QuranEnc (quranenc.com). Version ${resource.version}. Provider text is unmodified.`,
      attributionUrl: 'https://quranenc.com',
      data: await response.json(),
    };
  }
}
