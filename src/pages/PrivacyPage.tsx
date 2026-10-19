/**
 * Privacy Policy page: minimal link card pointing to the authoritative live policy on shrinkit.dusrel.com.
 */
import { t, type Locale } from '../lib/i18n/index';

export interface PrivacyPageProps {
  locale: Locale;
}

const FULL_TEXT_URL = 'https://shrinkit.dusrel.com/privacy';

export function PrivacyPage({ locale }: PrivacyPageProps) {
  return (
    <div className="w-full bg-tband py-12 sm:py-16">
      <div className="mx-auto box-border w-full min-w-0 max-w-2xl px-4 text-center">
        <div className="rounded-2xl border border-tdivider bg-tsurface p-8 shadow-sm sm:p-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-taccent/10 text-taccent">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-tink sm:text-3xl">
            {t(locale, 'footer.privacy_policy')}
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-tmuted sm:text-base">
            ShrinkIt is private by design. All resizing and compression happens 100% locally on your own device using WebAssembly and Canvas. Your images are never uploaded, saved, or sent to any server.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={FULL_TEXT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-taccent px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 sm:w-auto"
            >
              <span>Read Policy on shrinkit.dusrel.com</span>
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

export default PrivacyPage;
