/**
 * Tools hub page: grid of the five specialized tools, mirroring the web app's tools page.
 * Uses exact brand tokens, hover micro-animations, and verified route links.
 */
import { t, type Locale } from '../lib/i18n/index';

export interface ToolsHubPageProps {
  locale: Locale;
}

interface HubTool {
  titleKey: string;
  badgeKey: string;
  descKey: string;
  href: string;
}

const HUB_TOOLS: HubTool[] = [
  {
    titleKey: 'tools.hub.card50Title',
    badgeKey: 'tools.hub.card50Badge',
    descKey: 'tools.hub.card50Desc',
    href: '#/tools/compress-to-50kb',
  },
  {
    titleKey: 'tools.hub.card20Title',
    badgeKey: 'tools.hub.card20Badge',
    descKey: 'tools.hub.card20Desc',
    href: '#/tools/compress-to-20kb',
  },
  {
    titleKey: 'tools.hub.cardPassportTitle',
    badgeKey: 'tools.hub.cardPassportBadge',
    descKey: 'tools.hub.cardPassportDesc',
    href: '#/tools/passport-photo-maker',
  },
  {
    titleKey: 'tools.hub.cardSocialTitle',
    badgeKey: 'tools.hub.cardSocialBadge',
    descKey: 'tools.hub.cardSocialDesc',
    href: '#/tools/social-media-resizer',
  },
  {
    titleKey: 'tools.hub.cardCompareTitle',
    badgeKey: 'tools.hub.cardCompareBadge',
    descKey: 'tools.hub.cardCompareDesc',
    href: '#/tools/compare-images',
  },
];

export function ToolsHubPage({ locale }: ToolsHubPageProps) {
  return (
    <div className="w-full bg-tband py-12 sm:py-16">
      <div className="mx-auto box-border w-full min-w-0 max-w-5xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-taccent/20 bg-taccent/10 px-3 py-1 text-xs font-semibold text-taccent">
            <span>ShrinkIt Tools</span>
          </div>
          <h1 className="mb-3 text-3xl font-bold tracking-tight break-words text-tink sm:text-4xl">
            {t(locale, 'tools.hub.title')}
          </h1>
          <p className="mx-auto max-w-2xl text-sm break-words text-tmuted sm:text-base">
            {t(locale, 'tools.hub.description')}
          </p>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {HUB_TOOLS.map((tool) => (
            <a
              key={tool.href}
              href={tool.href}
              className="group flex min-w-0 flex-col justify-between rounded-2xl border border-tdivider bg-tsurface p-6 shadow-sm break-words transition-all duration-200 hover:-translate-y-1 hover:border-taccent hover:shadow-md"
            >
              <div className="min-w-0">
                <div className="mb-3 inline-block rounded-full border border-taccent/20 bg-taccent/10 px-2.5 py-0.5 text-xs font-semibold break-words text-taccent">
                  {t(locale, tool.badgeKey)}
                </div>
                <h2 className="mb-2 text-lg font-bold break-words text-tink transition group-hover:text-taccent">
                  {t(locale, tool.titleKey)}
                </h2>
                <p className="text-xs leading-relaxed break-words text-tmuted sm:text-sm">
                  {t(locale, tool.descKey)}
                </p>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-1.5 text-xs font-bold break-words text-taccent">
                <span className="whitespace-nowrap">{t(locale, 'tools.hub.openTool')}</span>
                <span
                  aria-hidden="true"
                  className="shrink-0 transition-transform group-hover:translate-x-1"
                >
                  &rarr;
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ToolsHubPage;
