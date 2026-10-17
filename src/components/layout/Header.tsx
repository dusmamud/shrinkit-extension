import { useEffect, useRef, useState } from 'react';

import type { Locale } from '../../lib/i18n/index.js';
import { t } from '../../lib/i18n/index.js';
import { LanguageSwitcher } from '../LanguageSwitcher.js';
import { ThemeSwitcher } from '../ThemeSwitcher.js';
import type { Theme } from '../ThemeSwitcher.js';

export interface HeaderProps {
  locale: Locale;
  theme: Theme;
  onLocaleChange: (locale: Locale) => void;
  onThemeChange: (theme: Theme) => void;
  /** Current hash route (e.g. '/', '/tools') — marks the active nav link. */
  currentRoute?: string;
}

/**
 * Resolve the extension icon URL. Inside extension pages this goes through
 * chrome.runtime.getURL; elsewhere it falls back to a relative path.
 * icon-48.png is displayed at 34px (header) / 30px (footer) — downscaled,
 * so it stays crisp. Same pattern as Logo.tsx.
 */
function resolveIconUrl(): string {
  const path = 'icons/icon-48.png';
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      return chrome.runtime.getURL(path);
    }
  } catch {
    // Not running inside an extension context — fall through.
  }
  return `/${path}`;
}

export { resolveIconUrl };

interface NavLink {
  href: string;
  labelKey: string;
}

/** Primary nav, in display order — exactly the web app's 4 links. All navigation is plain hash hrefs. */
const NAV_LINKS: NavLink[] = [
  { href: '#/#how-it-works', labelKey: 'nav.how' },
  { href: '#/tools', labelKey: 'nav.tools' },
  { href: '#/privacy', labelKey: 'nav.privacy' },
  { href: '#/contact', labelKey: 'nav.contact' },
];

/** Map a nav href to the route it represents (anchor links map to '/'). */
function routeForHref(href: string): string {
  if (href === '#/#how-it-works') return '/';
  return href.slice(1) || '/';
}

/**
 * Site header — faithful React port of the web app's Header.astro.
 * Inner bar: max-w 1075px, px-4, py-4, gap-x-4, flex-nowrap — children never wrap.
 * Brand: 34px icon (pinned) +
 * "ShrinkIt" wordmark. Desktop nav (lg+) with 1px dividers between links,
 * Language + Theme switchers, and the "Resize Image" CTA. Below lg the
 * nav collapses to a hamburger that opens a stacked panel.
 */
export default function Header({
  locale,
  theme,
  onLocaleChange,
  onThemeChange,
  currentRoute = '/',
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const closeMenu = () => {
    setMenuOpen(false);
  };

  // Close the mobile panel on hash navigation (covers back/forward too)
  // and on Escape. Plain hash hrefs do the routing; this only closes UI.
  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }
    const onHashChange = () => {
      setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        // Return focus to the hamburger so keyboard users keep their place.
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="border-b border-tdivider/50 bg-tpage">
      <div className="mx-auto flex max-w-[1075px] flex-nowrap items-center justify-between gap-x-4 px-4 py-4">
        <a
          href="#/"
          className="flex shrink-0 items-center gap-2.5 transition-transform hover:scale-[1.02] active:scale-95"
          aria-label={t(locale, 'site.name')}
        >
          <img
            src={resolveIconUrl()}
            alt={t(locale, 'site.name')}
            width={34}
            height={34}
            style={{ width: 34, height: 34, maxWidth: 34, maxHeight: 34 }}
            className="shrink-0 object-contain"
            draggable={false}
          />
          <span className="whitespace-nowrap text-[1.35rem] font-medium tracking-tight text-tink">
            {t(locale, 'site.name')}
          </span>
        </a>

        {/* Desktop nav */}
        <nav
          className="hidden flex-nowrap items-center lg:flex"
          aria-label={t(locale, 'nav.primary')}
        >
          {NAV_LINKS.map((link, index) => {
            const active = routeForHref(link.href) === currentRoute;
            return (
              <span key={link.href} className="flex shrink-0 items-center">
                {index > 0 && (
                  <span
                    className="mx-2.5 h-4 w-px shrink-0 bg-tdivider xl:mx-4"
                    aria-hidden="true"
                  />
                )}
                <a
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={`whitespace-nowrap text-[13px] tracking-[0.8px] transition-colors hover:text-taccent xl:text-[14px] xl:tracking-[1.17px] ${
                    active ? 'font-medium text-taccent' : 'font-normal text-tink'
                  }`}
                >
                  {t(locale, link.labelKey)}
                </a>
              </span>
            );
          })}
          <a
            href="#/"
            className="ml-4 inline-flex h-[38px] shrink-0 items-center whitespace-nowrap rounded-[6px] bg-tbtnb px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#0257bf] hover:shadow active:scale-95 xl:ml-6 xl:h-[42px] xl:px-6 xl:text-[14px]"
          >
            {t(locale, 'nav.resize_image')}
          </a>
          <span className="ml-3 inline-flex shrink-0 items-center gap-2 xl:ml-4">
            <ThemeSwitcher locale={locale} theme={theme} onChange={onThemeChange} />
            <LanguageSwitcher locale={locale} onChange={onLocaleChange} />
          </span>
        </nav>

        {/* Mobile hamburger — switchers live inside the panel only */}
        <div className="shrink-0 lg:hidden">
          <button
            type="button"
            ref={menuButtonRef}
            aria-label={menuOpen ? t(locale, 'nav.close_menu') : t(locale, 'nav.menu')}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => {
              setMenuOpen((open) => !open);
            }}
            className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-tink transition hover:bg-thoverbg active:scale-95"
          >
            {menuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
                <path
                  d="M4 8h18M4 13h18M4 18h18"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile stacked nav panel */}
      {menuOpen && (
        <div id="mobile-menu" className="border-t border-tdivider bg-tpage lg:hidden">
          <nav
            className="mx-auto flex max-w-[1075px] flex-col px-4 py-4"
            aria-label={t(locale, 'nav.mobile')}
          >
            {NAV_LINKS.map((link) => {
              const active = routeForHref(link.href) === currentRoute;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-[44px] items-center whitespace-nowrap rounded-md px-2 text-base tracking-[1.17px] transition-colors hover:bg-thoverbg hover:text-taccent ${
                    active ? 'font-medium text-taccent' : 'font-normal text-tink'
                  }`}
                >
                  {t(locale, link.labelKey)}
                </a>
              );
            })}
            <a
              href="#/"
              onClick={closeMenu}
              className="mt-2 inline-flex h-[48px] items-center justify-center whitespace-nowrap rounded-[6px] bg-tbtnb px-8 text-base font-bold text-white transition-colors hover:bg-[#0257bf]"
            >
              {t(locale, 'nav.resize_image')}
            </a>
            <div className="mt-4 flex w-full flex-col gap-3.5 border-t border-tdivider pt-4">
              <div className="flex w-full flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-tink">{t(locale, 'nav.language')}</span>
                <LanguageSwitcher locale={locale} onChange={onLocaleChange} />
              </div>
              <div className="flex w-full flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-tink">{t(locale, 'theme.label')}</span>
                <ThemeSwitcher locale={locale} theme={theme} onChange={onThemeChange} />
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
