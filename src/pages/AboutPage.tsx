/**
 * About page: faithful, beautifully styled port of the web app's about page.
 * Uses exact brand tokens, card container, and verified copy.
 */
import { t, type Locale } from '../lib/i18n/index';

export interface AboutPageProps {
  locale: Locale;
}

export function AboutPage({ locale }: AboutPageProps) {
  return (
    <div className="w-full bg-tband py-12 sm:py-16">
      <div className="mx-auto box-border w-full min-w-0 max-w-3xl px-4">
        <h1 className="text-3xl font-normal tracking-tight break-words text-tink sm:text-[2.5rem]">
          {t(locale, 'about.title')}
        </h1>
        <div className="mt-6 rounded-xl border border-tdivider bg-tsurface p-6 shadow-sm space-y-4 text-sm leading-relaxed break-words text-tink2 sm:p-7 sm:text-base">
          <p>{t(locale, 'about.body1')}</p>
          <p>{t(locale, 'about.body2')}</p>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;
