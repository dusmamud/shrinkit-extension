import type { Locale } from '../lib/i18n/index.js';
import { t } from '../lib/i18n/index.js';
import type { Settings } from '../lib/settings/index.js';

export type Theme = Settings['theme'];

export interface ThemeSwitcherProps {
  locale?: Locale;
  theme: Theme;
  onChange: (theme: Theme) => void;
}

const THEME_OPTIONS: Theme[] = ['light', 'dark', 'system'];

const THEME_LABEL_KEYS: Record<Theme, string> = {
  light: 'ext.theme_light',
  dark: 'ext.theme_dark',
  system: 'ext.theme_system',
};

/**
 * Theme picker (Light / Dark / System). Labels come from the message
 * catalogs (ext.theme_*, localised per the current locale) — no hardcoded
 * labels. `locale` defaults to English when the caller has no locale yet.
 */
export function ThemeSwitcher({ locale = 'en', theme, onChange }: ThemeSwitcherProps) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
      <span>{t(locale, 'ext.theme')}</span>
      <select
        aria-label={t(locale, 'ext.theme')}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        onChange={(event) => {
          const next = event.target.value;
          if (next === 'light' || next === 'dark' || next === 'system') {
            onChange(next);
          }
        }}
        value={theme}
      >
        {THEME_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {t(locale, THEME_LABEL_KEYS[option])}
          </option>
        ))}
      </select>
    </label>
  );
}
