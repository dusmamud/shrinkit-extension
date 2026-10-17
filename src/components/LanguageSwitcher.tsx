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
 * Language picker — web header control style: a compact native <select>
 * (h-10, 6px radius, --ed-* tokens) with a short label. The label wraps
 * and the select is max-w-full, so the control can never overflow or
 * clip at narrow widths; native dropdowns are never clipped by ancestors.
 * Labels come from the message catalogs (ext.language_*, localised per
 * the current locale) — no hardcoded labels.
 */
export function LanguageSwitcher({ locale, onChange }: LanguageSwitcherProps) {
  return (
    <label className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--ed-ink-2)]">
      <span className="shrink-0">{t(locale, 'ext.language')}</span>
      <select
        aria-label={t(locale, 'ext.language')}
        className="h-10 min-w-0 max-w-full rounded-[6px] border border-[var(--ed-input-line)] bg-[var(--ed-input-bg)] px-2.5 text-sm text-[var(--ed-ink-2)] outline-none transition focus:border-[var(--ed-accent)]"
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
