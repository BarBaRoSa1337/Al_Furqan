import type {
  AyahRef,
  DiscoveryDiagnostic,
  DiscoveryQueryResult,
  ParsedDiscoveryQuery,
  QuranLookup,
  SurahRecord,
} from '../../types/content';

export function parseDiscoveryQueryValue(query: string, surahs: SurahRecord[]): DiscoveryQueryResult {
  const normalizedText = normalizeSearchText(query);
  if (!normalizedText) return { query: { kind: 'empty' }, diagnostics: [] };

  const structured = parseStructuredLookup(normalizedText);
  if (structured) return structured;

  const namedSurah = surahs.find(surah => {
    const names = [surah.transliteratedName, surah.englishName, surah.arabicName].map(normalizeSearchText);
    return names.includes(normalizedText) || names.includes(normalizedText.replace(/^surah\s+/, ''));
  });
  if (namedSurah) {
    return lookupResult({ type: 'surah', surahNumber: namedSurah.surahNumber });
  }

  return { query: { kind: 'text', normalizedText }, diagnostics: [] };
}

export function refsForLookup(
  lookup: QuranLookup,
  resolveDivision: (kind: 'juz' | 'hizb' | 'rub_el_hizb', number: number) => AyahRef[]
): AyahRef[] {
  switch (lookup.type) {
    case 'surah':
      return [];
    case 'ayah':
      return [lookup.ayahRef];
    case 'ayah_range':
      return [];
    case 'juz':
    case 'hizb':
    case 'rub_el_hizb':
      return resolveDivision(lookup.type, lookup.number);
  }
}

export function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

export function refKey(ref: AyahRef): string {
  return `${ref.surahNumber}:${ref.ayahNumber}`;
}

function parseStructuredLookup(value: string): DiscoveryQueryResult | undefined {
  const surah = /^surah\s+(\d+)$/.exec(value);
  if (surah) return boundedLookup(Number(surah[1]), 114, 'surah', number => ({ type: 'surah', surahNumber: number }));

  const ayahRange = /^(\d+):(\d+)-(\d+)$/.exec(value);
  if (ayahRange) {
    const surahNumber = Number(ayahRange[1]);
    const start = Number(ayahRange[2]);
    const end = Number(ayahRange[3]);
    if (!inRange(surahNumber, 114) || start < 1 || end < 1 || start > end) {
      return invalid('invalid_ayah_range', 'Ayah range is invalid or reversed');
    }
    return lookupResult({
      type: 'ayah_range',
      range: {
        start: { surahNumber, ayahNumber: start },
        end: { surahNumber, ayahNumber: end },
      },
    });
  }

  const ayah = /^(\d+):(\d+)$/.exec(value);
  if (ayah) {
    const surahNumber = Number(ayah[1]);
    const ayahNumber = Number(ayah[2]);
    if (!inRange(surahNumber, 114) || ayahNumber < 1) return invalid('invalid_ayah', 'Ayah reference is invalid');
    return lookupResult({ type: 'ayah', ayahRef: { surahNumber, ayahNumber } });
  }

  const division = /^(juz|hizb|rub)\s+(\d+)$/.exec(value);
  if (division) {
    const kind = division[1] as 'juz' | 'hizb' | 'rub';
    const maximum = kind === 'juz' ? 30 : kind === 'hizb' ? 60 : 240;
    return boundedLookup(
      Number(division[2]),
      maximum,
      kind,
      number => ({ type: kind === 'rub' ? 'rub_el_hizb' : kind, number })
    );
  }

  if (/^(surah|juz|hizb|rub)\b/.test(value) || /^\d+:\S+/.test(value)) {
    return invalid('invalid_structured_query', 'Quran reference query is not valid');
  }
  return undefined;
}

function boundedLookup(
  number: number,
  maximum: number,
  label: string,
  create: (number: number) => QuranLookup
): DiscoveryQueryResult {
  return inRange(number, maximum)
    ? lookupResult(create(number))
    : invalid(`invalid_${label}`, `${label} number must be between 1 and ${maximum}`);
}

function lookupResult(lookup: QuranLookup): DiscoveryQueryResult {
  return { query: { kind: 'quran_lookup', lookup }, diagnostics: [] };
}

function invalid(code: string, message: string): DiscoveryQueryResult {
  const diagnostics: DiscoveryDiagnostic[] = [{ code, message }];
  const query: ParsedDiscoveryQuery = { kind: 'empty' };
  return { query, diagnostics };
}

function inRange(value: number, maximum: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= maximum;
}
