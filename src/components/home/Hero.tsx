import { t } from '../../lib/i18n/index';
import type { Locale } from '../../lib/i18n/index';

export interface HeroProps {
  locale: Locale;
}

/**
 * Home hero, mirroring the web app's HeroSection: centered heading plus
 * tagline. Heading scales 32px -> 40px -> 50px across breakpoints.
 */
export default function Hero({ locale }: HeroProps) {
  return (
    <section className="bg-tpage pt-6 pb-4 sm:pt-8 sm:pb-6 md:pt-10">
      <div className="mx-auto box-border w-full min-w-0 max-w-3xl px-4 text-center">
        <h1 className="text-[32px] leading-tight font-bold tracking-tight text-tink sm:text-[40px] md:text-[50px]">
          {t(locale, 'hero.title')}
        </h1>
        <p className="mt-2 text-xs leading-relaxed font-normal text-tmuted sm:text-sm md:text-base">
          {t(locale, 'site.tagline')} — {t(locale, 'hero.private_note')}
        </p>
      </div>
    </section>
  );
}
