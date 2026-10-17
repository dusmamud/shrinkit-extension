import { t } from '../../lib/i18n/index';
import type { Locale } from '../../lib/i18n/index';

export interface HowItWorksProps {
  locale: Locale;
}

const STEPS = [
  { num: '01', titleKey: 'home.how.step1.title', descKey: 'home.how.step1.desc' },
  { num: '02', titleKey: 'home.how.step2.title', descKey: 'home.how.step2.desc' },
  { num: '03', titleKey: 'home.how.step3.title', descKey: 'home.how.step3.desc' },
] as const;

/**
 * "How it works" 3-step section, mirroring the web app's HowItWorks.
 * Carries id="how-it-works" — the Header "How it works" link targets it.
 */
export default function HowItWorks({ locale }: HowItWorksProps) {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-4 border-t border-tborderfaint bg-tband py-12 sm:py-16"
      aria-labelledby="how-it-works-heading"
    >
      <div className="mx-auto box-border w-full min-w-0 max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="mb-3 inline-flex max-w-full items-center gap-1.5 rounded-full border border-taccent/20 bg-taccent/10 px-3 py-1 text-xs font-semibold text-taccent">
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {t(locale, 'home.how.badge')}
          </div>
          <h2
            id="how-it-works-heading"
            className="text-2xl font-bold tracking-tight text-tink sm:text-3xl md:text-4xl"
          >
            {t(locale, 'home.how.heading')}
          </h2>
          <p className="mt-2 text-sm text-tmuted sm:text-base">
            {t(locale, 'home.how.subheading')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="relative min-w-0 rounded-2xl border border-tborderfaint bg-tsurface p-6 transition duration-200 hover:shadow-md sm:p-7"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-2xl font-extrabold tracking-wider text-taccent/80 sm:text-3xl">
                  {step.num}
                </span>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-taccent/10 text-taccent">
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
              <h3 className="mb-2 text-lg font-bold break-words text-tink">
                {t(locale, step.titleKey)}
              </h3>
              <p className="text-xs leading-relaxed break-words text-tmuted sm:text-sm">
                {t(locale, step.descKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
