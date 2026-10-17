/**
 * Terms page: faithful CONDENSED version of the web app's Terms & Conditions.
 * Section titles match the web terms exactly; each section is 1–3 faithful
 * sentences. The full text lives on shrinkit.dusrel.com/terms (linked at
 * the end). No Header/Footer — the app shell renders those.
 */
import { t, type Locale } from '../lib/i18n/index';

export interface TermsPageProps {
  locale: Locale;
}

const SECTION_COUNT = 16;
const FULL_TEXT_URL = 'https://shrinkit.dusrel.com/terms';

export function TermsPage({ locale }: TermsPageProps) {
  const sections = Array.from({ length: SECTION_COUNT }, (_, index) => {
    const number = index + 1;
    return {
      id: `terms-section-${number}`,
      title: t(locale, `terms.sec${number}.title`),
      body: t(locale, `terms.sec${number}.body`),
    };
  });

  return (
    <div className="bg-tband">
      <div className="mx-auto box-border w-full min-w-0 max-w-[960px] px-4 py-14">
        <h1 className="text-[2.5rem] font-normal tracking-tight break-words text-tink">
          {t(locale, 'terms.title')}
        </h1>
        <p className="mt-4 text-[1.0625rem] font-light leading-relaxed break-words text-tink2">
          {t(locale, 'terms.intro')}
        </p>
        <p className="mt-4 rounded-[6px] border border-tdash bg-tsurface px-5 py-4 text-sm font-light leading-relaxed break-words text-tink2">
          {t(locale, 'terms.disclaimer')}
        </p>
        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section
              key={section.id}
              className="rounded-[6px] border border-tdivider bg-tsurface p-6"
            >
              <h2 className="text-xl font-medium break-words text-tink">{section.title}</h2>
              <p className="mt-3 text-[1.0625rem] font-light leading-relaxed break-words text-tink2">
                {section.body}
              </p>
            </section>
          ))}
        </div>
        <p className="mt-8 text-sm font-light break-words text-tink2">
          <a
            href={FULL_TEXT_URL}
            target="_blank"
            rel="noopener"
            className="font-normal text-taccent underline underline-offset-2 hover:text-[#0257bf]"
          >
            {t(locale, 'terms.full_text')}
          </a>
        </p>
      </div>
    </div>
  );
}

export default TermsPage;
