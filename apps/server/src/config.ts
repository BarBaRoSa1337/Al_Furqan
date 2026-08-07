import type { QuranFoundationConfig } from './quranFoundation';
import type { QuranProviderResourceConfig } from './quranContentProvider';

export interface ServerConfig {
  quranFoundation: QuranFoundationConfig;
  quranFoundationResources: QuranProviderResourceConfig;
  allowedOrigins: string[];
  port: number;
  enableDraftRuntime: boolean;
}

type EnvironmentVariables = Record<string, string | undefined>;

export function readQuranFoundationConfig(env: EnvironmentVariables = process.env): QuranFoundationConfig {
  return {
    environment: qfEnvironment(env.QF_ENV),
    clientId: required(env.QF_CLIENT_ID, 'QF_CLIENT_ID'),
    clientSecret: required(env.QF_CLIENT_SECRET, 'QF_CLIENT_SECRET'),
  };
}

export function readServerConfig(env: EnvironmentVariables = process.env): ServerConfig {
  return {
    quranFoundation: readQuranFoundationConfig(env),
    quranFoundationResources: {
      translationId: positiveInteger(env.QF_TRANSLATION_RESOURCE_ID, 'QF_TRANSLATION_RESOURCE_ID', true)!,
      tafsirId: positiveInteger(env.QF_TAFSIR_RESOURCE_ID, 'QF_TAFSIR_RESOURCE_ID'),
      chapterInfoId: positiveInteger(env.QF_CHAPTER_INFO_RESOURCE_ID, 'QF_CHAPTER_INFO_RESOURCE_ID'),
      recitationId: positiveInteger(env.QF_RECITATION_RESOURCE_ID, 'QF_RECITATION_RESOURCE_ID'),
    },
    allowedOrigins: csv(env.FURQAN_ALLOWED_ORIGINS),
    port: positiveInteger(env.FURQAN_PORT ?? '8787', 'FURQAN_PORT', true)!,
    enableDraftRuntime: env.FURQAN_ENABLE_DRAFT_RUNTIME === 'true',
  };
}

function qfEnvironment(value: string | undefined): QuranFoundationConfig['environment'] {
  if (value === 'prelive' || value === 'production') return value;
  throw new Error('QF_ENV must be exactly "prelive" or "production"');
}

function required(value: string | undefined, name: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${name} is required in the server environment`);
  return normalized;
}

function positiveInteger(value: string | undefined, name: string, requiredValue = false): number | undefined {
  if (!value?.trim()) {
    if (requiredValue) throw new Error(`${name} is required in the server environment`);
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

function csv(value: string | undefined): string[] {
  return (value ?? '').split(',').map(item => item.trim()).filter(Boolean);
}
