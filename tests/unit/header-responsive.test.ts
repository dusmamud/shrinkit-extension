/**
 * header-responsive.test.ts — regression tests for the header mid-word-break bug.
 *
 * Screenshots proved the header breaking words mid-word at tablet widths:
 * "Shrink / It", "Tool / s", "Privac / y", "Conta / ct". Pinned root causes:
 *   (1) the extension header gated the desktop nav on `md:` (>=768px) while
 *       the web app uses `lg:` (>=1024px) — at 768-1024px the full nav was
 *       hopelessly squeezed;
 *   (2) the extension had FIVE nav links vs the web app's FOUR — the extra
 *       "Resize an Image" link duplicated the CTA (~120px wider than web);
 *   (3) brand wordmark / nav links / CTA lacked `whitespace-nowrap` and the
 *       brand link / CTA lacked `shrink-0`, so squeezing broke words.
 *
 * Source-level tests (read files as text, no DOM), same style as
 * css-guard.test.ts. Do NOT "fix" these tests by weakening them — if one
 * fails, the Header.tsx / CSS source regressed.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { ROUTES } from '../../src/router/routes';

function readSource(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(`../../${relativePath}`, import.meta.url)), 'utf8').replace(/\r\n/g, '\n');
}

/** Strip block comments so class assertions cannot match prose in comments. */
function stripBlockComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * The full opening `<tag ...>` tag whose attribute list contains `needle`.
 * Scans for the closing `>` at brace depth 0 outside quotes, so `>` / `{` /
 * `}` inside `{...}` expressions and template literals cannot end the tag
 * early. Returns null when the needle / tag is absent.
 */
function openingTag(source: string, needle: string, tag: string): string | null {
  const needleIdx = source.indexOf(needle);
  if (needleIdx === -1) {
    return null;
  }
  const start = source.lastIndexOf(`<${tag}`, needleIdx);
  if (start === -1) {
    return null;
  }
  let depth = 0;
  let quote: string | null = null;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (quote !== null) {
      if (ch === quote && source[i - 1] !== '\\') {
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
    } else if (ch === '>' && depth === 0) {
      return source.slice(start, i + 1);
    }
  }
  return null;
}

/** The desktop `<nav>` block (aria-label nav.primary), up to its `</nav>`. */
function desktopNavBlock(header: string): string {
  const start = header.indexOf('nav.primary');
  expect(start, 'expected a desktop <nav> with aria-label nav.primary').toBeGreaterThan(-1);
  const navStart = header.lastIndexOf('<nav', start);
  const navEnd = header.indexOf('</nav>', start);
  expect(navEnd, 'expected the desktop <nav> to close').toBeGreaterThan(-1);
  return header.slice(navStart, navEnd);
}

interface NavLinkEntry {
  href: string;
  labelKey: string;
}

/** Parse the NAV_LINKS array literal from Header.tsx source (no import). */
function navLinksFromSource(header: string): NavLinkEntry[] {
  const block = header.match(/const NAV_LINKS[^=]*=\s*\[([\s\S]*?)\];/)?.[1];
  expect(block, 'expected a NAV_LINKS array literal in Header.tsx').toBeDefined();
  const entries = [
    ...(block as string).matchAll(/\{\s*href:\s*'([^']+)'\s*,\s*labelKey:\s*'([^']+)'\s*\}/g),
  ];
  return entries.map((m) => ({ href: m[1], labelKey: m[2] }));
}

/** Web parity: the web app's header has exactly these four nav links. */
const WEB_NAV_HREFS = ['#/tools', '#/#how-it-works', '#/privacy', '#/contact'];

/** CSS files that may carry break rules: shared styles + every entrypoint style. */
const CSS_FILES = [
  'src/styles/global.css',
  'entrypoints/editor/style.css',
  'entrypoints/options/style.css',
  'entrypoints/popup/style.css',
];

/** Flat `{ selector { declarations } }` rules (comments stripped first). */
function cssRules(css: string): { selector: string; declarations: string }[] {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules: { selector: string; declarations: string }[] = [];
  for (const match of stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    rules.push({ selector: match[1].trim(), declarations: match[2] });
  }
  return rules;
}

/**
 * True when a selector is global (no class / id / attribute qualifier):
 * bare elements (`p`, `body`), `*`, `:root`, `@font-face`, ... A scoped
 * selector (`.popup-thumb-name`, `#root`, `input[type="text"]`) is not global.
 */
function isGlobalSelector(selector: string): boolean {
  return !selector.includes('.') && !selector.includes('#') && !selector.includes('[');
}

