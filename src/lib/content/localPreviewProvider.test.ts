import surahAlFilPackage from '../../content/packages/surah-al-fil/v1';
import { getPackagePayloadHash } from './governance';
import { isLocalPreviewEnabled, isLocalPreviewRequested } from './contentMode';
import { validateLocalPreviewArtifact } from './localPreviewProvider';

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
  }).id).toBe(surahAlFilPackage.id);
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
  expect(() => validateLocalPreviewArtifact(artifact())).toThrow('missing canonical content for Surah 106');
});
