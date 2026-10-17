/**
 * 404 page: faithful port of the web app's 404 page, with the home link
 * pointing at the hash route (#/) instead of the web path (/).
 * No Header/Footer — the app shell renders those.
 */
import { t, type Locale } from '../lib/i18n/index';

export interface NotFoundPageProps {
  locale: Locale;
}

export function NotFoundPage({ locale }: NotFoundPageProps) {
  return (
    <div className="bg-tband">
      <div className="mx-auto box-border w-full min-w-0 max-w-[960px] px-4 py-24 text-center">
        <p className="text-6xl font-medium break-words text-[#007bff]">
          {t(locale, 'notfound.code')}
        </p>
        <h1 className="mt-4 text-2xl font-normal break-words text-tink">
          {t(locale, 'notfound.title')}
        </h1>
        <p className="mt-2 font-light break-words text-tink2">{t(locale, 'notfound.body')}</p>
        <a
          href="#/"
          className="mt-6 inline-block rounded-[6px] bg-tbtnb px-6 py-2.5 text-sm font-bold break-words text-white transition hover:bg-[#0257bf]"
        >
          {t(locale, 'notfound.back_home')}
        </a>
      </div>
    </div>
  );
}

export default NotFoundPage;
