import { isRuntimePackageResponse, type ContentMode, type SupportedLocale } from '../../../packages/api-contracts/src';
import type { ContentPackage } from '../../types/content';
import { getContentRepository } from './repository';

export function getRuntimeApiBaseUrl(value = process.env.EXPO_PUBLIC_FURQAN_API_BASE_URL): string | undefined {
  const normalized = value?.trim().replace(/\/$/, '');
  return normalized || undefined;
}

export function buildRuntimePackageUrl(
  baseUrl: string,
  packageId: string,
  locale: SupportedLocale,
  contentMode: ContentMode,
): string {
  const query = new URLSearchParams({ locale, contentMode });
  return `${baseUrl}/v1/content/packages/${encodeURIComponent(packageId)}?${query}`;
}

export async function loadRuntimePackage(packageId: string, locale: SupportedLocale, contentMode: ContentMode): Promise<void> {
  const baseUrl = getRuntimeApiBaseUrl();
  if (!baseUrl) throw new Error('Furqan backend is not configured.');
  const response = await fetch(buildRuntimePackageUrl(baseUrl, packageId, locale, contentMode), {
    headers: { accept: 'application/json' },
  });
  const body = await response.json() as unknown;
  if (!response.ok) throw new Error(readApiMessage(body) ?? `Content request failed (${response.status}).`);
  if (!isRuntimePackageResponse(body) || body.packageId !== packageId || body.locale !== locale || body.contentMode !== contentMode) {
    throw new Error('Furqan backend returned an invalid package response.');
  }
  getContentRepository().registerPackage(body.package as ContentPackage, true, 'runtime');
}

function readApiMessage(value: unknown): string | undefined {
  if (!value || typeof value !== 'object' || !('error' in value)) return undefined;
  const error = value.error;
  return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : undefined;
}
