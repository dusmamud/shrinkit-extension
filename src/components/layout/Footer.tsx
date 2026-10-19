import type { Locale } from '../../lib/i18n/index.js';
import { t } from '../../lib/i18n/index.js';
import { resolveIconUrl } from './Header.js';

export interface FooterProps {
  locale: Locale;
  /**
   * 'full' (default): brand + 4 link columns + copyright bar.
   * 'minimal': copyright bar only — mirrors the web /resize page,
   * which shows the footer with ONLY the copyright bar (0 footer links).
   */
  variant?: 'full' | 'minimal';
}

interface FooterLink {
  href: string;
  labelKey: string;
  external?: boolean;
}

interface FooterColumn {
  headingKey: string;
  links: FooterLink[];
}

/**
 * Footer columns: Product / Tools / Privacy / Reach out.
 * Informational pages link directly to the authoritative live web app (shrinkit.dusrel.com).
 */
const COLUMNS: FooterColumn[] = [
  {
    headingKey: 'footer.col_product',
    links: [
      { href: '#/', labelKey: 'footer.resize_image' },
      { href: 'https://shrinkit.dusrel.com/#how-it-works', labelKey: 'footer.how_it_works', external: true },
      { href: 'https://shrinkit.dusrel.com/about', labelKey: 'footer.about', external: true },
    ],
  },
  {
    headingKey: 'footer.col_tools',
    links: [
      { href: '#/tools', labelKey: 'footer.tools_all' },
      { href: '#/tools/compress-to-50kb', labelKey: 'footer.tools_50kb' },
      { href: '#/tools/compress-to-20kb', labelKey: 'footer.tools_20kb' },
      { href: '#/tools/passport-photo-maker', labelKey: 'footer.tools_passport' },
      { href: '#/tools/social-media-resizer', labelKey: 'footer.tools_social' },
      { href: '#/tools/compare-images', labelKey: 'footer.tools_compare' },
    ],
  },
  {
    headingKey: 'footer.col_privacy',
    links: [
      { href: 'https://shrinkit.dusrel.com/privacy', labelKey: 'footer.privacy_policy', external: true },
      { href: 'https://shrinkit.dusrel.com/terms', labelKey: 'footer.terms', external: true },
    ],
  },
  {
    headingKey: 'footer.col_reachout',
    links: [{ href: 'https://shrinkit.dusrel.com/contact', labelKey: 'footer.contact_us', external: true }],
  },
];

/**
 * Site footer — faithful React port of the web app's Footer.astro
 * (full variant, not the minimal copyright-only /resize variant).
 * Brand block + tagline on the left, 4 link columns on the right,
 * and the accent copyright bar at the bottom. Spacing, type sizes,
 * and colors mirror the web footer via the shared --t-* tokens.
 */
export default function Footer({ locale, variant = 'full' }: FooterProps) {
  const year = new Date().getFullYear();

  // Minimal variant: copyright bar only (web /resize parity).
  if (variant === 'minimal') {
    return (
      <footer className="mt-0">
        <div className="bg-[#016df0]">
          <p className="mx-auto max-w-[1075px] px-4 py-3 text-center text-sm font-normal text-white">
            {t(locale, 'footer.rights', { year })}
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="mt-0 bg-tsurface2 pt-[3em]">
      <div className="mx-auto max-w-[1075px] px-4 pb-10">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <a href="#/" className="flex items-center gap-2.5" aria-label={t(locale, 'site.name')}>
              <img
                src={resolveIconUrl()}
                alt={t(locale, 'site.name')}
                width={30}
                height={30}
                style={{ width: 30, height: 30, maxWidth: 30, maxHeight: 30 }}
                className="shrink-0 object-contain"
                draggable={false}
              />
              <span className="text-lg font-medium tracking-tight text-tink">
                {t(locale, 'site.name')}
              </span>
            </a>
            <p className="mt-3 text-[0.875rem] font-light leading-relaxed text-tink">
              {t(locale, 'footer.tagline')}
            </p>
            <p className="mt-2 text-[0.8rem] font-light leading-relaxed">
              <a
                href="https://dusrel.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-tink/70 underline-offset-2 transition-colors hover:text-taccent hover:underline"
              >
                {t(locale, 'footer.by_dusrel')}
              </a>
            </p>
          </div>
          <div className="flex flex-col gap-8 sm:flex-row sm:gap-16">
            {COLUMNS.map((column) => (
              <div key={column.headingKey}>
                <h3 className="text-[0.875rem] font-medium text-tink">
                  {t(locale, column.headingKey)}
                </h3>
                <ul className="mt-3 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        target={link.external ? '_blank' : undefined}
                        rel={link.external ? 'noopener noreferrer' : undefined}
                        className="inline-block py-0.5 text-[0.875rem] font-light text-tink transition-colors hover:text-taccent"
                      >
                        {t(locale, link.labelKey)}
                        {link.external && <span className="ml-1 text-xs opacity-70">&nearr;</span>}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-[#016df0]">
        <p className="mx-auto max-w-[1075px] px-4 py-3 text-center text-sm font-normal text-white">
          {t(locale, 'footer.rights', { year })}
        </p>
      </div>
    </footer>
  );
}
