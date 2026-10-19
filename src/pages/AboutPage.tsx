/**
 * About page: minimal link card pointing to shrinkit.dusrel.com/about.
 */
import { t, type Locale } from '../lib/i18n/index';

export interface AboutPageProps {
  locale: Locale;
}

const FULL_TEXT_URL = 'https://shrinkit.dusrel.com/about';

export function AboutPage({ locale }: AboutPageProps) {
  return (
    <div className="w-full bg-tband py-12 sm:py-16">
      <div className="mx-auto box-border w-full min-w-0 max-w-2xl px-4 text-center">
        <div className="rounded-2xl border border-tdivider bg-tsurface p-8 shadow-sm sm:p-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-taccent/10 text-taccent">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-tink sm:text-3xl">
            {t(locale, 'about.title')}
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-tmuted sm:text-base">
            ShrinkIt is a free, private-by-design image resizer and compressor that runs entirely in
            your browser. No sign-up, no server uploads, and no watermarks.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={FULL_TEXT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-taccent px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 sm:w-auto"
            >
              <span>Read About ShrinkIt on shrinkit.dusrel.com</span>
              <span>&nearr;</span>
            </a>
            <a
              href="#/"
              className="inline-flex w-full items-center justify-center rounded-xl border border-tdivider bg-tsurface px-5 py-3 text-sm font-medium text-tink transition hover:bg-tband sm:w-auto"
            >
              &larr; Back to Resizer
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;
