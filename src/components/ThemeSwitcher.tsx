import type { Locale } from '../lib/i18n/index.js';
import { t } from '../lib/i18n/index.js';
import type { Settings } from '../lib/settings/index.js';

export type Theme = Settings['theme'];

export interface ThemeSwitcherProps {
  locale?: Locale;
  theme: Theme;
  onChange: (theme: Theme) => void;
  compact?: boolean;
}

const THEME_OPTIONS: Theme[] = ['light', 'dark', 'system'];

const THEME_LABEL_KEYS: Record<Theme, string> = {
  light: 'ext.theme_light',
  dark: 'ext.theme_dark',
  system: 'ext.theme_system',
};

/**
 * Theme picker (Light / Dark / System) — supports web header style and compact toggle button.
 */
export function ThemeSwitcher({ locale = 'en', theme, onChange, compact = false }: ThemeSwitcherProps) {
  if (compact) {
    const isDark =
      theme === 'dark' ||
      (theme === 'system' &&
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    return (
      <button
        type="button"
        onClick={() => onChange(isDark ? 'light' : 'dark')}
        aria-label={t(locale, 'ext.theme')}
        title={t(locale, isDark ? 'ext.theme_light' : 'ext.theme_dark')}
        className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded border border-[var(--t-border,#cbd5e1)] bg-[var(--t-surface,#ffffff)] text-[var(--t-ink-2,#1d2939)] transition hover:border-[var(--t-accent,#016df0)] hover:text-[var(--t-accent,#016df0)] active:scale-95"
      >
        {isDark ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <label className="flex shrink-0 flex-nowrap items-center gap-x-2 whitespace-nowrap text-sm text-[var(--ed-ink-2)]">
      <span className="shrink-0 whitespace-nowrap">{t(locale, 'ext.theme')}</span>
      <select
        aria-label={t(locale, 'ext.theme')}
        className="h-11 shrink-0 max-w-full whitespace-nowrap rounded-[6px] border border-[var(--ed-input-line)] bg-[var(--ed-input-bg)] px-2.5 text-sm text-[var(--ed-ink-2)] outline-none transition focus:border-[var(--ed-accent)] lg:px-2"
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
