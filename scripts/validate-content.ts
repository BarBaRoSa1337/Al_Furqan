import './setup-mocks';
import surahAlFilPackage from '../src/content/packages/surah-al-fil/v1';
import { validatePackage } from '../src/lib/content/packageValidator';

const result = validatePackage(surahAlFilPackage, { mode: 'production' });

result.warnings.forEach(warning => console.warn(`WARNING: ${warning}`));
result.errors.forEach(error => console.error(`ERROR: ${error}`));

if (!result.valid) {
  console.error(`Production content validation failed with ${result.errors.length} error(s).`);
  process.exitCode = 1;
}
