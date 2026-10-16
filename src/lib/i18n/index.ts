import { useCallback, useEffect, useState } from 'react';

import enMessages from '../../i18n/messages/en.json';
import esMessages from '../../i18n/messages/es.json';
import ptMessages from '../../i18n/messages/pt.json';
import { getLocale, saveSettings } from '../settings/index.js';

export type Locale = 'en' | 'es' | 'pt';

export const LOCALES: Locale[] = ['en', 'es', 'pt'];

const MESSAGES: Record<Locale, Record<string, string>> = {
  en: enMessages as Record<string, string>,
  es: esMessages as Record<string, string>,
  pt: ptMessages as Record<string, string>,
};

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'es' || value === 'pt';
}

/** All messages for a locale. Unknown locales fall back to English. */
export function getMessages(locale: Locale): Record<string, string> {
  return MESSAGES[isLocale(locale) ? locale : 'en'];
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    if (Object.prototype.hasOwnProperty.call(params, name)) {
      return String(params[name]);
    }
    return match;
  });
}

/**
 * Translate a key for a locale, interpolating `{param}` placeholders.
 * A missing key returns the key itself — never throws.
 */
export function t(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const messages = getMessages(locale);
  const template = messages[key];
  if (typeof template !== 'string') {
    return key;
  }
  return interpolate(template, params);
}

/**
 * React hook for the current UI locale, backed by the settings store.
 * Loads the stored locale on mount; setLocale persists the choice via
 * chrome.storage (sync, local fallback) and updates local state.
 * Never throws.
 */
export function useLocale(): { locale: Locale; setLocale: (locale: Locale) => void } {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    let cancelled = false;
    void getLocale().then((stored) => {
      if (!cancelled) {
        setLocaleState(stored);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    if (!isLocale(next)) {
      return;
    }
    setLocaleState(next);
    void saveSettings({ language: next });
  }, []);

  return { locale, setLocale };
}
