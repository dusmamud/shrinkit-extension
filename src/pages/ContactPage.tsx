/**
 * Contact page: faithful, beautifully styled port of the web app's contact page.
 * Uses exact brand tokens, card container, and verified email hello@shrinkit.dusrel.com.
 */
import { t, type Locale } from '../lib/i18n/index';

export interface ContactPageProps {
  locale: Locale;
}

const CONTACT_EMAIL = 'hello@shrinkit.dusrel.com';

export function ContactPage({ locale }: ContactPageProps) {
  return (
    <div className="w-full bg-tband py-12 sm:py-16">
      <div className="mx-auto box-border w-full min-w-0 max-w-3xl px-4">
        <h1 className="text-3xl font-normal tracking-tight break-words text-tink sm:text-[2.5rem]">
          {t(locale, 'contact.title')}
        </h1>
        <p className="mt-4 text-[1rem] font-light leading-relaxed break-words text-tink2 sm:text-[1.0625rem]">
          {t(locale, 'contact.body')}
        </p>
        <div className="mt-8 rounded-xl border border-tdash bg-tsurface p-6 shadow-sm">
          <p className="text-sm font-light break-words text-tink2">
            {t(locale, 'contact.email_label')}{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium text-taccent underline underline-offset-2 hover:text-[#0257bf]"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ContactPage;
