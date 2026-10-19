/**
 * Editor — app shell for the multi-page editor (`editor.html`).
 *
 * Hash routing: the route comes from `window.location.hash`
 * (`editor.html#/tools`), the handoff parameters from
 * `window.location.search` (`editor.html?src=rightclick&key=…#/` — query
 * BEFORE hash; anything after the first `#` is fragment, never query).
 * The shell renders the shared Header + current page + Footer. Only the
 * main content area changes between routes.
 *
 * - `src`/`key`/`reason` are read ONCE on the initial load. Navigating
 *   to another hash route afterwards does not re-read them.
 * - Right-click (`?src=rightclick&key=…`) and error (`?src=error&reason=…`)
 *   landings are Home (`#/`). The preloaded image / error message are
 *   passed to HomePage, which owns their display; the shell never
 *   renders a second banner.
 * - Legacy `?tool=` (previous single-page editor) maps to its hash route
 *   only when the URL carries no hash at all. New code never generates
 *   `?tool=` links.
 * - Theme follows settings (`system` tracks the OS); locale/theme are
 *   persisted via the settings store. Document title is localised per
 *   route. While settings load, a localised loading state is shown —
 *   never a blank page.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { t } from '../../src/lib/i18n/index';
import type { Locale } from '../../src/lib/i18n/index';
import { getSettings, saveSettings, type Theme } from '../../src/lib/settings/index';
import { buildHash, parseHash } from '../../src/router/hash';
import { legacyToolToRoute, ROUTE_TITLE_KEY, type Route } from '../../src/router/routes';
import Header from '../../src/components/layout/Header';
import Footer from '../../src/components/layout/Footer';
import HomePage from '../../src/pages/HomePage';
import ToolsHubPage from '../../src/pages/ToolsHubPage';
import Compress50Page from '../../src/pages/tools/Compress50Page';
import Compress20Page from '../../src/pages/tools/Compress20Page';
import PassportPage from '../../src/pages/tools/PassportPage';
import SocialPage from '../../src/pages/tools/SocialPage';
import ComparePage from '../../src/pages/tools/ComparePage';
import AboutPage from '../../src/pages/AboutPage';
import ContactPage from '../../src/pages/ContactPage';
import PrivacyPage from '../../src/pages/PrivacyPage';
import TermsPage from '../../src/pages/TermsPage';
import NotFoundPage from '../../src/pages/NotFoundPage';
import ResizePage from '../../src/pages/ResizePage';

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

export default function Editor() {
  const [locale, setLocale] = useState<Locale>('en');
  const [theme, setTheme] = useState<Theme>('system');
  const [route, setRoute] = useState<Route>('/');
  const [anchor, setAnchor] = useState<string | null>(null);
  const [preloadedFiles, setPreloadedFiles] = useState<File[] | null>(null);
  const [preloadError, setPreloadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const initRef = useRef(false);

  // Initial load: persisted settings + URL params (?src=…&key=…&tool=…).
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

      // Route: the hash wins. A legacy ?tool= applies only when the URL
      // carries no hash at all; the URL is then canonicalised to the
      // hash form so a refresh or bookmark keeps the route.
      const params = new URLSearchParams(window.location.search);
      const parsed = parseHash(window.location.hash);
      let initialRoute = parsed.route;
      let initialAnchor: string | null = parsed.params.anchor ?? null;
      if (!window.location.hash) {
        const legacy = legacyToolToRoute(params.get('tool'));
        if (legacy) {
          initialRoute = legacy;
          initialAnchor = null;
          window.history.replaceState(
            null,
            '',
            `${window.location.pathname}${window.location.search}${buildHash(legacy)}`,
          );
        }
      }
      setRoute(initialRoute);
      setAnchor(initialAnchor);

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
          // One-shot handoff: the key is consumed once, then cleared so a
          // reload cannot resurrect a stale image. Best-effort — the
          // file is already in memory if the removal fails.
          try {
            await chrome.storage.session.remove(key);
          } catch {
            // Removal failing must not lose the preloaded image.
          }
        } catch {
          setPreloadError(t(activeLocale, 'ext.right_click_failed'));
        }
      }
      setReady(true);
    })();
  }, []);

  // Follow hash navigation (links, back/forward). Query params are NOT
  // re-read here — the handoff is initial-load only.
  useEffect(() => {
    const onHashChange = () => {
      const parsed = parseHash(window.location.hash);
      setRoute(parsed.route);
      setAnchor(parsed.params.anchor ?? null);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Scroll on navigation: to the anchor element when the hash carries
  // one (`#/#how-it-works`), otherwise back to the top so a deep page
  // never leaves the next page mid-scroll.
  useEffect(() => {
    if (!ready) return undefined;
    if (!anchor) {
      window.scrollTo({ top: 0 });
      return undefined;
    }
    const id = anchor;
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [ready, route, anchor]);

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

  // Keep the tab title localised per route.
  useEffect(() => {
    document.title = `${t(locale, 'site.name')} — ${t(locale, ROUTE_TITLE_KEY[route])}`;
  }, [locale, route]);

  const handleLocaleChange = useCallback((next: Locale) => {
    setLocale(next);
    void saveSettings({ language: next });
  }, []);

  const handleThemeChange = useCallback((next: Theme) => {
    setTheme(next);
    void saveSettings({ theme: next });
  }, []);

  return (
    <div className="ed-page min-h-screen bg-[var(--ed-surface)] text-[var(--ed-ink)]">
      {/* Skip link: keyboard users jump straight past the header/nav. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-taccent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        {t(locale, 'nav.skip_to_content')}
      </a>
      <Header
        locale={locale}
        theme={theme}
        onLocaleChange={handleLocaleChange}
        onThemeChange={handleThemeChange}
        currentRoute={route}
      />

      <main id="main-content" className="ed-main flex-1 w-full min-w-0">
        {!ready && (
          <div className="ed-main-inner mx-auto w-full max-w-[960px] px-4 py-8">
            <div className="ed-loading" role="status" aria-live="polite">
              {t(locale, 'ext.processing')}
            </div>
          </div>
        )}

        {ready && route === '/' && (
          <HomePage
            locale={locale}
            initialFiles={preloadedFiles}
            onInitialFilesConsumed={() => setPreloadedFiles(null)}
            preloadError={preloadError}
          />
        )}
        {ready && route === '/tools' && <ToolsHubPage locale={locale} />}
        {ready && route === '/tools/compress-to-50kb' && <Compress50Page locale={locale} />}
        {ready && route === '/tools/compress-to-20kb' && <Compress20Page locale={locale} />}
        {ready && route === '/tools/passport-photo-maker' && <PassportPage locale={locale} />}
        {ready && route === '/tools/social-media-resizer' && <SocialPage locale={locale} />}
        {ready && route === '/tools/compare-images' && <ComparePage locale={locale} />}
        {ready && route === '/about' && <AboutPage locale={locale} />}
        {ready && route === '/contact' && <ContactPage locale={locale} />}
        {ready && route === '/privacy' && <PrivacyPage locale={locale} />}
        {ready && route === '/terms' && <TermsPage locale={locale} />}
        {ready && route === '/resize' && (
          <div className="ed-main-inner mx-auto w-full max-w-[960px] px-4 py-6 sm:py-8">
            <ResizePage locale={locale} />
          </div>
        )}
        {ready && route === '*' && <NotFoundPage locale={locale} />}
      </main>

      {/* /resize mirrors the web page: copyright bar only, no footer links. */}
      <Footer locale={locale} variant={route === '/resize' ? 'minimal' : 'full'} />
    </div>
  );
}
