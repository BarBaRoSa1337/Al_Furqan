import type { ContentPackage } from './content';

export type PackageFileKind = 'quran_text' | 'division_index' | 'translation' | 'tafsir' | 'word_data' | 'audio' | 'image' | 'svg' | 'animation' | 'curriculum';

export interface PackageFile {
  path: string;
  kind: PackageFileKind;
  checksum: string;
  required: boolean;
}

export interface ContentPackageManifest {
  packageId: string;
  version: string;
  files: PackageFile[];
}

export interface DownloadedContentPackage {
  manifest: ContentPackageManifest;
  content: ContentPackage;
}

export interface InstalledPackageRecord {
  packageId: string;
  activeVersion: string;
  installedVersions: string[];
}

export interface InstalledPackageRegistry {
  packages: Record<string, InstalledPackageRecord>;
}

export interface PackageStore {
  read<T>(key: string): Promise<T | undefined>;
  write<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface PackageDownloader {
  download(path: string): Promise<string>;
}

export interface ChecksumVerifier {
  verify(contents: string, checksum: string): Promise<boolean>;
}
