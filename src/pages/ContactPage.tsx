/**
 * Contact page: minimal link card pointing to shrinkit.dusrel.com/contact.
 */
import { t, type Locale } from '../lib/i18n/index';

export interface ContactPageProps {
  locale: Locale;
}

const CONTACT_EMAIL = 'hello@shrinkit.dusrel.com';
const FULL_TEXT_URL = 'https://shrinkit.dusrel.com/contact';

export function ContactPage({ locale }: ContactPageProps) {
  return (
    <div className="w-full bg-tband py-12 sm:py-16">
      <div className="mx-auto box-border w-full min-w-0 max-w-2xl px-4 text-center">
        <div className="rounded-2xl border border-tdivider bg-tsurface p-8 shadow-sm sm:p-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-taccent/10 text-taccent">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-tink sm:text-3xl">
            {t(locale, 'contact.title')}
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-tmuted sm:text-base">
            Have questions, feedback, or need help? You can email us directly or visit our official contact form.
          </p>

          <div className="mt-6 rounded-xl border border-tdash bg-tband/40 p-4">
            <span className="text-xs text-tmuted uppercase tracking-wider block font-semibold mb-1">
              {t(locale, 'contact.email_label')}
            </span>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-base font-semibold text-taccent hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={FULL_TEXT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-taccent px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 sm:w-auto"
            >
              <span>Visit Contact Page on Web</span>
              <span>↗</span>
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

export default ContactPage;
