export type SessionPhase = 'main' | 'retry';

export interface SessionCursor {
  phase: SessionPhase;
  currentStepIndex: number;
  retryStepIndexes: number[];
}

export interface SessionAdvance {
  cursor: SessionCursor;
  complete: boolean;
}

export function createSessionCursor(currentStepIndex: number, retryStepIndexes: number[] = [], retryPhase = false): SessionCursor {
  const retries = unique(retryStepIndexes);
  return {
    phase: retryPhase && retries.length > 0 ? 'retry' : 'main',
    currentStepIndex: retryPhase && retries.length > 0 ? retries[0] : currentStepIndex,
    retryStepIndexes: retries,
  };
}

export function advanceSessionCursor(totalSteps: number, cursor: SessionCursor, correct: boolean): SessionAdvance {
  if (totalSteps <= 0) return { cursor, complete: true };

  if (cursor.phase === 'retry') {
    const remaining = cursor.retryStepIndexes.filter(index => index !== cursor.currentStepIndex);
    const nextRetries = correct ? remaining : [...remaining, cursor.currentStepIndex];
    if (nextRetries.length === 0) return { cursor: { ...cursor, retryStepIndexes: [] }, complete: true };
    return {
      cursor: { phase: 'retry', currentStepIndex: nextRetries[0], retryStepIndexes: nextRetries },
      complete: false,
    };
  }

  const nextRetries = correct
    ? cursor.retryStepIndexes
    : unique([...cursor.retryStepIndexes, cursor.currentStepIndex]);
  const nextMainIndex = cursor.currentStepIndex + 1;
  if (nextMainIndex < totalSteps) {
    return {
      cursor: { phase: 'main', currentStepIndex: nextMainIndex, retryStepIndexes: nextRetries },
      complete: false,
    };
  }
  if (nextRetries.length > 0) {
    return {
      cursor: { phase: 'retry', currentStepIndex: nextRetries[0], retryStepIndexes: nextRetries },
      complete: false,
    };
  }
  return { cursor: { ...cursor, retryStepIndexes: [] }, complete: true };
}

function unique(values: number[]): number[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}
