import { useEffect, useState } from 'react';
import { t } from '../lib/i18n/index';
import type { Locale } from '../lib/i18n/index';
import MainResizer from '../components/MainResizer';
import Hero from '../components/home/Hero';

export interface HomePageProps {
  locale: Locale;
  /** Files preloaded by the Editor (e.g. from a right-clicked image). */
  initialFiles?: File[] | null;
  onInitialFilesConsumed?: () => void;
  /** Right-click preload failure message from the Editor, if any. */
  preloadError?: string | null;
}

/**
 * Minimal Home page:
 * Clean Hero + Main Resizer tool. Marketing fluff removed for maximum speed and focus.
 * Header/Footer are rendered by the Editor shell.
 */
export default function HomePage({
  locale,
  initialFiles,
  onInitialFilesConsumed,
  preloadError,
}: HomePageProps) {
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    setBannerDismissed(false);
  }, [preloadError]);

  return (
    <div className="w-full min-w-0">
      <Hero locale={locale} />

      <section
        id="tool"
        className="scroll-mt-4 bg-tpage pb-10 sm:pb-14"
        aria-label={t(locale, 'nav.resize')}
      >
        {preloadError && !bannerDismissed && (
          <div
            role="alert"
            className="mx-auto mb-6 flex w-full max-w-[960px] min-w-0 items-start gap-3 rounded-[6px] bg-terrorsoft px-4 py-3 text-sm break-words text-terrorsofttext"
          >
            <span className="min-w-0 flex-1">{preloadError}</span>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              aria-label={t(locale, 'errors.dismiss')}
              className="shrink-0 transition hover:opacity-70"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M6 6l12 12M18 6 6 18"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        )}
        <MainResizer
          locale={locale}
          initialFiles={initialFiles}
          onInitialFilesConsumed={onInitialFilesConsumed}
        />
      </section>

      {/* Minimal How It Works anchor link to live web app */}
      <section
        id="how-it-works"
        className="mx-auto max-w-[960px] px-4 pb-12 pt-2 text-center"
      >
        <div className="rounded-xl border border-tdivider bg-tsurface px-6 py-5 shadow-xs sm:flex sm:items-center sm:justify-between sm:text-left">
          <div>
            <p className="text-sm font-semibold text-tink">
              {t(locale, 'tools.how_title')}
            </p>
            <p className="text-xs text-tmuted mt-0.5">
              100% in-browser Web Workers &amp; Canvas. No uploads or server processing.
            </p>
          </div>
          <a
            href="https://shrinkit.dusrel.com/#how-it-works"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-taccent/30 bg-taccent/10 px-3.5 py-1.5 text-xs font-medium text-taccent hover:bg-taccent/20 transition sm:mt-0"
          >
            <span>Learn how on shrinkit.dusrel.com</span>
            <span>↗</span>
          </a>
        </div>
      </section>
    </div>
  );
}
