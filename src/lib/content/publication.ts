import type { SupportedLocale } from '../../../packages/api-contracts/src';
import type { ContentPackage } from '../../types/content';

export function isLessonLocaleAvailable(contentPackage: ContentPackage, locale: SupportedLocale): boolean {
  const publication = contentPackage.localePublications?.find(item => item.locale === locale);
  if (publication?.status === 'published') return true;
  if (__DEV__ && publication?.status === 'draft') return true;
  return __DEV__ && !contentPackage.localePublications && locale === contentPackage.localization.defaultLocale;
}

export function availableLessonLocales(contentPackage: ContentPackage): SupportedLocale[] {
  if (!contentPackage.localePublications) {
    return __DEV__ ? [contentPackage.localization.defaultLocale as SupportedLocale] : [];
  }
  return contentPackage.localePublications.flatMap(item => (
    item.status === 'published' || (__DEV__ && item.status === 'draft') ? [item.locale] : []
  ));
}
