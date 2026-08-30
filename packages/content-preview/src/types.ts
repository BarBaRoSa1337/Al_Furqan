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

export interface TanzilSourceMetadata {
  schemaVersion: 1;
  provider: 'Tanzil Project';
  textVersion: '1.1';
  textType: 'Uthmani';
  sourceUrl: string;
  downloadUrl: string;
  licenseUrl: string;
  retrievedAt: string;
  attributionText: string;
  modificationAllowed: false;
  downloadOptions: Record<string, string>;
  files: Record<'quran-uthmani.txt' | 'LICENSE.txt', { url: string; sha256: string }>;
}

export interface PreviewAudioStream {
  provider: 'mp3quran';
  reciterId: 118;
  mushafId: 118;
  riwayahId: 1;
  surahId: number;
  uri: string;
  approvedHostnames: readonly string[];
  segments: Array<{ ayah: number; startMs: number; endMs: number }>;
  deliveryMode: 'stream_only';
  providerVersion: 'api-v3';
  attributionText: string;
  permissionEvidenceUrl: string;
}

export interface PreviewAudioInputs {
  retrievedAt: string;
  streams: PreviewAudioStream[];
}

export interface PreviewSourceInputs {
  tanzilText: string;
  tanzilLicense: string;
  tanzilMetadata: TanzilSourceMetadata;
  englishMetadata: unknown;
  englishSurahs: Record<number, unknown>;
  frenchMetadata: unknown;
  frenchSurahs: Record<number, unknown>;
  englishMokhtasarMetadata: unknown;
  englishMokhtasarSurahs: Record<number, unknown>;
  englishMokhtasarRetrieval: SourceRetrievalEvidence;
  audio: PreviewAudioInputs;
  quranFoundationRetrieval: SourceRetrievalEvidence;
  wordMeanings: Record<string, unknown>;
  sourceFileHashes?: Record<string, string>;
  englishRetrieval: SourceRetrievalEvidence;
  frenchRetrieval: SourceRetrievalEvidence;
}

export interface PreviewGeneratedFiles {
  packages: Record<'en' | 'fr' | 'ar', ContentPackage>;
  sourceMetadata: {
    tanzil: TanzilSourceMetadata;
    english: QuranEncResourceMetadata;
    french: QuranEncResourceMetadata;
    englishMokhtasar: QuranEncResourceMetadata;
  };
  sourceSurahs: SurahRecord[];
}