describe('header breakpoint matches web (lg:, not md:)', () => {
  it('desktop nav uses lg:flex and the hamburger wrapper uses lg:hidden', () => {
    const header = stripBlockComments(readSource('src/components/layout/Header.tsx'));
    expect(header).toContain('lg:flex');
    expect(header).toContain('lg:hidden');

    const navTag = openingTag(header, 'nav.primary', 'nav');
    expect(navTag, 'expected a desktop <nav> tag').not.toBeNull();
    expect(navTag).toContain('hidden');
    expect(navTag).toContain('lg:flex');

    // The hamburger wrapper div is the <div> enclosing the menu button.
    const hamburgerDiv = openingTag(header, 'aria-controls="mobile-menu"', 'div');
    expect(hamburgerDiv, 'expected a hamburger wrapper <div>').not.toBeNull();
    expect(hamburgerDiv).toContain('lg:hidden');
  });

  it('no md:flex / md:hidden gates the desktop nav (web uses lg:)', () => {
    const header = stripBlockComments(readSource('src/components/layout/Header.tsx'));
    expect(
      header,
      'md:flex would show the full nav from 768px — web waits until lg:',
    ).not.toContain('md:flex');
    expect(
      header,
      'md:hidden would hide the hamburger from 768px — web waits until lg:',
    ).not.toContain('md:hidden');
  });
});

describe('nav has exactly the web-parity 4 links', () => {
  it('NAV_LINKS length is exactly 4', () => {
    const header = readSource('src/components/layout/Header.tsx');
    const links = navLinksFromSource(header);
    expect(links).toHaveLength(4);
  });

  it('NAV_LINKS are exactly the web 4 — no duplicate Resize link (web parity)', () => {
    // The old 5th link ({ href: '#/', labelKey: 'nav.resize' }) duplicated
    // the "Resize Image" CTA and made the nav ~120px wider than the web's.
    const header = readSource('src/components/layout/Header.tsx');
    const links = navLinksFromSource(header);
    expect(links.map((link) => link.href).sort()).toEqual([...WEB_NAV_HREFS].sort());
    expect(links.map((link) => link.labelKey)).not.toContain('nav.resize');
    expect(links.map((link) => link.href)).not.toContain('#/');
  });
});

describe('header text never breaks mid-word (whitespace-nowrap + shrink-0)', () => {
  it('brand wordmark span has whitespace-nowrap; brand link has shrink-0', () => {
    const header = stripBlockComments(readSource('src/components/layout/Header.tsx'));

    // The wordmark is the <span> whose text is the site name.
    const brandSpan = openingTag(header, "{t(locale, 'site.name')}\n          </span>", 'span');
    expect(brandSpan, 'expected a brand <span> rendering the site name').not.toBeNull();
    expect(brandSpan).toContain('whitespace-nowrap');

    const brandLink = openingTag(header, "aria-label={t(locale, 'site.name')}", 'a');
    expect(brandLink, 'expected a brand <a> with the site-name aria-label').not.toBeNull();
    expect(brandLink).toContain('shrink-0');
  });

  it('desktop nav links have whitespace-nowrap', () => {
    const header = stripBlockComments(readSource('src/components/layout/Header.tsx'));
    const desktopNav = desktopNavBlock(header);
    const navLinkTag = openingTag(desktopNav, 'href={link.href}', 'a');
    expect(navLinkTag, 'expected a desktop nav <a> rendering link.href').not.toBeNull();
    expect(navLinkTag).toContain('whitespace-nowrap');
  });

  it('desktop CTA has whitespace-nowrap + shrink-0', () => {
    const header = stripBlockComments(readSource('src/components/layout/Header.tsx'));
    const desktopNav = desktopNavBlock(header);
    const ctaTag = openingTag(desktopNav, 'nav.resize_image', 'a');
    expect(ctaTag, 'expected a desktop CTA <a> rendering nav.resize_image').not.toBeNull();
    expect(ctaTag).toContain('whitespace-nowrap');
    expect(ctaTag).toContain('shrink-0');
  });
});

describe('no global break rules in CSS (a global break rule would split header words)', () => {
  it('no break-all / overflow-wrap:anywhere on a global selector in global.css + entrypoint styles', () => {
    // Scoped rules are allowed: a class-scoped rule (e.g. .popup-thumb-name
    // for long filenames, .popup-error for error text) only affects the long
    // unbroken strings it targets. A GLOBAL rule (bare element, *, body,
    // :root, ...) would apply to header words too and split them mid-word.
    const violations: string[] = [];
    for (const file of CSS_FILES) {
      const rules = cssRules(readSource(file));
      expect(rules.length, `expected CSS rules to parse in ${file}`).toBeGreaterThan(0);
      for (const rule of rules) {
        const hasBreakRule =
          /word-break\s*:\s*break-all/.test(rule.declarations) ||
          /overflow-wrap\s*:\s*anywhere/.test(rule.declarations);
        if (!hasBreakRule) {
          continue;
        }
        for (const selector of rule.selector.split(',')) {
          const trimmed = selector.trim();
          if (isGlobalSelector(trimmed)) {
            violations.push(`${file}: global selector "${trimmed}" uses a break rule`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

describe('routes still 13', () => {
  it('ROUTES has exactly 13 entries', () => {
    expect(ROUTES).toHaveLength(13);
    expect([...ROUTES].sort()).toEqual(
      [
        '/',
        '/tools',
        '/tools/compress-to-50kb',
        '/tools/compress-to-20kb',
        '/tools/passport-photo-maker',
        '/tools/social-media-resizer',
        '/tools/compare-images',
        '/about',
        '/contact',
        '/privacy',
        '/terms',
        '/resize',
        '*',
      ].sort(),
    );
  });
});
