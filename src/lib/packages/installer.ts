import { validatePackage } from '../content/packageValidator';
import { adaptLegacyPackage } from '../content/legacyPackageAdapter';
import type { ContentRepository } from '../../types/content';
import { grantCovers } from '../content/governance';
import {
  ChecksumVerifier,
  ContentPackageManifest,
  DownloadedContentPackage,
  InstalledPackageRegistry,
  PackageDownloader,
  PackageStore,
} from '../../types/packages';

const REGISTRY_KEY = 'content-package-registry-v1';
const stagedKey = (packageId: string, version: string) => `content-package-stage:${packageId}:${version}`;
const activeKey = (packageId: string, version: string) => `content-package-active:${packageId}:${version}`;
const PACKAGE_FILE_KINDS = new Set(['quran_text', 'division_index', 'translation', 'tafsir', 'word_data', 'audio', 'image', 'svg', 'animation', 'curriculum']);

export class PackageInstallError extends Error {}

export class ContentPackageInstaller {
  constructor(private readonly store: PackageStore, private readonly downloader: PackageDownloader, private readonly checksums: ChecksumVerifier, private readonly repository?: Pick<ContentRepository, 'registerPackage'>) {}

  async stage(downloaded: DownloadedContentPackage): Promise<void> {
    validateManifest(downloaded.manifest);
    const files: Record<string, string> = {};
    for (const file of downloaded.manifest.files) {
      const contents = await this.downloader.download(file.path);
      if (!await this.checksums.verify(contents, file.checksum)) throw new PackageInstallError(`Checksum failed for ${file.path}`);
      files[file.path] = contents;
    }
    const staged = validateStoredPackage({ ...downloaded, files }, downloaded.manifest.packageId, downloaded.manifest.version);
    await this.store.write(stagedKey(downloaded.manifest.packageId, downloaded.manifest.version), staged);
  }

  async activate(packageId: string, version: string): Promise<void> {
    const stored = await this.store.read<DownloadedContentPackage>(stagedKey(packageId, version));
    if (!stored) throw new PackageInstallError(`No validated staged package for ${packageId}@${version}`);
    const staged = validateStoredPackage(stored, packageId, version);
    const registry = await this.getRegistry();
    const current = registry.packages[packageId];
    const nextRegistry = cloneRegistry(registry);
    nextRegistry.packages[packageId] = {
      packageId,
      activeVersion: version,
      installedVersions: [...new Set([...(current?.installedVersions ?? []), version])].sort(),
    };
    await this.store.write(activeKey(packageId, version), staged);
    await this.store.write(REGISTRY_KEY, nextRegistry);
    try {
      this.repository?.registerPackage(staged.content, true);
    } catch (error) {
      await this.store.write(REGISTRY_KEY, registry);
      throw new PackageInstallError(`Could not activate ${packageId}@${version}: ${errorMessage(error)}`);
    }
    await safeRemove(this.store, stagedKey(packageId, version));
  }

  async rollback(packageId: string, version: string): Promise<void> {
    const stored = await this.store.read<DownloadedContentPackage>(activeKey(packageId, version));
    if (!stored) throw new PackageInstallError(`Installed version is unavailable: ${packageId}@${version}`);
    const previous = validateStoredPackage(stored, packageId, version);
    const registry = await this.getRegistry();
    const current = registry.packages[packageId];
    const nextRegistry = cloneRegistry(registry);
    nextRegistry.packages[packageId] = { packageId, activeVersion: version, installedVersions: [...new Set([...(current?.installedVersions ?? []), version])].sort() };
    await this.store.write(REGISTRY_KEY, nextRegistry);
    try {
      this.repository?.registerPackage(previous.content, true);
    } catch (error) {
      await this.store.write(REGISTRY_KEY, registry);
      throw new PackageInstallError(`Could not roll back ${packageId}@${version}: ${errorMessage(error)}`);
    }
  }

  async getActive(packageId: string): Promise<DownloadedContentPackage | undefined> {
    const record = (await this.getRegistry()).packages[packageId];
    return record ? this.store.read<DownloadedContentPackage>(activeKey(packageId, record.activeVersion)) : undefined;
  }

  async getRegistry(): Promise<InstalledPackageRegistry> {
    return (await this.store.read<InstalledPackageRegistry>(REGISTRY_KEY)) ?? { packages: {} };
  }
}

export async function hydrateInstalledPackages(store: PackageStore, repository: Pick<ContentRepository, 'registerPackage'>): Promise<void> {
  const registry = await store.read<InstalledPackageRegistry>(REGISTRY_KEY);
  if (!registry) return;
  for (const record of Object.values(registry.packages)) {
    try {
      const active = await store.read<DownloadedContentPackage>(activeKey(record.packageId, record.activeVersion));
      if (active) repository.registerPackage(validateStoredPackage(active, record.packageId, record.activeVersion).content, true);
    } catch (error) {
      console.warn(`[content:${record.packageId}@${record.activeVersion}] Installed package hydration skipped: ${errorMessage(error)}`);
    }
  }
}

