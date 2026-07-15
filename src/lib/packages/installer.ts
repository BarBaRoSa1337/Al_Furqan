import { validatePackage } from '../content/packageValidator';
import type { ContentRepository } from '../../types/content';
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

export class PackageInstallError extends Error {}

export class ContentPackageInstaller {
  constructor(private readonly store: PackageStore, private readonly downloader: PackageDownloader, private readonly checksums: ChecksumVerifier, private readonly repository?: Pick<ContentRepository, 'registerPackage'>) {}

  async stage(downloaded: DownloadedContentPackage): Promise<void> {
    validateManifest(downloaded.manifest);
    if (downloaded.content.id !== downloaded.manifest.packageId || downloaded.content.version !== downloaded.manifest.version) {
      throw new PackageInstallError('Manifest and content package identity do not match');
    }
    for (const file of downloaded.manifest.files) {
      const contents = await this.downloader.download(file.path);
      if (!await this.checksums.verify(contents, file.checksum)) throw new PackageInstallError(`Checksum failed for ${file.path}`);
    }
    const validation = validatePackage(downloaded.content, { mode: 'production' });
    if (!validation.valid) throw new PackageInstallError(`Content package is invalid: ${validation.errors.join('; ')}`);
    await this.store.write(stagedKey(downloaded.manifest.packageId, downloaded.manifest.version), downloaded);
  }

  async activate(packageId: string, version: string): Promise<void> {
    const staged = await this.store.read<DownloadedContentPackage>(stagedKey(packageId, version));
    if (!staged) throw new PackageInstallError(`No validated staged package for ${packageId}@${version}`);
    await this.store.write(activeKey(packageId, version), staged);
    const registry = await this.getRegistry();
    const current = registry.packages[packageId];
    registry.packages[packageId] = {
      packageId,
      activeVersion: version,
      installedVersions: [...new Set([...(current?.installedVersions ?? []), version])].sort(),
    };
    await this.store.write(REGISTRY_KEY, registry);
    await this.store.remove(stagedKey(packageId, version));
    this.repository?.registerPackage(staged.content, true);
  }

  async rollback(packageId: string, version: string): Promise<void> {
    const previous = await this.store.read<DownloadedContentPackage>(activeKey(packageId, version));
    if (!previous) throw new PackageInstallError(`Installed version is unavailable: ${packageId}@${version}`);
    const registry = await this.getRegistry();
    const current = registry.packages[packageId];
    registry.packages[packageId] = { packageId, activeVersion: version, installedVersions: [...new Set([...(current?.installedVersions ?? []), version])].sort() };
    await this.store.write(REGISTRY_KEY, registry);
    this.repository?.registerPackage(previous.content, true);
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
    const active = await store.read<DownloadedContentPackage>(activeKey(record.packageId, record.activeVersion));
    if (active) repository.registerPackage(active.content, true);
  }
}

export function validateManifest(manifest: ContentPackageManifest): void {
  if (!manifest.packageId || !manifest.version || manifest.files.length === 0) throw new PackageInstallError('Manifest requires package identity and files');
  const paths = new Set<string>();
  manifest.files.forEach(file => {
    if (!file.path || !/^[a-f0-9]{64}$/i.test(file.checksum)) throw new PackageInstallError(`Invalid manifest file: ${file.path || 'unknown'}`);
    if (paths.has(file.path)) throw new PackageInstallError(`Duplicate manifest file: ${file.path}`);
    paths.add(file.path);
  });
}
