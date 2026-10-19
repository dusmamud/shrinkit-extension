/**
 * Privacy Policy page: authentic, full-length Privacy Policy from shrinkit web (privacyDoc).
 * All 16 sections, summary cards, contents navigation, and data tables match shrinkit.dusrel.com.
 * No Header/Footer — the app shell renders those.
 */
import { type Locale } from '../lib/i18n/index';
import { LegalPage } from '../components/LegalPage';
import { privacyDoc } from '../content/legal/privacy';

export interface PrivacyPageProps {
  locale: Locale;
}

const FULL_TEXT_URL = 'https://shrinkit.dusrel.com/privacy';

export function PrivacyPage({ locale }: PrivacyPageProps) {
  const notice =
    locale !== 'en'
      ? 'A note on language: This Privacy Policy is written in English, and the English text governs. The summary and headings above describe the policy in plain language.'
      : undefined;

  return (
    <LegalPage
      doc={privacyDoc}
      notice={notice}
      fullTextUrl={FULL_TEXT_URL}
    />
  );
}

export default PrivacyPage;
