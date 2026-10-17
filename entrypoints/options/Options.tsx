import { useCallback, useEffect, useRef, useState } from 'react';
import { LanguageSwitcher } from '../../src/components/LanguageSwitcher';
import Logo from '../../src/components/Logo';
import { ThemeSwitcher } from '../../src/components/ThemeSwitcher';
import { t, type Locale } from '../../src/lib/i18n/index';
import {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
  type Settings,
  type Theme,
  type Unit,
} from '../../src/lib/settings/index';

const WEB_APP_URL = 'https://shrinkit.dusrel.com';
const EXTENSION_VERSION = '1.0.0';
const SAVED_MESSAGE_MS = 2000;

const UNITS: Unit[] = ['percent', 'pixels', 'cm', 'inches'];
const FORMATS: Settings['lastFormat'][] = ['jpeg', 'png', 'webp', 'gif'];
const DPI_OPTIONS: number[] = [72, 150, 300];
const PRESETS: Settings['defaultPreset'][] = ['50%', '800px', '20KB', 'last-used'];

function resolveLocale(settings: Settings): Locale {
  return settings.language ?? 'en';
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Full-page Options / Settings page, in the web app's design language:
 * 960px page, 650px centered settings form, --ed-* tokens carrying the
 * web --t-* values (see style.css), SettingsPanel input/button values
 * (inputs h-[50px] rounded-[6px], labels 0.875rem → 1.125rem, primary
 * button px-12 py-3.5 bold, hover --ed-accent-hover).
 * Loads settings on mount, saves on every change, shows a localized
 * "saved" confirmation. The form is inlined here (not SettingsForm) so
 * it can carry the Defaults size fields (last width / height / unit)
 * and the web input styles; SettingsForm stays the popup's form.
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

  // Apply the theme to <html> so style.css tokens flip; follow the OS in
  // system mode. Same pattern as the Editor.
  useEffect(() => {
    const apply = () => {
      document.documentElement.dataset.theme = resolveTheme(settings.theme);
    };
    apply();
    if (settings.theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
    return undefined;
  }, [settings.theme]);

  // Keep the tab title localized.
  useEffect(() => {
    document.title = `${t(locale, 'site.name')} — ${t(locale, 'options.title')}`;
  }, [locale]);

  /**
   * Open an Editor hash route (Home `#/` or Tools `#/tools`) in a new tab.
   * Same pattern as the Popup's openEditor: chrome.tabs.create with a
   * window.open fallback so the link still works outside the extension
   * context. Never throws.
   */
  const openEditorPage = useCallback(async (hash: string): Promise<void> => {
    const fallbackUrl = `editor.html${hash}`;
    try {
      const url = `${chrome.runtime.getURL('editor.html')}${hash}`;
      await chrome.tabs.create({ url });
    } catch {
      window.open(fallbackUrl, '_blank', 'noopener');
    }
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

  const fieldLabelClass =
    'opt-label block text-[0.875rem] font-medium text-[var(--ed-ink)] sm:text-[1.125rem]';
  const selectClass =
    'opt-select w-full rounded-[6px] border border-[var(--ed-input-line)] bg-[var(--ed-input-bg)] px-2.5 text-[1rem] text-[var(--ed-ink-2)] outline-none transition focus:border-[var(--ed-accent)]';
  const radioRowClass =
    'opt-check-row flex min-w-0 items-center gap-2 text-sm text-[var(--ed-ink-2)]';

  return (
    <div className="opt-page min-h-screen bg-[var(--ed-surface)] text-[var(--ed-ink-2)]">
      <header className="opt-header sticky top-0 z-40 border-b border-[var(--ed-line)] bg-[var(--ed-surface)]/95 backdrop-blur">
        <div className="opt-header-inner mx-auto flex w-full max-w-[960px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
          <Logo size={32} showWordmark={false} />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold tracking-tight text-[var(--ed-ink)]">ShrinkIt</h1>
            <p className="text-sm text-[var(--ed-muted)]">{t(locale, 'options.subtitle')}</p>
          </div>
          <nav
            className="opt-nav flex flex-wrap items-center gap-2"
            aria-label={t(locale, 'options.title')}
          >
            <button
              type="button"
              onClick={() => void openEditorPage('#/')}
              className="opt-nav-link rounded-[6px] px-3 py-2 text-sm font-medium text-[var(--ed-accent)] transition hover:bg-[var(--ed-pill-bg)]"
            >
              {t(locale, 'options.backHome')}
            </button>
            <button
              type="button"
              onClick={() => void openEditorPage('#/tools')}
              className="opt-nav-btn rounded-[6px] border border-[var(--ed-input-line)] bg-[var(--ed-surface)] px-4 py-2 text-sm font-medium text-[var(--ed-ink)] transition hover:border-[var(--ed-accent)] hover:text-[var(--ed-accent)]"
            >
              {t(locale, 'options.openTools')}
            </button>
          </nav>
        </div>
      </header>

      <main className="opt-main mx-auto w-full max-w-[960px] px-4">
        <div className="opt-col mx-auto w-full max-w-[650px] py-6 sm:py-8">
          <div aria-live="polite" className="mb-6 min-h-6">
            {saved && (
              <p className="text-sm font-medium text-[var(--ed-success)]">
                {t(locale, 'options.saved')}
              </p>
            )}
            {saveFailed && (
              <p className="text-sm font-medium text-[var(--ed-error)]">
                {t(locale, 'options.saveFailed')}
              </p>
            )}
          </div>

          {loaded ? (
            <form
              className="space-y-6"
              onSubmit={(event) => event.preventDefault()}
              aria-label={t(locale, 'options.title')}
            >
              <section
                aria-labelledby="options-appearance-heading"
                className="opt-card rounded-2xl border border-[var(--ed-line)] bg-[var(--ed-surface)] p-5"
              >
                <h2
                  id="options-appearance-heading"
                  className="opt-card-title mb-4 text-lg font-semibold text-[var(--ed-ink)]"
                >
                  {t(locale, 'options.appearance')}
                </h2>
                <div className="opt-appearance-row flex flex-wrap gap-x-6 gap-y-3">
                  <div className="min-w-0">
                    <p className="mb-1.5 text-sm font-medium text-[var(--ed-ink-2)]">
                      {t(locale, 'options.appearance.theme')}
                    </p>
                    <ThemeSwitcher
                      theme={settings.theme}
                      locale={locale}
                      onChange={(theme) => handleChange({ theme })}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="mb-1.5 text-sm font-medium text-[var(--ed-ink-2)]">
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
                aria-labelledby="options-defaults-heading"
                className="opt-card rounded-2xl border border-[var(--ed-line)] bg-[var(--ed-surface)] p-5"
              >
                <h2
                  id="options-defaults-heading"
                  className="opt-card-title mb-4 text-lg font-semibold text-[var(--ed-ink)]"
                >
                  {t(locale, 'options.defaults')}
                </h2>
                <div className="space-y-5">
                  {/* Last size: Width / Height / Unit, SettingsPanel-style. */}
                  <div className="flex items-center justify-center">
                    <div className="flex flex-col gap-4 pr-2.5 text-right sm:pr-4">
                      <div className="flex h-[50px] items-center justify-end">
                        <label
                          htmlFor="options-last-width"
                          className={`${fieldLabelClass} whitespace-nowrap`}
                        >
                          {t(locale, 'settings.width')}
                        </label>
                      </div>
                      <div className="flex h-[50px] items-center justify-end">
                        <label
                          htmlFor="options-last-height"
                          className={`${fieldLabelClass} whitespace-nowrap`}
                        >
                          {t(locale, 'settings.height')}
                        </label>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      <input
                        id="options-last-width"
                        type="number"
                        value={settings.lastWidth}
                        onChange={(event) => handleChange({ lastWidth: event.target.value })}
                        className="opt-num h-[50px] w-[68px] rounded-[6px] border border-[var(--ed-input-line)] bg-[var(--ed-input-bg)] text-center text-[1.15em] font-light text-[var(--ed-ink-2)] outline-none transition focus:border-[var(--ed-accent)] sm:w-[72px] sm:text-[1.25em]"
                      />
                      <input
                        id="options-last-height"
                        type="number"
                        value={settings.lastHeight}
                        onChange={(event) => handleChange({ lastHeight: event.target.value })}
                        className="opt-num h-[50px] w-[68px] rounded-[6px] border border-[var(--ed-input-line)] bg-[var(--ed-input-bg)] text-center text-[1.15em] font-light text-[var(--ed-ink-2)] outline-none transition focus:border-[var(--ed-accent)] sm:w-[72px] sm:text-[1.25em]"
                      />
                    </div>
                    <div className="pl-2.5 sm:pl-4">
                      <select
                        id="options-last-unit"
                        aria-label={t(locale, 'settings.unit')}
                        value={settings.lastUnit}
                        onChange={(event) =>
                          handleChange({ lastUnit: event.target.value as Settings['lastUnit'] })
                        }
                        className="opt-unit-select h-[50px] w-[125px] rounded-[6px] border border-[var(--ed-input-line)] bg-[var(--ed-input-bg)] px-2.5 text-center text-[1rem] capitalize text-[var(--ed-ink-2)] outline-none transition focus:border-[var(--ed-accent)] sm:w-[155px]"
                      >
                        {UNITS.map((unit) => (
                          <option key={unit} value={unit}>
                            {t(locale, `settings.units.${unit}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="options-default-format" className={fieldLabelClass}>
                      {t(locale, 'options.defaults.format')}
                    </label>
                    <select
                      id="options-default-format"
                      value={settings.lastFormat}
                      onChange={(event) =>
                        handleChange({ lastFormat: event.target.value as Settings['lastFormat'] })
                      }
                      className={`${selectClass} mt-1.5`}
                    >
                      {FORMATS.map((format) => (
                        <option key={format} value={format}>
                          {t(locale, `options.defaults.format.${format}`)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="options-default-quality" className={fieldLabelClass}>
                      {t(locale, 'options.defaults.quality')}
                    </label>
                    <div className="mt-1.5 flex min-w-0 items-center gap-3">
                      <input
                        id="options-default-quality"
                        type="range"
                        min={1}
                        max={100}
                        step={1}
                        value={Number(settings.lastQuality)}
                        onChange={(event) =>
                          handleChange({ lastQuality: String(event.target.value) })
                        }
                        className="min-w-0 flex-1"
                      />
                      <output
                        htmlFor="options-default-quality"
                        className="w-12 shrink-0 text-right text-sm font-medium text-[var(--ed-ink)] tabular-nums"
                      >
                        {settings.lastQuality}
                      </output>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="options-default-dpi" className={fieldLabelClass}>
                      {t(locale, 'options.defaults.dpi')}
                    </label>
                    <select
                      id="options-default-dpi"
                      value={Number(settings.lastDpi)}
                      onChange={(event) => handleChange({ lastDpi: String(event.target.value) })}
                      className={`${selectClass} mt-1.5`}
                    >
                      {DPI_OPTIONS.map((dpi) => (
                        <option key={dpi} value={dpi}>
                          {dpi}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="options-default-preset" className={fieldLabelClass}>
                      {t(locale, 'options.defaults.preset')}
                    </label>
                    <select
                      id="options-default-preset"
                      value={settings.defaultPreset}
                      onChange={(event) =>
                        handleChange({
                          defaultPreset: event.target.value as Settings['defaultPreset'],
                        })
                      }
                      className={`${selectClass} mt-1.5`}
                    >
                      {PRESETS.map((preset) => (
                        <option key={preset} value={preset}>
                          {t(locale, `options.defaults.preset.${preset}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <section
                aria-labelledby="options-behaviour-heading"
                className="opt-card rounded-2xl border border-[var(--ed-line)] bg-[var(--ed-surface)] p-5"
              >
                <h2
                  id="options-behaviour-heading"
                  className="opt-card-title mb-4 text-lg font-semibold text-[var(--ed-ink)]"
                >
                  {t(locale, 'options.behaviour')}
                </h2>
                <div className="space-y-5">
                  <fieldset className="min-w-0">
                    <legend className={fieldLabelClass}>
                      {t(locale, 'options.behaviour.downloadMode')}
                    </legend>
                    <div className="mt-2 space-y-2">
                      <label className={radioRowClass}>
                        <input
                          type="radio"
                          name="options-download-mode"
                          value="auto"
                          checked={settings.downloadMode === 'auto'}
                          onChange={() => handleChange({ downloadMode: 'auto' })}
                        />
                        {t(locale, 'options.behaviour.downloadMode.auto')}
                      </label>
                      <label className={radioRowClass}>
                        <input
                          type="radio"
                          name="options-download-mode"
                          value="ask"
                          checked={settings.downloadMode === 'ask'}
                          onChange={() => handleChange({ downloadMode: 'ask' })}
                        />
                        {t(locale, 'options.behaviour.downloadMode.ask')}
                      </label>
                    </div>
                  </fieldset>

                  <div>
                    <label className={radioRowClass}>
                      <input
                        type="checkbox"
                        checked={settings.preserveExif}
                        onChange={(event) => handleChange({ preserveExif: event.target.checked })}
                      />
                      {t(locale, 'options.behaviour.preserveExif')}
                    </label>
                    <p className="mt-1 text-xs text-[var(--ed-muted)]">
                      {t(locale, 'settings.preserve_exif_hint')}
                    </p>
                  </div>

                  <fieldset className="min-w-0">
                    <legend className={fieldLabelClass}>
                      {t(locale, 'options.behaviour.background')}
                    </legend>
                    <div className="mt-2 space-y-2">
                      <label className={radioRowClass}>
                        <input
                          type="radio"
                          name="options-background"
                          value="white"
                          checked={settings.background === 'white'}
                          onChange={() => handleChange({ background: 'white' })}
                        />
                        <span
                          aria-hidden="true"
                          className={`opt-swatch opt-swatch-white h-[35px] w-[35px] rounded-full ${
                            settings.background === 'white' ? 'opt-swatch-selected' : ''
                          }`}
                        />
                        {t(locale, 'options.behaviour.background.white')}
                      </label>
                      <label className={radioRowClass}>
                        <input
                          type="radio"
                          name="options-background"
                          value="black"
                          checked={settings.background === 'black'}
                          onChange={() => handleChange({ background: 'black' })}
                        />
                        <span
                          aria-hidden="true"
                          className={`opt-swatch opt-swatch-black h-[35px] w-[35px] rounded-full ${
                            settings.background === 'black' ? 'opt-swatch-selected' : ''
                          }`}
                        />
                        {t(locale, 'options.behaviour.background.black')}
                      </label>
                    </div>
                  </fieldset>
                </div>
              </section>

              <section
                aria-labelledby="options-about-heading"
                className="opt-card rounded-2xl border border-[var(--ed-line)] bg-[var(--ed-surface)] p-5"
              >
                <h2
                  id="options-about-heading"
                  className="opt-card-title mb-4 text-lg font-semibold text-[var(--ed-ink)]"
                >
                  {t(locale, 'options.about')}
                </h2>
                <p className="text-sm text-[var(--ed-ink-2)]">
                  {t(locale, 'options.about.version', { version: EXTENSION_VERSION })}
                </p>
                <p className="mt-3 text-sm text-[var(--ed-muted)]">
                  {t(locale, 'options.about.local')}
                </p>
                <p className="mt-2 text-sm text-[var(--ed-muted)]">
                  {t(locale, 'options.about.privacy')}
                </p>
                <p className="mt-4">
                  <a
                    href={WEB_APP_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="opt-btn-primary block w-full rounded-[6px] bg-[var(--ed-accent)] px-12 py-3.5 text-center text-[1.125rem] font-bold text-white transition hover:bg-[var(--ed-accent-hover)] sm:w-auto sm:min-w-0"
                  >
                    {t(locale, 'options.about.webApp')}
                  </a>
                </p>
              </section>
            </form>
          ) : (
            <p className="text-sm text-[var(--ed-muted)]">{t(locale, 'options.loading')}</p>
          )}
        </div>
      </main>

      <footer className="opt-footer border-t border-[var(--ed-line)]">
        <p className="mx-auto w-full max-w-[960px] px-4 py-4 text-center text-sm text-[var(--ed-muted)]">
          {t(locale, 'footer.rights', { year: new Date().getFullYear() })}
        </p>
      </footer>
    </div>
  );
}
