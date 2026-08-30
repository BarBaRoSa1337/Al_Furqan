import { ContentRepository, PackageTextKey } from '../../types/content';
import type { SupportedLocale } from '../../../packages/api-contracts/src';
import { appText, getCurrentInterfaceLocale } from '../localization/catalogs';

export function packageText(repo: ContentRepository, key: PackageTextKey, values: Record<string, string | number> = {}, locale: SupportedLocale = getCurrentInterfaceLocale()): string {
  const resolvedText = repo.getText(key, locale);
  const appResolved = appText(locale, key, values);
  return Object.entries(values).reduce(
    (text, [name, value]) => text.split(`{${name}}`).join(String(value)),
    resolvedText === key ? appResolved : resolvedText
  );
}
