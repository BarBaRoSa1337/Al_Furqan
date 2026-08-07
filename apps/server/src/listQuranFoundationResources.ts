import { MemoryServerCache } from './cache';
import { readQuranFoundationConfig } from './config';
import { QuranFoundationProvider } from './quranFoundation';

async function main(): Promise<void> {
  const config = readQuranFoundationConfig();
  const provider = new QuranFoundationProvider(config, new MemoryServerCache());
  const response = await provider.listResources('en');

  // Resource discovery intentionally prints metadata only, never credentials or Quran content.
  process.stdout.write(`${JSON.stringify({
    environment: config.environment,
    fetchedAt: response.fetchedAt,
    expiresAt: response.expiresAt,
    resources: response.data,
  }, null, 2)}\n`);
}

main().catch(error => {
  process.stderr.write(`Quran Foundation resource discovery failed: ${error instanceof Error ? error.message : 'unknown error'}\n`);
  process.exitCode = 1;
});
