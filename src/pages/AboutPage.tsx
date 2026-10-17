/**
 * About page: faithful condensed port of the web app's about page.
 * Copy comes from the existing about.* i18n keys. No Header/Footer —
 * the app shell renders those.
 */
import { t, type Locale } from '../lib/i18n/index';

export interface AboutPageProps {
  locale: Locale;
}

export function AboutPage({ locale }: AboutPageProps) {
  return (
    <div className="bg-tband">
      <div className="mx-auto box-border w-full min-w-0 max-w-[960px] px-4 py-14">
        <h1 className="text-[2.5rem] font-normal tracking-tight break-words text-tink">
          {t(locale, 'about.title')}
        </h1>
        <div className="mt-4 space-y-4 text-sm leading-relaxed break-words text-tink2">
          <p>{t(locale, 'about.body1')}</p>
          <p>{t(locale, 'about.body2')}</p>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;
