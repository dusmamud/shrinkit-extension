import type { Locale } from '../lib/i18n/index.js';
import { t } from '../lib/i18n/index.js';

export interface LanguageSwitcherProps {
  locale: Locale;
  onChange: (locale: Locale) => void;
  compact?: boolean;
}

const LANGUAGE_OPTIONS: Locale[] = ['en', 'es', 'pt'];

const LANGUAGE_LABEL_KEYS: Record<Locale, string> = {
  en: 'ext.language_en',
  es: 'ext.language_es',
  pt: 'ext.language_pt',
};

const COMPACT_LABELS: Record<Locale, string> = {
  en: 'EN',
  es: 'ES',
  pt: 'PT',
};

/**
 * Language picker — supports standard web header style and compact popup mode.
 */
export function LanguageSwitcher({ locale, onChange, compact = false }: LanguageSwitcherProps) {
  if (compact) {
    return (
      <select
        aria-label={t(locale, 'ext.language')}
        className="h-7 shrink-0 cursor-pointer rounded border border-[var(--t-border,#cbd5e1)] bg-[var(--t-surface,#ffffff)] px-2 text-xs font-medium text-[var(--t-ink-2,#1d2939)] outline-none transition hover:border-[var(--t-accent,#016df0)] focus:border-[var(--t-accent,#016df0)]"
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
            {COMPACT_LABELS[option]}
          </option>
        ))}
      </select>
    );
  }

  return (
    <label className="flex shrink-0 flex-nowrap items-center gap-x-2 whitespace-nowrap text-sm text-[var(--ed-ink-2)]">
      <span className="shrink-0 whitespace-nowrap">{t(locale, 'ext.language')}</span>
      <select
        aria-label={t(locale, 'ext.language')}
        className="h-11 shrink-0 max-w-full whitespace-nowrap rounded-[6px] border border-[var(--ed-input-line)] bg-[var(--ed-input-bg)] px-2.5 text-sm text-[var(--ed-ink-2)] outline-none transition focus:border-[var(--ed-accent)] lg:px-2"
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
