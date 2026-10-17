import { t } from '../../lib/i18n/index';
import type { Locale } from '../../lib/i18n/index';

export interface ToolsGridProps {
  locale: Locale;
}

interface ToolCard {
  href: string;
  titleKey: string;
  badgeKey: string;
  metricKey: string;
  descKey: string;
}

/** The 5 specialized tools, mirroring the web app's ToolsShowcase. */
const TOOLS: readonly ToolCard[] = [
  {
    href: '#/tools/compress-to-50kb',
    titleKey: 'home.tools.50kb.title',
    badgeKey: 'home.tools.50kb.badge',
    metricKey: 'home.tools.50kb.metric',
    descKey: 'home.tools.50kb.desc',
  },
  {
    href: '#/tools/compress-to-20kb',
    titleKey: 'home.tools.20kb.title',
    badgeKey: 'home.tools.20kb.badge',
    metricKey: 'home.tools.20kb.metric',
    descKey: 'home.tools.20kb.desc',
  },
  {
    href: '#/tools/passport-photo-maker',
    titleKey: 'home.tools.passport.title',
    badgeKey: 'home.tools.passport.badge',
    metricKey: 'home.tools.passport.metric',
    descKey: 'home.tools.passport.desc',
  },
  {
    href: '#/tools/social-media-resizer',
    titleKey: 'home.tools.social.title',
    badgeKey: 'home.tools.social.badge',
    metricKey: 'home.tools.social.metric',
    descKey: 'home.tools.social.desc',
  },
  {
    href: '#/tools/compare-images',
    titleKey: 'home.tools.compare.title',
    badgeKey: 'home.tools.compare.badge',
    metricKey: 'home.tools.compare.metric',
    descKey: 'home.tools.compare.desc',
  },
];

/**
 * Specialized-tools grid, mirroring the web app's ToolsShowcase.
 * Cards link to hash routes (#/tools/...) handled by the Editor shell.
 */
export default function ToolsGrid({ locale }: ToolsGridProps) {
  return (
    <section
      className="border-t border-tborderfaint bg-tpage py-12 sm:py-16"
      aria-labelledby="tools-heading"
    >
      <div className="mx-auto box-border w-full min-w-0 max-w-6xl px-4 sm:px-6">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-taccent/20 bg-taccent/10 px-3 py-1 text-xs font-semibold text-taccent">
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              {t(locale, 'home.tools.badge')}
            </div>
            <h2
              id="tools-heading"
              className="text-2xl font-bold tracking-tight break-words text-tink sm:text-3xl md:text-4xl"
            >
              {t(locale, 'home.tools.heading')}
            </h2>
            <p className="mt-2 max-w-2xl text-sm break-words text-tmuted sm:text-base">
              {t(locale, 'home.tools.subheading')}
            </p>
          </div>

          <a
            href="#/tools"
            className="group inline-flex shrink-0 items-center gap-2 self-start text-sm font-semibold text-taccent hover:underline md:self-end"
          >
            <span>{t(locale, 'home.tools.all_tools')}</span>
            <svg
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </a>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <a
              key={tool.href}
              href={tool.href}
              className="group relative flex min-w-0 flex-col justify-between rounded-2xl border border-tborderfaint bg-tsurface p-6 transition duration-200 hover:-translate-y-0.5 hover:border-taccent hover:shadow-lg"
            >
              <div className="min-w-0">
                <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <span className="inline-block max-w-full rounded-full border border-tborderfaint bg-tsurface2 px-2.5 py-0.5 text-xs font-semibold break-words text-tink2">
                    {t(locale, tool.badgeKey)}
                  </span>
                  <span className="shrink-0 rounded-md bg-taccent/10 px-2 py-0.5 font-mono text-xs font-semibold text-taccent">
                    {t(locale, tool.metricKey)}
                  </span>
                </div>
                <h3 className="mb-2 text-lg font-bold break-words text-tink transition-colors group-hover:text-taccent">
                  {t(locale, tool.titleKey)}
                </h3>
                <p className="text-xs leading-relaxed break-words text-tmuted sm:text-sm">
                  {t(locale, tool.descKey)}
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-tborderfaint/60 pt-4 text-xs font-bold text-taccent">
                <span>{t(locale, 'home.tools.open_tool')}</span>
                <span
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-1.5"
                >
                  →
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
