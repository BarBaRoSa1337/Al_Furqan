import { ContentRepository, PackageTextKey } from '../../types/content';

export function packageText(repo: ContentRepository, key: PackageTextKey, values: Record<string, string | number> = {}): string {
  return Object.entries(values).reduce(
    (text, [name, value]) => text.split(`{${name}}`).join(String(value)),
    repo.getText(key)
  );
}
