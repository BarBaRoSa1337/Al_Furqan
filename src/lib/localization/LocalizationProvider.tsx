import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_LEARNER_PREFERENCES,
  directionForLocale,
  isSupportedLocale,
  type LearnerPreferences,
  type SupportedLocale,
} from '../../../packages/api-contracts/src';
import { appText, setCurrentInterfaceLocale } from './catalogs';
import { setCurrentLearnerPreferences } from './preferencesState';

const STORAGE_KEY = 'furqan_learner_preferences_v2';
const LEGACY_STORAGE_KEY = 'furqan_learner_preferences_v1';

interface LocalizationContextValue {
  ready: boolean;
  preferences: LearnerPreferences;
  direction: 'ltr' | 'rtl';
  t: (key: string, values?: Record<string, string | number>) => string;
  updatePreferences: (patch: Partial<LearnerPreferences>) => Promise<void>;
  setInterfaceLocale: (locale: SupportedLocale) => Promise<void>;
  setLessonLocale: (locale: SupportedLocale) => Promise<void>;
  setContentLocale: (locale: SupportedLocale) => Promise<void>;
}

const LocalizationContext = createContext<LocalizationContextValue | null>(null);

export function LocalizationProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [preferences, setPreferences] = useState<LearnerPreferences>(DEFAULT_LEARNER_PREFERENCES);
  const preferencesRef = useRef(preferences);
  useEffect(() => {
    setCurrentLearnerPreferences(preferences);
    setCurrentInterfaceLocale(preferences.interfaceLocale);
    preferencesRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([AsyncStorage.getItem(STORAGE_KEY), AsyncStorage.getItem(LEGACY_STORAGE_KEY)]).then(([current, legacy]) => {
      const raw = current ?? legacy;
      if (!raw || cancelled) return;
      const parsed = normalizePreferences(JSON.parse(raw) as Partial<LearnerPreferences>);
      preferencesRef.current = parsed;
      setPreferences(parsed);
      if (!current) void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }).catch(() => undefined).finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  const updatePreferences = async (patch: Partial<LearnerPreferences>) => {
    const next = normalizePreferences({ ...preferencesRef.current, ...patch });
    preferencesRef.current = next;
    setCurrentLearnerPreferences(next);
    setCurrentInterfaceLocale(next.interfaceLocale);
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
      setContentLocale: locale => updatePreferences({ contentLocale: locale }),
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

/** Renderer fallback supports isolated tests and package tooling outside app shell. */
export function useOptionalLocalization(): LocalizationContextValue | null {
  return useContext(LocalizationContext);
}

function normalizePreferences(value: Partial<LearnerPreferences>): LearnerPreferences {
  const interfaceLocale = isSupportedLocale(value.interfaceLocale) ? value.interfaceLocale : DEFAULT_LEARNER_PREFERENCES.interfaceLocale;
  const lessonLocale = isSupportedLocale(value.lessonLocale) ? value.lessonLocale : DEFAULT_LEARNER_PREFERENCES.lessonLocale;
  const contentLocale = isSupportedLocale(value.contentLocale) ? value.contentLocale : lessonLocale;
  return {
    ...DEFAULT_LEARNER_PREFERENCES,
    ...value,
    interfaceLocale,
    lessonLocale,
    contentLocale,
    secondaryLocale: isSupportedLocale(value.secondaryLocale) ? value.secondaryLocale : undefined,
    quranScript: 'uthmani-hafs',
    transliterationPreference: value.transliterationPreference === 'hide' ? 'hide' : 'show',
    autoplayRecitation: value.autoplayRecitation !== false,
  };
}
