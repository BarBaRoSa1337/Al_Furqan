import surahAlFilPackage from '../../content/packages/surah-al-fil/v1';
import { getPackagePayloadHash } from './governance';
import { isLocalPreviewEnabled, isLocalPreviewRequested } from './contentMode';
import { validateLocalPreviewArtifact } from './localPreviewProvider';
import { bundledLocalPreviewArtifacts } from '../../content/local-preview/registry';

const artifact = () => ({
  package: structuredClone(surahAlFilPackage),
  integrity: {
    packageId: surahAlFilPackage.id,
    revisionId: surahAlFilPackage.revisionId,
    payloadSha256: getPackagePayloadHash(surahAlFilPackage),
  },
});

test('enables local preview only through both explicit preview controls', () => {
  expect(isLocalPreviewRequested('true')).toBe(true);
  expect(isLocalPreviewRequested('TRUE')).toBe(true);
  expect(isLocalPreviewRequested('1')).toBe(false);
  expect(isLocalPreviewEnabled('preview', 'true')).toBe(true);
  expect(isLocalPreviewEnabled('production', 'true')).toBe(false);
  expect(isLocalPreviewEnabled('preview', 'false')).toBe(false);
});

test('accepts a development-valid local artifact with the expected coverage', () => {
  expect(validateLocalPreviewArtifact(artifact(), {
    expectedPackageId: surahAlFilPackage.id,
    expectedSurahNumbers: [105],
    expectedLocale: 'en',
  }).id).toBe(surahAlFilPackage.id);
});

test('rejects a local artifact built for another lesson locale', () => {
  expect(() => validateLocalPreviewArtifact(artifact(), {
    expectedPackageId: surahAlFilPackage.id,
    expectedSurahNumbers: [105],
    expectedLocale: 'fr',
  })).toThrow('locale does not match requested fr');
});

test('rejects a tampered local preview package', () => {
  const candidate = artifact();
  candidate.package.title = 'Tampered';

  expect(() => validateLocalPreviewArtifact(candidate, {
    expectedPackageId: surahAlFilPackage.id,
    expectedSurahNumbers: [105],
  })).toThrow('SHA-256 digest does not match');
});

test('rejects incomplete local preview Surah coverage', () => {
  expect(() => validateLocalPreviewArtifact(artifact())).toThrow('missing canonical content for Surah 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 106, 107, 108, 109, 110, 111, 112, 113, 114');
});

test.each(['en', 'fr', 'ar'] as const)('loads the generated twenty-two-Surah %s runtime artifact', locale => {
  const generated = bundledLocalPreviewArtifacts[locale];
  expect(generated).toBeDefined();
  expect(validateLocalPreviewArtifact(generated!, { expectedLocale: locale }).surahs.filter(surah => !surah.navigationOnly)).toHaveLength(22);
});
