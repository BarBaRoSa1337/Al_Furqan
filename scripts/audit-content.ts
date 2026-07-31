import './setup-mocks';
import surahAlFilPackage from '../src/content/packages/surah-al-fil/v1';
import { validatePackage } from '../src/lib/content/packageValidator';

const json = process.argv.includes('--json');
const result = validatePackage(surahAlFilPackage, {
  mode: 'production',
  releaseProfile: 'public-free',
});
const groups = result.diagnostics.reduce<Record<string, number>>((counts, diagnostic) => {
  counts[diagnostic.code] = (counts[diagnostic.code] ?? 0) + 1;
  return counts;
}, {});

if (json) {
  console.log(JSON.stringify({
    valid: result.valid,
    releaseProfile: 'public-free',
    totals: {
      errors: result.errors.length,
      warnings: result.warnings.length,
    },
    groups,
    diagnostics: result.diagnostics,
  }, null, 2));
} else {
  console.log('Production content audit (public-free)');
  Object.entries(groups)
    .sort(([, left], [, right]) => right - left)
    .forEach(([code, count]) => console.log(`${String(count).padStart(4)}  ${code}`));
  console.log(`\n${result.errors.length} blocker(s), ${result.warnings.length} warning(s).`);
}

if (!result.valid) process.exitCode = 1;
