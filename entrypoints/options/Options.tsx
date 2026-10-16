import { useCallback, useEffect, useRef, useState } from 'react';
import { LanguageSwitcher } from '../../src/components/LanguageSwitcher';
import SettingsForm from '../../src/components/SettingsForm';
import { ThemeSwitcher } from '../../src/components/ThemeSwitcher';
import { t, type Locale } from '../../src/lib/i18n/index';
import {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
  type Settings,
} from '../../src/lib/settings/index';

const WEB_APP_URL = 'https://shrinkit.dusrel.com';
const EXTENSION_VERSION = '1.0.0';
const SAVED_MESSAGE_MS = 2000;

function resolveLocale(settings: Settings): Locale {
  return settings.language ?? 'en';
}

/**
 * Full-page Options / Settings page.
 * Loads settings on mount, saves on every change, shows a localized
 * "saved" confirmation. Appearance is rendered by ThemeSwitcher +
 * LanguageSwitcher (they own their own persistence); Defaults + Behaviour
 * are rendered by the reusable SettingsForm.
 */
export default function Options() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const locale: Locale = resolveLocale(settings);

  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then((stored) => {
        if (!cancelled) {
          setSettings(stored);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSettings(DEFAULT_SETTINGS);
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (savedTimer.current) {
        clearTimeout(savedTimer.current);
      }
    };
  }, []);

  const handleChange = useCallback(
    (patch: Partial<Settings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      saveSettings(next)
        .then(() => {
          setSaveFailed(false);
          setSaved(true);
          if (savedTimer.current) {
            clearTimeout(savedTimer.current);
          }
          savedTimer.current = setTimeout(() => setSaved(false), SAVED_MESSAGE_MS);
        })
        .catch(() => {
          setSaveFailed(true);
        });
    },
    [settings],
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <header className="mb-8 flex items-center gap-3">
          <img
            src="/icons/icon-48.png"
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 shrink-0"
          />
          <div>
            <h1 className="text-2xl font-bold">ShrinkIt</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t(locale, 'options.subtitle')}
            </p>
          </div>
        </header>

        <div aria-live="polite" className="mb-6 min-h-6">
          {saved && (
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              {t(locale, 'options.saved')}
            </p>
          )}
          {saveFailed && (
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              {t(locale, 'options.saveFailed')}
            </p>
          )}
        </div>

        {loaded ? (
          <div className="space-y-8">
            <section
              aria-labelledby="options-appearance-heading"
              className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900"
            >
              <h2 id="options-appearance-heading" className="mb-4 text-lg font-semibold">
                {t(locale, 'options.appearance')}
              </h2>
              <div className="space-y-5">
                <div>
                  <p className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t(locale, 'options.appearance.theme')}
                  </p>
                  <ThemeSwitcher
                    theme={settings.theme}
                    locale={locale}
                    onChange={(theme) => handleChange({ theme })}
                  />
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t(locale, 'options.appearance.language')}
                  </p>
                  <LanguageSwitcher
                    locale={locale}
                    onChange={(language) => handleChange({ language })}
                  />
                </div>
              </div>
            </section>

            <section
              aria-labelledby="options-settings-heading"
              className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900"
            >
              <h2 id="options-settings-heading" className="sr-only">
                {t(locale, 'options.title')}
              </h2>
              <SettingsForm settings={settings} onChange={handleChange} locale={locale} />
            </section>

            <section
              aria-labelledby="options-about-heading"
              className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900"
            >
              <h2 id="options-about-heading" className="mb-4 text-lg font-semibold">
                {t(locale, 'options.about')}
              </h2>
              <dl className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <dt className="font-medium text-slate-700 dark:text-slate-200">
                    {t(locale, 'options.about.version', { version: EXTENSION_VERSION })}
                  </dt>
                  <dd>{EXTENSION_VERSION}</dd>
                </div>
              </dl>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                {t(locale, 'options.about.local')}
              </p>
              <p className="mt-2 text-sm">
                <a
                  href={WEB_APP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-[#007bff] hover:underline"
                >
                  {t(locale, 'options.about.webApp')}
                </a>
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {t(locale, 'options.about.privacy')}
              </p>
            </section>
          </div>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t(locale, 'options.loading')}
          </p>
        )}
      </div>
    </main>
  );
}
