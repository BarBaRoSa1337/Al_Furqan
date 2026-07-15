import surahAlFilPackage from '../../content/packages/surah-al-fil/v1';
import { ContentPackage } from '../../types/content';
import { DownloadedContentPackage, PackageStore } from '../../types/packages';
import { ContentPackageInstaller, PackageInstallError } from './installer';

class MemoryStore implements PackageStore {
  values = new Map<string, unknown>();
  async read<T>(key: string): Promise<T | undefined> { return this.values.get(key) as T | undefined; }
  async write<T>(key: string, value: T): Promise<void> { this.values.set(key, value); }
  async remove(key: string): Promise<void> { this.values.delete(key); }
}

function fixture(version = '1.0.0'): DownloadedContentPackage {
  const content = structuredClone(surahAlFilPackage) as ContentPackage;
  approveFixtureContent(content);
  content.version = version;
  return { manifest: { packageId: content.id, version, files: [{ path: 'package.json', kind: 'curriculum', checksum: 'a'.repeat(64), required: true }] }, content };
}

function approveFixtureContent(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  if ('reviewerStatus' in value) (value as { reviewerStatus: string }).reviewerStatus = 'approved';
  Object.values(value).forEach(approveFixtureContent);
}

test('stages before atomically activating a package without touching progress storage', async () => {
  const store = new MemoryStore();
  store.values.set('qlp_progress_v2', { preserved: true });
  const installer = new ContentPackageInstaller(store, { download: async () => '{}' }, { verify: async () => true });
  const downloaded = fixture();

  await installer.stage(downloaded);
  expect(await installer.getActive(downloaded.manifest.packageId)).toBeUndefined();
  await installer.activate(downloaded.manifest.packageId, downloaded.manifest.version);

  expect((await installer.getActive(downloaded.manifest.packageId))?.content.version).toBe('1.0.0');
  expect(store.values.get('qlp_progress_v2')).toEqual({ preserved: true });
});

test('rejects checksum failure and keeps the prior active version for rollback', async () => {
  const store = new MemoryStore();
  const valid = new ContentPackageInstaller(store, { download: async () => '{}' }, { verify: async () => true });
  await valid.stage(fixture('1.0.0'));
  await valid.activate(surahAlFilPackage.id, '1.0.0');
  const failing = new ContentPackageInstaller(store, { download: async () => '{}' }, { verify: async () => false });

  await expect(failing.stage(fixture('2.0.0'))).rejects.toBeInstanceOf(PackageInstallError);
  expect((await valid.getActive(surahAlFilPackage.id))?.content.version).toBe('1.0.0');
});
