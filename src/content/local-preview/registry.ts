import type { ContentPackage } from '../../types/content';
import rawIntegrity from './surahs-105-114.preview.sha256.json';
import rawPackage from './surahs-105-114.preview.json';

export interface LocalPreviewIntegrityManifest {
  packageId: string;
  revisionId: string;
  payloadSha256: string;
}

export interface LocalPreviewArtifact {
  package: ContentPackage;
  integrity: LocalPreviewIntegrityManifest;
}

/**
 * The checked-in placeholders intentionally do not resemble Quran content.
 * Replacing both JSON files with a verified export enables this provider with
 * no application-code changes.
 */
export const bundledLocalPreviewArtifact: LocalPreviewArtifact | undefined = isIntegrityManifest(rawIntegrity) && isContentPackage(rawPackage)
  ? { package: rawPackage, integrity: rawIntegrity }
  : undefined;

function isIntegrityManifest(value: unknown): value is LocalPreviewIntegrityManifest {
  return Boolean(value) && typeof value === 'object'
    && typeof (value as LocalPreviewIntegrityManifest).packageId === 'string'
    && typeof (value as LocalPreviewIntegrityManifest).revisionId === 'string'
    && typeof (value as LocalPreviewIntegrityManifest).payloadSha256 === 'string';
}

function isContentPackage(value: unknown): value is ContentPackage {
  return Boolean(value) && typeof value === 'object'
    && typeof (value as ContentPackage).id === 'string'
    && typeof (value as ContentPackage).revisionId === 'string'
    && Array.isArray((value as ContentPackage).surahs)
    && Array.isArray((value as ContentPackage).ayat)
    && Array.isArray((value as ContentPackage).learningPaths)
    && Array.isArray((value as ContentPackage).levels);
}
