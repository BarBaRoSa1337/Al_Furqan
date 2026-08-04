import type { SupportedLocale } from '../../../packages/api-contracts/src';
import type { ContentPackage } from '../../types/content';
import rawIntegrity from './surahs-105-114.preview.sha256.json';
import rawBundle from './surahs-105-114.preview.json';

export interface LocalPreviewIntegrityManifest {
  packageId: string;
  revisionId: string;
  payloadSha256: string;
}

export interface LocalPreviewArtifact {
  package: ContentPackage;
  integrity: LocalPreviewIntegrityManifest;
}

interface LocalPreviewBundle {
  schemaVersion: 1;
  contentMode: 'preview';
  packages: Record<'en' | 'fr', ContentPackage>;
}

interface LocalPreviewBundleIntegrity {
  schemaVersion: 1;
  packageId: string;
  revisions: Record<'en' | 'fr', string>;
  payloadSha256: Record<'en' | 'fr', string>;
}

const bundle: unknown = rawBundle;
const integrity: unknown = rawIntegrity;

export const bundledLocalPreviewArtifacts: Partial<Record<SupportedLocale, LocalPreviewArtifact>> = isBundle(bundle) && isBundleIntegrity(integrity)
  ? Object.fromEntries((['en', 'fr'] as const).map(locale => [locale, {
      package: bundle.packages[locale],
      integrity: {
        packageId: integrity.packageId,
        revisionId: integrity.revisions[locale],
        payloadSha256: integrity.payloadSha256[locale],
      },
    }]))
  : {};

function isBundle(value: unknown): value is LocalPreviewBundle {
  if (!isRecord(value) || value.schemaVersion !== 1 || value.contentMode !== 'preview' || !isRecord(value.packages)) return false;
  return isContentPackage(value.packages.en) && isContentPackage(value.packages.fr);
}

function isBundleIntegrity(value: unknown): value is LocalPreviewBundleIntegrity {
  if (!isRecord(value) || value.schemaVersion !== 1 || typeof value.packageId !== 'string' || !isRecord(value.revisions) || !isRecord(value.payloadSha256)) return false;
  const revisions = value.revisions;
  const hashes = value.payloadSha256;
  return ['en', 'fr'].every(locale => typeof revisions[locale] === 'string' && typeof hashes[locale] === 'string');
}

function isContentPackage(value: unknown): value is ContentPackage {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.revisionId === 'string'
    && Array.isArray(value.surahs)
    && Array.isArray(value.ayat)
    && Array.isArray(value.learningPaths)
    && Array.isArray(value.levels);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
