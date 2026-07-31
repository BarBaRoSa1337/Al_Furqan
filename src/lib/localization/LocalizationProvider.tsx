import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  DEFAULT_LEARNER_PREFERENCES,
  directionForLocale,
  isSupportedLocale,
  type LearnerPreferences,
  type SupportedLocale,
} from '../../../packages/api-contracts/src';
import { appText, setCurrentInterfaceLocale } from './catalogs';
import { setCurrentLearnerPreferences } from './preferencesState';

const STORAGE_KEY = 'furqan_learner_preferences_v1';

interface LocalizationContextValue {
  ready: boolean;
  preferences: LearnerPreferences;
  direction: 'ltr' | 'rtl';
  t: (key: string, values?: Record<string, string | number>) => string;
  updatePreferences: (patch: Partial<LearnerPreferences>) => Promise<void>;
  setInterfaceLocale: (locale: SupportedLocale) => Promise<void>;
  setLessonLocale: (locale: SupportedLocale) => Promise<void>;
}

const LocalizationContext = createContext<LocalizationContextValue | null>(null);

export function LocalizationProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [preferences, setPreferences] = useState<LearnerPreferences>(DEFAULT_LEARNER_PREFERENCES);
  setCurrentLearnerPreferences(preferences);
  setCurrentInterfaceLocale(preferences.interfaceLocale);

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!raw || cancelled) return;
      const parsed = normalizePreferences(JSON.parse(raw) as Partial<LearnerPreferences>);
      setPreferences(parsed);
    }).catch(() => undefined).finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  const updatePreferences = async (patch: Partial<LearnerPreferences>) => {
    const next = normalizePreferences({ ...preferences, ...patch });
    setPreferences(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <LocalizationContext.Provider value={{
      ready,
      preferences,
      direction: directionForLocale(preferences.interfaceLocale),
      t: (key, values) => appText(preferences.interfaceLocale, key, values),
      updatePreferences,
      setInterfaceLocale: locale => updatePreferences({ interfaceLocale: locale }),
      setLessonLocale: locale => updatePreferences({ lessonLocale: locale }),
    }}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization(): LocalizationContextValue {
  const value = useContext(LocalizationContext);
  if (!value) throw new Error('useLocalization must be used inside LocalizationProvider');
  return value;
}

function normalizePreferences(value: Partial<LearnerPreferences>): LearnerPreferences {
  const interfaceLocale = isSupportedLocale(value.interfaceLocale) ? value.interfaceLocale : DEFAULT_LEARNER_PREFERENCES.interfaceLocale;
  const lessonLocale = isSupportedLocale(value.lessonLocale) ? value.lessonLocale : DEFAULT_LEARNER_PREFERENCES.lessonLocale;
  return {
    ...DEFAULT_LEARNER_PREFERENCES,
    ...value,
    interfaceLocale,
    lessonLocale,
    secondaryLocale: isSupportedLocale(value.secondaryLocale) ? value.secondaryLocale : undefined,
    quranScript: 'uthmani-hafs',
    transliterationPreference: value.transliterationPreference === 'hide' ? 'hide' : 'show',
  };
}