export function validateManifest(manifest: ContentPackageManifest): void {
  if (!manifest || typeof manifest !== 'object' || !isSafeIdentity(manifest.packageId) || !isSafeIdentity(manifest.version) || !Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw new PackageInstallError('Manifest requires safe package identity and files');
  }
  const paths = new Set<string>();
  manifest.files.forEach(file => {
    if (!file || typeof file !== 'object' || !isSafeRelativePath(file.path) || !PACKAGE_FILE_KINDS.has(file.kind) || !/^[a-f0-9]{64}$/i.test(file.checksum) || typeof file.required !== 'boolean') {
      throw new PackageInstallError(`Invalid manifest file: ${file?.path || 'unknown'}`);
    }
    if (paths.has(file.path)) throw new PackageInstallError(`Duplicate manifest file: ${file.path}`);
    paths.add(file.path);
  });
  const curriculumFiles = manifest.files.filter(file => file.kind === 'curriculum' && file.required);
  if (curriculumFiles.length !== 1) throw new PackageInstallError('Manifest requires exactly one required curriculum file');
}

function validateStoredPackage(downloaded: DownloadedContentPackage, packageId: string, version: string): DownloadedContentPackage {
  validateManifest(downloaded.manifest);
  if (downloaded.manifest.packageId !== packageId || downloaded.manifest.version !== version) {
    throw new PackageInstallError('Stored package identity does not match requested package');
  }
  const curriculumPath = downloaded.manifest.files.find(file => file.kind === 'curriculum' && file.required)!.path;
  let content = downloaded.content;
  const serializedContent = downloaded.files?.[curriculumPath];
  if (serializedContent !== undefined) {
    try {
      content = JSON.parse(serializedContent) as typeof content;
    } catch {
      throw new PackageInstallError(`Curriculum file is not valid JSON: ${curriculumPath}`);
    }
  }
  if (!content || typeof content !== 'object' || content.id !== packageId || content.version !== version) {
    throw new PackageInstallError('Manifest and curriculum package identity do not match');
  }
  content = adaptLegacyPackage(content);
  let validation;
  try {
    validation = validatePackage(content, { mode: 'production' });
  } catch (error) {
    throw new PackageInstallError(`Content package shape is invalid: ${errorMessage(error)}`);
  }
  if (!validation.valid) throw new PackageInstallError(`Content package is invalid: ${validation.errors.join('; ')}`);
  validateBundledAudioRights(downloaded.manifest, content);
  return { ...downloaded, content };
}

function validateBundledAudioRights(manifest: ContentPackageManifest, content: DownloadedContentPackage['content']): void {
  if (!manifest.files.some(file => file.kind === 'audio')) return;
  const tracksBySource = new Map<string, typeof content.recitationTracks>();
  content.recitationTracks.forEach(track => {
    tracksBySource.set(track.sourceId, [...(tracksBySource.get(track.sourceId) ?? []), track]);
  });
  if (tracksBySource.size === 0) {
    throw new PackageInstallError('Bundled audio files have no declared recitation tracks');
  }
  for (const [sourceId, tracks] of tracksBySource) {
    const grant = content.governance?.licenseGrants.find(candidate => grantCovers(candidate, {
      sourceId,
      profile: 'public-free',
      platforms: ['android', 'ios', 'web'],
      rights: ['public_distribution', 'redistribution', 'download', 'offline_storage', 'segmentation'],
      resourceIds: tracks.map(track => track.id),
      contentHashes: tracks.map(track => track.checksum),
    }));
    if (!grant) {
      throw new PackageInstallError(`Bundled audio from source "${sourceId}" lacks exact redistribution and offline-package rights`);
    }
  }
}

function isSafeIdentity(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
}

function isSafeRelativePath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.startsWith('/') || value.includes('\\')) return false;
  const segments = value.split('/');
  return segments.every(segment => /^[A-Za-z0-9._-]+$/.test(segment) && segment !== '.' && segment !== '..');
}

function cloneRegistry(registry: InstalledPackageRegistry): InstalledPackageRegistry {
  return { packages: Object.fromEntries(Object.entries(registry.packages).map(([id, record]) => [id, { ...record, installedVersions: [...record.installedVersions] }])) };
}

async function safeRemove(store: PackageStore, key: string): Promise<void> {
  try { await store.remove(key); } catch { /* Staging cleanup can be retried without invalidating activation. */ }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
