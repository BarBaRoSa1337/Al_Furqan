import { DEFAULT_LEARNER_PREFERENCES, type LearnerPreferences } from '../../../packages/api-contracts/src';

let currentPreferences = DEFAULT_LEARNER_PREFERENCES;

export function setCurrentLearnerPreferences(preferences: LearnerPreferences): void {
  currentPreferences = preferences;
}

export function getCurrentLearnerPreferences(): LearnerPreferences {
  return currentPreferences;
}
