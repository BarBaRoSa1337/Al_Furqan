import type { ContentMode } from '../../../packages/api-contracts/src';
import type { ValidationMode } from './packageValidator';

export function resolveContentMode(value = process.env.EXPO_PUBLIC_FURQAN_CONTENT_MODE): ContentMode {
  return value?.trim().toLowerCase() === 'preview' ? 'preview' : 'production';
}

export function validationModeForContentMode(contentMode: ContentMode): ValidationMode {
  return contentMode === 'preview' ? 'development' : 'production';
}

export function isPreviewContentMode(contentMode = resolveContentMode()): boolean {
  return contentMode === 'preview';
}

export function isLocalPreviewRequested(value = process.env.EXPO_PUBLIC_FURQAN_LOCAL_PREVIEW): boolean {
  return value?.trim().toLowerCase() === 'true';
}

/** Local draft content is an opt-in preview provider, never a production fallback. */
export function isLocalPreviewEnabled(
  contentMode = resolveContentMode(),
  value = process.env.EXPO_PUBLIC_FURQAN_LOCAL_PREVIEW,
): boolean {
  return contentMode === 'preview' && isLocalPreviewRequested(value);
}
