import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { t } from '../../src/lib/i18n/index';
import type { Locale } from '../../src/lib/i18n/index';
import { getSettings, saveSettings, type Theme } from '../../src/lib/settings/index';
import { LanguageSwitcher } from '../../src/components/LanguageSwitcher';
import { ThemeSwitcher } from '../../src/components/ThemeSwitcher';
import MainResizer from '../../src/components/MainResizer';
import TargetSizeTool from '../../src/tools/target-size/TargetSizeTool';
import PassportTool from '../../src/tools/passport/PassportTool';
import SocialTool from '../../src/tools/social/SocialTool';
import CompareTool from '../../src/tools/compare/CompareTool';

export type EditorTab = 'main' | 'target50' | 'target20' | 'passport' | 'social' | 'compare';

const TABS: EditorTab[] = ['main', 'target50', 'target20', 'passport', 'social', 'compare'];

// CANONICAL tool slugs — the background worker aligns ?tool= / right-click
// routing to these exact values. Do not rename without updating it too.
const TOOL_PARAM_TO_TAB: Record<string, EditorTab> = {
  main: 'main',
  target50: 'target50',
  target20: 'target20',
  passport: 'passport',
  social: 'social',
  compare: 'compare',
};

function tabLabel(locale: Locale, tab: EditorTab): string {
  switch (tab) {
    case 'main':
      return t(locale, 'nav.resize');
    case 'target50':
      return t(locale, 'footer.tools_50kb');
    case 'target20':
      return t(locale, 'footer.tools_20kb');
    case 'passport':
      return t(locale, 'footer.tools_passport');
    case 'social':
      return t(locale, 'footer.tools_social');
    case 'compare':
      return t(locale, 'footer.tools_compare');
  }
}

function GearIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

interface RightClickPayload {
  name?: unknown;
  dataUrl?: unknown;
}

/** Fetch a data: URL into a File without leaving the page. */
async function dataUrlToFile(name: string, dataUrl: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type || 'image/png' });
}

// Logo size is enforced THREE ways so it can never explode to the SVG's
// natural 1024px, even if Tailwind fails to load:
//  1. width/height attributes (32) — the browser sizes the <img> before CSS.
//  2. Inline style maxWidth/maxHeight (32) — survives any stylesheet failure.
//  3. .ed-logo in style.css — plain-CSS fallback alongside Tailwind classes.
const LOGO_SIZE = 32;

