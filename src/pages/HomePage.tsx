import { useEffect, useState } from 'react';
import { t } from '../lib/i18n/index';
import type { Locale } from '../lib/i18n/index';
import MainResizer from '../components/MainResizer';
import Hero from '../components/home/Hero';
import HowItWorks from '../components/home/HowItWorks';
import ToolsGrid from '../components/home/ToolsGrid';
import ZeroUploadGuarantee from '../components/home/ZeroUploadGuarantee';
import ComparisonTable from '../components/home/ComparisonTable';
import FaqSection from '../components/home/FaqSection';
import HomeCta from '../components/home/HomeCta';

export interface HomePageProps {
  locale: Locale;
  /** Files preloaded by the Editor (e.g. from a right-clicked image). */
  initialFiles?: File[] | null;
  onInitialFilesConsumed?: () => void;
  /** Right-click preload failure message from the Editor, if any. */
  preloadError?: string | null;
}

/**
 * Home page, mirroring the web app's home order:
 * Hero + main resizer + HowItWorks + ToolsGrid + ZeroUploadGuarantee + ComparisonTable + FaqSection + HomeCta.
 * Header/Footer are rendered by the Editor shell, not here.
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

      <HowItWorks locale={locale} />
      <ToolsGrid locale={locale} />
      <ZeroUploadGuarantee locale={locale} />
      <ComparisonTable locale={locale} />
      <FaqSection locale={locale} />
      <HomeCta locale={locale} />
    </div>
  );
}
