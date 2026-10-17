/**
 * Resize page: mirrors the web app's /resize page — the shared landing
 * hero + the main resizer, and nothing else (no HowItWorks / InfoSections
 * / Tools grid; those live on Home). The shell renders the minimal
 * copyright-only footer for this route, exactly like the web page.
 */
import type { Locale } from '../lib/i18n/index';
import MainResizer from '../components/MainResizer';
import Hero from '../components/home/Hero';

export interface ResizePageProps {
  locale: Locale;
}

export function ResizePage({ locale }: ResizePageProps) {
  return (
    <div>
      <Hero locale={locale} />
      <div id="tool" className="scroll-mt-6">
        <MainResizer locale={locale} />
      </div>
    </div>
  );
}

export default ResizePage;
