/**
 * Contact page: faithful port of the web app's contact page. The web app
 * has no contact form, so this page offers only the mailto link — no form
 * is invented. Copy comes from the existing contact.* i18n keys.
 * No Header/Footer — the app shell renders those.
 */
import { t, type Locale } from '../lib/i18n/index';

export interface ContactPageProps {
  locale: Locale;
}

const CONTACT_EMAIL = 'hello@shrinkit.dusrel.com';

export function ContactPage({ locale }: ContactPageProps) {
  return (
    <div className="bg-tband">
      <div className="mx-auto box-border w-full min-w-0 max-w-[960px] px-4 py-14">
        <h1 className="text-[2.5rem] font-normal tracking-tight break-words text-tink">
          {t(locale, 'contact.title')}
        </h1>
        <p className="mt-4 text-[1.0625rem] font-light leading-relaxed break-words text-tink2">
          {t(locale, 'contact.body')}
        </p>
        <p className="mt-8 rounded-[6px] border border-tdash bg-tsurface px-5 py-4 text-sm font-light break-words text-tink2">
          {t(locale, 'contact.email_label')}{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-normal text-taccent underline underline-offset-2 hover:text-[#0257bf]"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </div>
    </div>
  );
}

export default ContactPage;
