/**
 * Terms and Conditions page: authentic, full-length Terms & Conditions from shrinkit web (termsDoc).
 * All 16 sections, summary cards, contents navigation, and data tables match shrinkit.dusrel.com.
 * No Header/Footer — the app shell renders those.
 */
import { type Locale } from '../lib/i18n/index';
import { LegalPage } from '../components/LegalPage';
import { termsDoc } from '../content/legal/terms';

export interface TermsPageProps {
  locale: Locale;
}

const FULL_TEXT_URL = 'https://shrinkit.dusrel.com/terms';

export function TermsPage({ locale }: TermsPageProps) {
  const notice =
    locale !== 'en'
      ? 'A note on language: These Terms and Conditions are written in English, and the English text governs. The summary and headings describe the terms in plain language.'
      : undefined;

  return (
    <LegalPage
      doc={termsDoc}
      notice={notice}
      fullTextUrl={FULL_TEXT_URL}
    />
  );
}

export default TermsPage;
