import surahAlFilPackage from '../../content/packages/surah-al-fil/v1';
import { DownloadedContentPackage, PackageStore } from '../../types/packages';
import { createFullyApprovedPackage } from '../../test/approvedGovernanceFixture';
import { ContentPackageInstaller, PackageInstallError, hydrateInstalledPackages, validateManifest } from './installer';

class MemoryStore implements PackageStore {
  values = new Map<string, unknown>();
  failWriteKey?: string;
  async read<T>(key: string): Promise<T | undefined> { return this.values.get(key) as T | undefined; }
  async write<T>(key: string, value: T): Promise<void> {
    if (key === this.failWriteKey) throw new Error('fixture write failure');
    this.values.set(key, value);
  }
  async remove(key: string): Promise<void> { this.values.delete(key); }
}

function fixture(version = '1.0.0', packageId = surahAlFilPackage.id): DownloadedContentPackage {
  const content = createFullyApprovedPackage(surahAlFilPackage, { id: packageId, version });
  return { manifest: { packageId: content.id, version, files: [{ path: 'package.json', kind: 'curriculum', checksum: 'a'.repeat(64), required: true }] }, content };
}

function downloader(downloaded: DownloadedContentPackage) {
  return { download: async (path: string) => path === 'package.json' ? JSON.stringify(downloaded.content) : '' };
}

test('stages before atomically activating a package without touching progress storage', async () => {
  const store = new MemoryStore();
  store.values.set('qlp_progress_v2', { preserved: true });
  const downloaded = fixture();
  const installer = new ContentPackageInstaller(store, downloader(downloaded), { verify: async () => true });

  await installer.stage(downloaded);
  expect(await installer.getActive(downloaded.manifest.packageId)).toBeUndefined();
  await installer.activate(downloaded.manifest.packageId, downloaded.manifest.version);

  expect((await installer.getActive(downloaded.manifest.packageId))?.content.version).toBe('1.0.0');
  expect(store.values.get('qlp_progress_v2')).toEqual({ preserved: true });
});

test('rejects checksum failure and keeps the prior active version for rollback', async () => {
  const store = new MemoryStore();
  const first = fixture('1.0.0');
  const valid = new ContentPackageInstaller(store, downloader(first), { verify: async () => true });
  await valid.stage(first);
  await valid.activate(surahAlFilPackage.id, '1.0.0');
  const second = fixture('2.0.0');
  const failing = new ContentPackageInstaller(store, downloader(second), { verify: async () => false });

  await expect(failing.stage(second)).rejects.toBeInstanceOf(PackageInstallError);
  expect((await valid.getActive(surahAlFilPackage.id))?.content.version).toBe('1.0.0');
});

test.each(['../package.json', 'nested/../../package.json', '/package.json', 'nested\\package.json', './package.json', 'nested/%2e%2e/package.json'])(
  'rejects unsafe manifest path %s',
  path => {
    expect(() => validateManifest({ packageId: 'safe-package', version: '1.0.0', files: [{ path, kind: 'curriculum', checksum: 'a'.repeat(64), required: true }] })).toThrow(PackageInstallError);
  }
);

test('installs curriculum parsed from verified bytes instead of the caller object', async () => {
  const store = new MemoryStore();
  const downloaded = fixture();
  const mismatched = structuredClone(downloaded.content);
  mismatched.version = '9.9.9';
  const installer = new ContentPackageInstaller(store, { download: async () => JSON.stringify(mismatched) }, { verify: async () => true });

  await expect(installer.stage(downloaded)).rejects.toThrow('Manifest and curriculum package identity do not match');
});

test('rejects bundled audio without exact redistribution and offline-package rights', async () => {
  const store = new MemoryStore();
  const downloaded = fixture();
  downloaded.manifest.files.push({
    path: 'audio/105-1.mp3',
    kind: 'audio',
    checksum: 'b'.repeat(64),
    required: true,
  });
  const installer = new ContentPackageInstaller(store, downloader(downloaded), { verify: async () => true });

  await expect(installer.stage(downloaded)).rejects.toThrow('lacks exact redistribution and offline-package rights');
});

test('keeps the previous registry pointer when activation commit fails', async () => {
  const store = new MemoryStore();
  const first = fixture('1.0.0');
  const firstInstaller = new ContentPackageInstaller(store, downloader(first), { verify: async () => true });
  await firstInstaller.stage(first);
  await firstInstaller.activate(first.manifest.packageId, first.manifest.version);
  const second = fixture('2.0.0');
  const secondInstaller = new ContentPackageInstaller(store, downloader(second), { verify: async () => true });
  await secondInstaller.stage(second);
  store.failWriteKey = 'content-package-registry-v1';

  await expect(secondInstaller.activate(second.manifest.packageId, second.manifest.version)).rejects.toThrow('fixture write failure');
  store.failWriteKey = undefined;
  expect((await firstInstaller.getActive(first.manifest.packageId))?.content.version).toBe('1.0.0');
});

test('skips corrupted active content during hydration', async () => {
  const store = new MemoryStore();
  const downloaded = fixture();
  const installer = new ContentPackageInstaller(store, downloader(downloaded), { verify: async () => true });
  await installer.stage(downloaded);
  await installer.activate(downloaded.manifest.packageId, downloaded.manifest.version);
  const activeKey = `content-package-active:${downloaded.manifest.packageId}:${downloaded.manifest.version}`;
  const active = store.values.get(activeKey) as DownloadedContentPackage;
  active.files = { 'package.json': '{bad json' };
  const registerPackage = jest.fn();
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

  await expect(hydrateInstalledPackages(store, { registerPackage })).resolves.toBeUndefined();
  expect(registerPackage).not.toHaveBeenCalled();
  expect(warn).toHaveBeenCalledWith(expect.stringContaining(`[content:${downloaded.manifest.packageId}@${downloaded.manifest.version}]`));
  warn.mockRestore();
});

test('continues hydrating valid packages after a corrupted package', async () => {
  const store = new MemoryStore();
  const corrupted = fixture('1.0.0', 'corrupted-package');
  const valid = fixture('1.0.0', 'valid-package');
  const corruptedInstaller = new ContentPackageInstaller(store, downloader(corrupted), { verify: async () => true });
  const validInstaller = new ContentPackageInstaller(store, downloader(valid), { verify: async () => true });
  await corruptedInstaller.stage(corrupted);
  await corruptedInstaller.activate(corrupted.manifest.packageId, corrupted.manifest.version);
  await validInstaller.stage(valid);
  await validInstaller.activate(valid.manifest.packageId, valid.manifest.version);
  const corruptedKey = `content-package-active:${corrupted.manifest.packageId}:${corrupted.manifest.version}`;
  const corruptedActive = store.values.get(corruptedKey) as DownloadedContentPackage;
  corruptedActive.files = { 'package.json': '{bad json' };
  const registerPackage = jest.fn();
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

  await hydrateInstalledPackages(store, { registerPackage });

  expect(registerPackage).toHaveBeenCalledTimes(1);
  expect(registerPackage).toHaveBeenCalledWith(expect.objectContaining({ id: valid.manifest.packageId }), true);
  expect(warn).toHaveBeenCalledWith(expect.stringContaining(`[content:${corrupted.manifest.packageId}@${corrupted.manifest.version}]`));
  warn.mockRestore();
});
