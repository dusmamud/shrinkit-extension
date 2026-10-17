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
 * (h-11 = 44px touch target, 6px radius, --ed-* tokens) with a short
 * label. The wrapper, label, and select are all whitespace-nowrap +
 * shrink-0, so the control never wraps mid-word or squeezes inside the
 * header; horizontal padding tightens slightly at lg (px-2.5 → lg:px-2)
 * to fit the header squeeze budget. Labels come from the message
 * catalogs (ext.language_*, localised per the current locale) — no
 * hardcoded labels.
 */
export function LanguageSwitcher({ locale, onChange }: LanguageSwitcherProps) {
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
