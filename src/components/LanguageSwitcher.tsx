import type { Locale } from '../lib/i18n/index.js';
import { t } from '../lib/i18n/index.js';

export interface LanguageSwitcherProps {
  locale: Locale;
  onChange: (locale: Locale) => void;
}

const LANGUAGE_OPTIONS: Locale[] = ['en', 'es', 'pt'];

const LANGUAGE_LABEL_KEYS: Record<Locale, string> = {
  en: 'ext.language_en',
  es: 'ext.language_es',
  pt: 'ext.language_pt',
};

/**
 * Language picker. Labels come from the message catalogs
 * (ext.language_*, localised per the current locale) — no hardcoded labels.
 */
export function LanguageSwitcher({ locale, onChange }: LanguageSwitcherProps) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
      <span>{t(locale, 'ext.language')}</span>
      <select
        aria-label={t(locale, 'ext.language')}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        onChange={(event) => {
          const next = event.target.value;
          if (next === 'en' || next === 'es' || next === 'pt') {
            onChange(next);
          }
        }}
        value={locale}
      >
        {LANGUAGE_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {t(locale, LANGUAGE_LABEL_KEYS[option])}
          </option>
        ))}
      </select>
    </label>
  );
}
