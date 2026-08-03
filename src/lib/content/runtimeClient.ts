import { isRuntimePackageResponse, type SupportedLocale } from '../../../packages/api-contracts/src';
import type { ContentPackage } from '../../types/content';
import { getContentRepository } from './repository';

export function getRuntimeApiBaseUrl(value = process.env.EXPO_PUBLIC_FURQAN_API_BASE_URL): string | undefined {
  const normalized = value?.trim().replace(/\/$/, '');
  return normalized || undefined;
}

export async function loadRuntimePackage(packageId: string, locale: SupportedLocale): Promise<void> {
  const baseUrl = getRuntimeApiBaseUrl();
  if (!baseUrl) throw new Error('Furqan backend is not configured.');
  const response = await fetch(`${baseUrl}/v1/content/packages/${encodeURIComponent(packageId)}?locale=${locale}`, {
    headers: { accept: 'application/json' },
  });
  const body = await response.json() as unknown;
  if (!response.ok) throw new Error(readApiMessage(body) ?? `Content request failed (${response.status}).`);
  if (!isRuntimePackageResponse(body) || body.packageId !== packageId || body.locale !== locale) {
    throw new Error('Furqan backend returned an invalid package response.');
  }
  getContentRepository().registerPackage(body.package as ContentPackage, true, 'runtime');
}

function readApiMessage(value: unknown): string | undefined {
  if (!value || typeof value !== 'object' || !('error' in value)) return undefined;
  const error = value.error;
  return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : undefined;
}
