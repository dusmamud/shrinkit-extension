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
 * Theme picker (Light / Dark / System) — web header control style: a
 * compact native <select> (h-10, 6px radius, --ed-* tokens) with a short
 * label. The label wraps and the select is max-w-full, so the control can
 * never overflow or clip at narrow widths; native dropdowns are never
 * clipped by ancestors. Labels come from the message catalogs
 * (ext.theme_*, localised per the current locale) — no hardcoded labels.
 * `locale` defaults to English when the caller has no locale yet.
 */
export function ThemeSwitcher({ locale = 'en', theme, onChange }: ThemeSwitcherProps) {
  return (
    <label className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--ed-ink-2)]">
      <span className="shrink-0">{t(locale, 'ext.theme')}</span>
      <select
        aria-label={t(locale, 'ext.theme')}
        className="h-10 min-w-0 max-w-full rounded-[6px] border border-[var(--ed-input-line)] bg-[var(--ed-input-bg)] px-2.5 text-sm text-[var(--ed-ink-2)] outline-none transition focus:border-[var(--ed-accent)]"
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
