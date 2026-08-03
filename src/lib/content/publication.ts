import type { ContentMode, SupportedLocale } from '../../../packages/api-contracts/src';
import type { ContentPackage } from '../../types/content';
import { resolveContentMode } from './contentMode';

export function isLessonLocaleAvailable(contentPackage: ContentPackage, locale: SupportedLocale, contentMode: ContentMode = resolveContentMode()): boolean {
  const publication = contentPackage.localePublications?.find(item => item.locale === locale);
  if (publication?.status === 'published') return true;
  if (contentMode === 'preview' && publication?.status === 'draft') return true;
  return contentMode === 'preview' && !contentPackage.localePublications && locale === contentPackage.localization.defaultLocale;
}

export function availableLessonLocales(contentPackage: ContentPackage, contentMode: ContentMode = resolveContentMode()): SupportedLocale[] {
  if (!contentPackage.localePublications) {
    return contentMode === 'preview' ? [contentPackage.localization.defaultLocale as SupportedLocale] : [];
  }
  return contentPackage.localePublications.flatMap(item => (
    item.status === 'published' || (contentMode === 'preview' && item.status === 'draft') ? [item.locale] : []
  ));
}
