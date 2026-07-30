import type {
  AyahRef,
  AyahStructureIndex,
  QuranDivision,
  QuranDivisionKind,
  QuranEditionId,
} from '../../types/content';

export const HAFS_ENABLED_DIVISIONS = ['juz', 'hizb', 'rub_el_hizb'] as const;

interface StructureHasher {
  hash(value: string): string;
}

export interface QuranStructureSnapshot {
  source: {
    id: string;
    version: string;
    endpoint: string;
    retrievedAt: string;
    contentHash: string;
  };
  editionId: QuranEditionId;
  surahs?: {
    number: number;
    arabicName: string;
    transliteratedName: string;
    englishName: string;
    ayahCount: number;
    revelationOrder?: number;
    revelationPlace: 'makkah' | 'madinah';
  }[];
  divisions: {
    kind: QuranDivisionKind;
    number: number;
    start: string;
    end: string;
  }[];
  verses: {
    verseKey: string;
    juzNumber: number;
    hizbNumber: number;
    rubElHizbNumber: number;
    pageNumber?: number;
    rukuNumber?: number;
    manzilNumber?: number;
  }[];
}

export interface ImportedQuranStructure {
  divisions: QuranDivision[];
  structureIndex: AyahStructureIndex[];
  surahs: NonNullable<QuranStructureSnapshot['surahs']>;
}

export function importQuranStructureSnapshot(value: unknown, hasher?: StructureHasher): ImportedQuranStructure {
  if (!isSnapshot(value)) throw new Error('Quran structure snapshot is invalid');
  const hashPayload = value.surahs
    ? { divisions: value.divisions, surahs: value.surahs, verses: value.verses }
    : { divisions: value.divisions, verses: value.verses };
  if (hasher && hasher.hash(stableStringify(hashPayload)) !== value.source.contentHash) {
    throw new Error('Quran structure snapshot hash does not match');
  }

  const divisionKeys = new Set<string>();
  const divisions = value.divisions.map<QuranDivision>(division => {
    const key = `${division.kind}:${division.number}`;
    if (divisionKeys.has(key)) throw new Error(`Duplicate Quran division "${key}"`);
    divisionKeys.add(key);
    const start = parseRef(division.start);
    const end = parseRef(division.end);
    if (compareRefs(start, end) > 0) throw new Error(`Quran division "${key}" has a reversed range`);
    return {
      id: `${value.editionId}:${division.kind}:${division.number}`,
      editionId: value.editionId,
      kind: division.kind,
      number: division.number,
      range: { start, end },
      sourceId: value.source.id,
      sourceVersion: value.source.version,
      contentHash: value.source.contentHash,
    };
  });
  const structureIndex = value.verses.map<AyahStructureIndex>(verse => ({
    editionId: value.editionId,
    ayahRef: parseRef(verse.verseKey),
    juzNumber: verse.juzNumber,
    hizbNumber: verse.hizbNumber,
    rubElHizbNumber: verse.rubElHizbNumber,
    pageNumber: verse.pageNumber,
    rukuNumber: verse.rukuNumber,
    manzilNumber: verse.manzilNumber,
  }));
  validateCompleteSnapshot(value, structureIndex, divisions);

  return { divisions, structureIndex, surahs: value.surahs ?? [] };
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function parseRef(value: string): AyahRef {
  const match = /^(\d+):(\d+)$/.exec(value);
  if (!match) throw new Error(`Invalid Quran reference "${value}"`);
  return { surahNumber: Number(match[1]), ayahNumber: Number(match[2]) };
}

function isSnapshot(value: unknown): value is QuranStructureSnapshot {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<QuranStructureSnapshot>;
  return candidate.editionId === 'hafs-an-asim'
    && Boolean(candidate.source
      && candidate.source.id
      && candidate.source.version
      && candidate.source.endpoint
      && candidate.source.retrievedAt
      && /^[a-f0-9]{64}$/i.test(candidate.source.contentHash))
    && Array.isArray(candidate.divisions)
    && candidate.divisions.every(division => HAFS_ENABLED_DIVISIONS.includes(division.kind as typeof HAFS_ENABLED_DIVISIONS[number])
      && validNumber(division.number, division.kind === 'juz' ? 30 : division.kind === 'hizb' ? 60 : 240)
      && typeof division.start === 'string' && typeof division.end === 'string')
    && (candidate.surahs === undefined || (Array.isArray(candidate.surahs)
      && candidate.surahs.every(surah => validNumber(surah.number, 114)
        && typeof surah.arabicName === 'string'
        && typeof surah.transliteratedName === 'string'
        && typeof surah.englishName === 'string'
        && Number.isInteger(surah.ayahCount)
        && surah.ayahCount > 0
        && (surah.revelationPlace === 'makkah' || surah.revelationPlace === 'madinah'))))
    && Array.isArray(candidate.verses)
    && candidate.verses.every(verse => typeof verse.verseKey === 'string'
      && validNumber(verse.juzNumber, 30) && validNumber(verse.hizbNumber, 60) && validNumber(verse.rubElHizbNumber, 240));
}

function validNumber(value: unknown, maximum: number): value is number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= maximum;
}

function compareRefs(a: AyahRef, b: AyahRef): number {
  return a.surahNumber - b.surahNumber || a.ayahNumber - b.ayahNumber;
}

function validateCompleteSnapshot(
  snapshot: QuranStructureSnapshot,
  structureIndex: AyahStructureIndex[],
  divisions: QuranDivision[],
): void {
  const refKeys = new Set<string>();
  structureIndex.forEach(entry => {
    const key = `${entry.ayahRef.surahNumber}:${entry.ayahRef.ayahNumber}`;
    if (refKeys.has(key)) throw new Error(`Duplicate Quran structure reference "${key}"`);
    refKeys.add(key);
  });
  if (!snapshot.surahs) return;

  const surahNumbers = new Set(snapshot.surahs.map(surah => surah.number));
  if (snapshot.surahs.length !== 114 || surahNumbers.size !== 114) {
    throw new Error('Complete Quran structure snapshot must contain 114 unique Surahs');
  }
  if (structureIndex.length !== 6236) {
    throw new Error('Complete Quran structure snapshot must contain 6236 ayat');
  }
  snapshot.surahs.forEach(surah => {
    const refs = structureIndex.filter(entry => entry.ayahRef.surahNumber === surah.number);
    if (refs.length !== surah.ayahCount) {
      throw new Error(`Surah ${surah.number} structure count does not match declared ayah count`);
    }
    refs.forEach((entry, index) => {
      if (entry.ayahRef.ayahNumber !== index + 1) {
        throw new Error(`Surah ${surah.number} structure references are not contiguous`);
      }
    });
  });
  const expectedCounts: Record<typeof HAFS_ENABLED_DIVISIONS[number], number> = {
    juz: 30,
    hizb: 60,
    rub_el_hizb: 240,
  };
  HAFS_ENABLED_DIVISIONS.forEach(kind => {
    if (divisions.filter(division => division.kind === kind).length !== expectedCounts[kind]) {
      throw new Error(`Complete Quran structure snapshot has an invalid ${kind} count`);
    }
  });
}