export default function Editor() {
  const [locale, setLocale] = useState<Locale>('en');
  const [theme, setTheme] = useState<Theme>('system');
  const [activeTab, setActiveTab] = useState<EditorTab>('main');
  const [preloadedFiles, setPreloadedFiles] = useState<File[] | null>(null);
  const [preloadError, setPreloadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const initRef = useRef(false);

  // Initial load: persisted settings + URL params (?tool=…&src=rightclick&key=…).
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    void (async () => {
      let activeLocale: Locale = 'en';
      let activeTheme: Theme = 'system';
      try {
        const loaded = await getSettings();
        activeLocale = loaded.language;
        activeTheme = loaded.theme;
      } catch {
        // getSettings never throws; defaults above stand.
      }
      setLocale(activeLocale);
      setTheme(activeTheme);

      const params = new URLSearchParams(window.location.search);
      const toolParam = params.get('tool');
      if (toolParam && TOOL_PARAM_TO_TAB[toolParam]) {
        setActiveTab(TOOL_PARAM_TO_TAB[toolParam]);
      }

      if (params.get('src') === 'error') {
        const reason = params.get('reason');
        setPreloadError(
          t(activeLocale, reason === 'cors' ? 'ext.right_click_cors' : 'ext.right_click_failed'),
        );
      } else if (params.get('src') === 'rightclick') {
        const key = params.get('key');
        try {
          if (!key || typeof chrome === 'undefined' || !chrome.storage?.session) {
            throw new Error('missing-key');
          }
          const stored = (await chrome.storage.session.get(key)) as Record<string, unknown>;
          const payload = stored[key] as RightClickPayload | undefined;
          const dataUrl = typeof payload?.dataUrl === 'string' ? payload.dataUrl : null;
          // Localised fallback filename (site name) — never a hardcoded word.
          const name =
            typeof payload?.name === 'string' && payload.name.length > 0
              ? payload.name
              : t(activeLocale, 'site.name');
          if (!dataUrl) throw new Error('missing-payload');
          const file = await dataUrlToFile(name, dataUrl);
          setPreloadedFiles([file]);
        } catch {
          setPreloadError(t(activeLocale, 'ext.right_click_failed'));
        }
      }
      setReady(true);
    })();
  }, []);

  // Apply the theme to <html> so style.css tokens flip; follow the OS in system mode.
  useEffect(() => {
    const apply = () => {
      document.documentElement.dataset.theme = resolveTheme(theme);
    };
    apply();
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
    return undefined;
  }, [theme]);

  // Keep the tab title localized.
  useEffect(() => {
    document.title = `${t(locale, 'site.name')} — ${t(locale, 'site.tagline')}`;
  }, [locale]);

  const handleLocaleChange = useCallback((next: Locale) => {
    setLocale(next);
    void saveSettings({ language: next });
  }, []);

  const handleThemeChange = useCallback((next: Theme) => {
    setTheme(next);
    void saveSettings({ theme: next });
  }, []);

  const handleOpenOptions = useCallback(() => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      window.open(chrome.runtime.getURL('options.html'), '_blank', 'noopener');
    }
  }, []);

  const logoSrc =
    typeof chrome !== 'undefined' && chrome.runtime?.getURL
      ? chrome.runtime.getURL('icons/logo.svg')
      : 'icons/logo.svg';

  return (
    <div className="ed-page min-h-screen bg-[var(--ed-surface)] text-[var(--ed-ink)]">
      <header className="ed-header sticky top-0 z-40 bg-[var(--t-page,var(--ed-surface))]">
        <div className="ed-header-inner mx-auto flex w-full max-w-[1075px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4">
          <a
            href="editor.html"
            className="ed-brand flex items-center gap-2.5"
            aria-label={t(locale, 'site.name')}
          >
            <img
              src={logoSrc}
              alt=""
              aria-hidden="true"
              width={LOGO_SIZE}
              height={LOGO_SIZE}
              style={{
                width: LOGO_SIZE,
                height: LOGO_SIZE,
                maxWidth: LOGO_SIZE,
                maxHeight: LOGO_SIZE,
                display: 'block',
                flexShrink: 0,
              }}
              className="ed-logo h-8 w-8"
            />
            <span className="ed-brand-name text-[1.35rem] font-medium tracking-tight text-[var(--t-ink,var(--ed-ink))]">
              {t(locale, 'site.name')}
            </span>
          </a>

          <nav
            aria-label={t(locale, 'nav.tools')}
            className="ed-tabs order-3 flex w-full flex-wrap items-center sm:order-2 sm:w-auto sm:flex-1 sm:justify-center"
          >
            {TABS.map((tab, i) => {
              const selected = activeTab === tab;
              return (
                <Fragment key={tab}>
                  {i > 0 && (
                    <span
                      aria-hidden="true"
                      className="ed-tab-sep mx-2.5 h-4 w-px bg-[var(--t-divider,var(--ed-line))] xl:mx-4"
                    />
                  )}
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveTab(tab)}
                    className={`ed-tab px-1 py-2.5 text-[13px] font-normal tracking-[0.8px] transition xl:text-[14px] xl:tracking-[1.17px] ${
                      selected
                        ? 'ed-tab-active text-[var(--t-accent,var(--ed-accent))]'
                        : 'text-[var(--t-ink,var(--ed-ink))] hover:text-[var(--t-accent,var(--ed-accent))]'
                    }`}
                  >
                    {tabLabel(locale, tab)}
                  </button>
                </Fragment>
              );
            })}
          </nav>

          <div className="ed-header-actions order-2 ml-auto flex items-center gap-1.5 sm:order-3 sm:ml-0 xl:gap-2">
            <LanguageSwitcher locale={locale} onChange={handleLocaleChange} />
            <ThemeSwitcher locale={locale} theme={theme} onChange={handleThemeChange} />
            <button
              type="button"
              onClick={handleOpenOptions}
              title={t(locale, 'ext.open_settings')}
              aria-label={t(locale, 'ext.open_settings')}
              className="ed-settings-btn inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--t-divider,var(--ed-input-line))] px-2.5 py-2 text-sm font-medium text-[var(--t-ink-2,var(--ed-ink-2))] transition hover:border-[var(--t-accent,var(--ed-accent))] hover:text-[var(--t-accent,var(--ed-accent))]"
            >
              <GearIcon size={16} />
              <span className="ed-settings-label hidden md:inline">
                {t(locale, 'ext.open_settings')}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="ed-main py-6 sm:py-8">
        <div className="ed-main-inner mx-auto w-full max-w-[960px] px-4">
          {preloadError && (
            <div
              role="alert"
              className="ed-banner-error mb-6 flex w-full items-start gap-3 rounded-[6px] bg-[var(--ed-error-soft)] px-4 py-3 text-sm text-[var(--ed-error)]"
            >
              <span className="flex-1">{preloadError}</span>
              <button
                type="button"
                onClick={() => setPreloadError(null)}
                aria-label={t(locale, 'errors.dismiss')}
                className="ed-banner-dismiss transition hover:opacity-70"
              >
                <CloseIcon size={16} />
              </button>
            </div>
          )}

          {preloadedFiles && preloadedFiles.length > 0 && activeTab !== 'main' && (
            <div className="ed-banner-info mb-6 flex w-full flex-wrap items-center gap-3 rounded-[6px] border border-[var(--ed-pill-line)] bg-[var(--ed-pill-bg)] px-4 py-3 text-sm text-[var(--ed-pill-text)]">
              <span className="flex-1">
                {t(locale, 'ext.right_click_title')} — {preloadedFiles[0]?.name}
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('main')}
                className="ed-banner-btn rounded-[6px] bg-[var(--ed-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--ed-accent-hover)]"
              >
                {/* No dedicated go-to-main key exists in the message catalogs;
                    nav.resize is the localised label for the Main tool. */}
                {t(locale, 'nav.resize')}
              </button>
            </div>
          )}

          {/* Never a blank page: while settings/params load, show a
              localised loading state instead of an empty main area. */}
          {!ready && (
            <div className="ed-loading" role="status" aria-live="polite">
              {t(locale, 'ext.processing')}
            </div>
          )}

          {ready && activeTab === 'main' && (
            <MainResizer
              locale={locale}
              initialFiles={preloadedFiles}
              onInitialFilesConsumed={() => setPreloadedFiles(null)}
            />
          )}

          {ready && activeTab === 'target50' && <TargetSizeTool targetKb={50} locale={locale} />}
          {ready && activeTab === 'target20' && <TargetSizeTool targetKb={20} locale={locale} />}
          {ready && activeTab === 'passport' && <PassportTool locale={locale} />}
          {ready && activeTab === 'social' && <SocialTool locale={locale} />}
          {ready && activeTab === 'compare' && <CompareTool locale={locale} />}
        </div>
      </main>
    </div>
  );
}
