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
}

export function importQuranStructureSnapshot(value: unknown, hasher?: StructureHasher): ImportedQuranStructure {
  if (!isSnapshot(value)) throw new Error('Quran structure snapshot is invalid');
  if (hasher && hasher.hash(stableStringify({ divisions: value.divisions, verses: value.verses })) !== value.source.contentHash) {
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

  return { divisions, structureIndex };
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
