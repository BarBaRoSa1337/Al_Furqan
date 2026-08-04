import type { ContentPackage, SurahRecord } from '../../../src/types/content';

export interface QuranEncRow {
  sura: string;
  aya: string;
  translation: string;
  footnotes?: string;
}

export interface QuranEncPayload {
  result: QuranEncRow[];
}

export interface QuranEncResourceMetadata {
  key: string;
  version: string;
  title: string;
  description: string;
  publisher: string;
  attributionText: string;
  updateDate: string | number;
  raw: unknown;
}

export interface SourceRetrievalEvidence {
  resourceKey: string;
  registryUrl: string;
  version: string;
  lastUpdate: string | number;
  retrievedAt: string;
  files: Record<string, { url: string; sha256: string }>;
}

export interface PreviewSourceInputs {
  tanzilText: string;
  tanzilLicense: string;
  tanzilVersion: string;
  tanzilRetrievedAt: string;
  englishMetadata: unknown;
  englishSurahs: Record<number, unknown>;
  frenchMetadata: unknown;
  frenchSurahs: Record<number, unknown>;
  sourceFileHashes?: Record<string, string>;
  englishRetrieval: SourceRetrievalEvidence;
  frenchRetrieval: SourceRetrievalEvidence;
}

export interface PreviewGeneratedFiles {
  packages: Record<'en' | 'fr', ContentPackage>;
  sourceMetadata: {
    tanzil: { version: string; license: string; retrievedAt: string };
    english: QuranEncResourceMetadata;
    french: QuranEncResourceMetadata;
  };
  sourceSurahs: SurahRecord[];
}
