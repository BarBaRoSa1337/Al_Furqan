import type { ActivityEvaluationContext, TypedAnswerTarget } from '../../types/activities';
import type { ContentRepository } from '../../types/content';

export function createActivityEvaluationContext(repo: ContentRepository): ActivityEvaluationContext {
  return {
    resolveTypedTarget: target => resolveTypedTarget(repo, target),
  };
}

export function resolveTypedTarget(repo: ContentRepository, target: TypedAnswerTarget): string | undefined {
  if (target.kind === 'ayah') return repo.getAyahByRef(target.ayahRef)?.arabicText.text;
  const tokens = target.tokenIds.map(id => repo.getWordToken(id));
  return tokens.every(Boolean) ? tokens.map(token => token!.arabicText).join(' ') : undefined;
}
