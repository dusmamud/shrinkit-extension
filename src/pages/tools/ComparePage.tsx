/**
 * Before vs After Comparison tool page: page hero + CompareTool + short
 * how-to block + back-to-tools link. Page copy comes from
 * tools.comparePage.* i18n keys; the tool UI itself uses tools.compare.*.
 * No Header/Footer — the app shell renders those.
 */
import { t, type Locale } from '../../lib/i18n/index';
import CompareTool from '../../tools/compare/CompareTool';

export interface ComparePageProps {
  locale: Locale;
}

export function ComparePage({ locale }: ComparePageProps) {
  return (
    <div className="mx-auto box-border w-full min-w-0 max-w-[960px] px-4 py-8 sm:px-6">
      <div className="mb-8 text-center">
        <span className="mb-3 inline-flex items-center rounded-full border border-taccent/20 bg-taccent/10 px-3 py-1 text-xs font-semibold break-words text-taccent">
          {t(locale, 'tools.comparePage.badge')}
        </span>
        <h1 className="mb-3 text-3xl font-bold tracking-tight break-words text-tink sm:text-4xl">
          {t(locale, 'tools.comparePage.title')}
        </h1>
        <p className="mx-auto max-w-2xl text-sm break-words text-tmuted sm:text-base">
          {t(locale, 'tools.comparePage.subtitle')}
        </p>
      </div>

      <CompareTool locale={locale} />

      <div className="mx-auto box-border w-full min-w-0 max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="box-border min-w-0 rounded-2xl border border-tline bg-tsurface p-4 break-words sm:p-6 lg:p-8">
          <h2 className="mb-3 text-lg font-bold break-words text-tink">
            {t(locale, 'tools.comparePage.howToTitle')}
          </h2>
          <div className="space-y-2 text-xs leading-relaxed break-words text-tmuted sm:text-sm">
            <p>{t(locale, 'tools.comparePage.howTo1')}</p>
            <p>{t(locale, 'tools.comparePage.howTo2')}</p>
            <p>{t(locale, 'tools.comparePage.howTo3')}</p>
          </div>
        </div>
        <div className="mt-6 text-center">
          <a
            href="#/tools"
            className="text-sm font-semibold break-words text-taccent transition hover:underline"
          >
            &larr; {t(locale, 'tools.page.backToTools')}
          </a>
        </div>
      </div>
    </div>
  );
}

export default ComparePage;
