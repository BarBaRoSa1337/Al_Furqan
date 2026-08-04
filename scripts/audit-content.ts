import surahAlFilPackage from '../src/content/packages/surah-al-fil/v1';
import { validatePackage } from '../src/lib/content/packageValidator';
import { MP3QURAN_PERMISSION_STATUS } from '../packages/content-preview/src/constants';

const json = process.argv.includes('--json');
const result = validatePackage(surahAlFilPackage, {
  mode: 'production',
  releaseProfile: 'public-free',
});

// --- Source terms compliance checks ---
const termsChecks: Array<{ code: string; severity: 'error' | 'warning'; message: string }> = [];

if (MP3QURAN_PERMISSION_STATUS !== 'verified') {
  termsChecks.push({
    code: 'mp3quran_permission_pending',
    severity: 'error',
    message: 'MP3Quran permission evidence is not verified. Obtain written permission and set MP3QURAN_PERMISSION_STATUS to verified.',
  });
}

// Privacy Policy and Terms of Use existence check (template presence)
termsChecks.push({
  code: 'privacy_policy_draft',
  severity: 'warning',
  message: 'Privacy Policy is a draft template. Review with legal counsel and publish before provider-backed release.',
});
termsChecks.push({
  code: 'terms_of_use_draft',
  severity: 'warning',
  message: 'Terms of Use is a draft template. Review with legal counsel and publish before provider-backed release.',
});

// Combine with package validation diagnostics
const allDiagnostics = [
  ...result.diagnostics,
  ...termsChecks.map(check => ({
    code: check.code,
    severity: check.severity,
    message: check.message,
    path: 'source-terms-compliance',
  })),
];

const allErrors = allDiagnostics.filter(d => d.severity === 'error');
const allWarnings = allDiagnostics.filter(d => d.severity === 'warning');

const groups = allDiagnostics.reduce<Record<string, number>>((counts, diagnostic) => {
  counts[diagnostic.code] = (counts[diagnostic.code] ?? 0) + 1;
  return counts;
}, {});

if (json) {
  console.log(JSON.stringify({
    valid: result.valid && termsChecks.every(c => c.severity !== 'error'),
    releaseProfile: 'public-free',
    totals: {
      errors: allErrors.length,
      warnings: allWarnings.length,
    },
    groups,
    diagnostics: allDiagnostics,
  }, null, 2));
} else {
  console.log('Production content audit (public-free)');
  Object.entries(groups)
    .sort(([, left], [, right]) => right - left)
    .forEach(([code, count]) => console.log(`${String(count).padStart(4)}  ${code}`));
  console.log(`\n${allErrors.length} blocker(s), ${allWarnings.length} warning(s).`);
}

if (!result.valid || termsChecks.some(c => c.severity === 'error')) process.exitCode = 1;
