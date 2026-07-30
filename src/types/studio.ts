import type { AyahRef, ContentPackage, QuranEditionId } from './content';

export type StudioRole = 'author' | 'editor' | 'shaykh_reviewer' | 'publisher';
export type PublicationState = 'draft' | 'editorial_review' | 'shaykh_review' | 'approved' | 'published' | 'rejected';

export interface CanonicalSelection {
  editionId: QuranEditionId;
  surahIds: string[];
  ayahRefs: AyahRef[];
  wordTokenIds: string[];
  divisionIds: string[];
}

export interface PublishablePackageDraft {
  state: PublicationState;
  canonical: CanonicalSelection;
  curriculum: Omit<ContentPackage, 'editions' | 'surahs' | 'ayat' | 'wordTokens' | 'divisions' | 'structureIndex'>;
}

export interface CompileDiagnostic {
  code: string;
  message: string;
  path?: string;
}

export interface CompiledContentPackage {
  package: ContentPackage;
  contentHash: string;
  diagnostics: CompileDiagnostic[];
}

export interface ContentHasher {
  hash(value: string): string;
}
