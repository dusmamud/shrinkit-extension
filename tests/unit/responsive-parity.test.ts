/**
 * responsive-parity.test.ts — web-app parity guard for containers, tokens,
 * breakpoints, logo pinning and manifest locale.
 *
 * Target values come from the ShrinkIt WEB app (~/workspace/shrinkit,
 * read-only reference):
 *  - header inner: Header.astro max-w-[1075px]
 *  - tool wrapper: ShrinkItApp.tsx max-w-[960px]
 *  - dropzone: Dropzone.tsx max-w-[940px], rounded-2xl,
 *    px-4 sm:px-8 py-6 sm:py-8 md:py-9
 *  - settings form: SettingsPanel.tsx max-w-[650px]
 *  - popup: 400px wide (extension-only surface; Chrome popup geometry)
 *  - tokens: web src/styles/global.css --t-* Light + Dark 2 (Graphite)
 *
 * These tests assert TARGET values, not whatever the code happens to say:
 * they pin the contract the parity workers land against.
 *
 * Source-level only (node:fs) — no DOM, no build output — except the
 * built-manifest check, which is skipped when .output/ is absent.
 *
 * What this file does NOT verify (honest scope): real-browser overflow at
 * any width. Static checks prove the code carries the right containers,
 * tokens, breakpoints and shrink guards; only a real Chrome run proves
 * nothing actually overflows. See scripts/check-responsive.mjs, which
 * prints the same caveat in its width table.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function readSource(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(`../../${relativePath}`, import.meta.url)), 'utf8');
}

/** Strip /* … *\/ block comments so a stale comment can never trip a check. */
function stripBlockComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Strip `@media (…) ` preludes (up to the opening brace) so a breakpoint
 * such as `@media (min-width: 1280px)` is never mistaken for a fixed
 * element width by the width scanners below.
 */
function stripMediaPreludes(source: string): string {
  return source.replace(/@media[^{]*/g, '');
}

/** Block comments + media preludes removed: the text the width scans read. */
function scanText(source: string): string {
  return stripMediaPreludes(stripBlockComments(source));
}

/** All .css / .tsx / .ts files under entrypoints/ + src/ (no tests, no build). */
function extensionSources(): Array<{ path: string; text: string }> {
  const out: Array<{ path: string; text: string }> = [];
  const walk = (relativeDir: string): void => {
    const base = fileURLToPath(new URL(`../../${relativeDir}`, import.meta.url));
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      const rel = `${relativeDir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else if (/\.(css|tsx|ts)$/.test(entry.name)) {
        out.push({
          path: rel,
          text: readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), 'utf8'),
        });
      }
    }
  };
  walk('entrypoints');
  walk('src');
  return out;
}

/** Normalize a CSS color for comparison: lowercase, no whitespace, #rgb → #rrggbb. */
function normalizeColor(value: string | undefined): string {
  if (value === undefined) return '';
  let v = value.trim().toLowerCase().replace(/\s+/g, '');
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(v);
  if (short) v = `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  return v;
}

/** Parse `--name: value;` declarations out of one flat CSS block. */
function parseDeclarations(block: string): Map<string, string> {
  const map = new Map<string, string>();
  // Strip block comments first: a comment sharing a `;`-segment with the
  // next declaration would otherwise swallow that declaration.
  const clean = block.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const part of clean.split(';')) {
    const match = /^\s*(--[a-z0-9-]+)\s*:\s*(.+?)\s*$/.exec(part);
    if (match) map.set(match[1], match[2]);
  }
  return map;
}

/** Inner text of the first top-level block matching `selector { … }` (flat block). */
function extractBlock(css: string, selector: RegExp): string {
  const match = selector.exec(css);
  if (!match) return '';
  const open = css.indexOf('{', match.index);
  const close = css.indexOf('}', open);
  if (open < 0 || close < 0) return '';
  return css.slice(open + 1, close);
}

/** All className="…" values in a TSX source. */
function classNames(source: string): string[] {
  return [...source.matchAll(/className="([^"]+)"/g)].map((m) => m[1]);
}

/** All <img … /> tags in a TSX source. */
function imgTags(source: string): string[] {
  return source.match(/<img[\s\S]*?\/>/g) ?? [];
}

/**
 * True when a JSX size expression pins to 32px: either the literal `32`
 * or a named constant defined as 32 in the same file.
 */
function pinsTo32(expr: string | undefined, source: string): boolean {
  if (expr === undefined) return false;
  const trimmed = expr.trim();
  if (trimmed === '32') return true;
  const name = trimmed.match(/^([A-Za-z_$][\w$]*)$/)?.[1];
  if (!name) return false;
  return new RegExp(`const\\s+${name}\\s*=\\s*32\\b`).test(source);
}

function jsxAttr(tag: string, name: string): string | undefined {
  return tag.match(new RegExp(`${name}=\\{([^}]+)\\}`))?.[1];
}

function styleProp(tag: string, name: string): string | undefined {
  return tag.match(new RegExp(`${name}:\\s*([^,}\\s]+)`))?.[1];
}

/**
 * The forbidden 1100px container class, built by concatenation on purpose:
 * Tailwind v4's scanner reads every scanned file — including guard files —
 * and emits a utility for any literal forbidden-class string it finds,
 * even in a comment or an assertion (proven: a build newer than all UI
 * sources still emitted the utility, with check-tailwind.mjs the only
 * pre-build file containing the literal). This file must never contain
 * that literal, or the guard itself would ship the forbidden utility.
 */
const FORBIDDEN_CONTAINER = 'max-w-[' + '1100px]';

/** Web Light tokens (web src/styles/global.css :root). Keys omit the --t- prefix. */
const WEB_LIGHT: Record<string, string> = {
  page: '#ffffff',
  band: '#fafcff',
  surface: '#ffffff',
  'surface-2': '#f6faff',
  ink: '#000000',
  'ink-2': '#1d2939',
  muted: '#667085',
  border: '#e2e8f0',
  'border-soft': '#f1f5f9',
  'border-faint': '#f1f5f9',
  'border-mid': '#cbd5e1',
  divider: '#e2e8f0',
  'input-bg': '#ffffff',
  'input-border': '#cbd5e1',
  accent: '#016df0',
  'accent-2': '#1a7af7',
  'btn-a': '#016df0',
  'btn-b': '#007bff',
  'accent-soft': 'rgba(1, 109, 240, 0.1)',
  dash: '#52a0ff',
  'dropzone-bg': '#fafcff',
  'thumb-bg': '#fafcff',
  sectionbg: '#fcfcfc',
  error: '#d33',
  'error-wash': '#fff5f5',
  'error-soft-bg': '#fee4e2',
  'error-soft-border': '#fecdca',
  'error-soft-text': '#d92d20',
  'error-banner-text': '#ffffff',
  'error-banner-dim': 'rgba(255, 255, 255, 0.8)',
  'success-bg': '#e6f4ea',
  'success-text': '#0a7d4f',
  'success-border': '#0a7d4f',
  'warning-text': '#b7791f',
  teal: '#42c3ac',
  'tooltip-bg': '#323232',
  'tooltip-text': '#ecf0f1',
  'tooltip-border': 'transparent',
  'pill-bg': '#eef4ff',
  'pill-text': '#016df0',
  'pill-border': '#d0e1fd',
  'select-selected-bg': '#eaf3ff',
  'select-selected-text': '#016df0',
  'badge-bg': '#e0eafe',
  'badge-text': '#016df0',
  'select-hover-bg': '#f8f9fa',
  hoverbg: '#f9fafb',
  'trash-hover': '#fef2f2',
  'option-text': '#344054',
  'swiper-active': '#93b4e6',
  'swiper-inactive': '#d9e2ef',
  fade: 'rgba(250, 252, 255, 0.8)',
  shadow: 'rgba(16, 24, 40, 0.06)',
  'banner-bg': '#f8d7da',
  'banner-border': '#f5c6cb',
  'banner-text': '#721c24',
  'badge-off': '#667085',
  pilldark: '#1d2939',
  thumbshadow: 'rgba(1, 109, 240, 0.18)',
};

/** Web Dark 2 (Graphite) tokens (web src/styles/global.css [data-theme="dark"]). */
const WEB_DARK: Record<string, string> = {
  page: '#121214',
  band: '#121214',
  surface: '#1c1c1e',
  'surface-2': '#232326',
  ink: '#e5e5ea',
  'ink-2': '#d1d1d6',
  muted: '#98989f',
  border: 'rgba(255, 255, 255, 0.1)',
  'border-soft': 'rgba(255, 255, 255, 0.07)',
  'border-faint': 'rgba(255, 255, 255, 0.08)',
  'border-mid': 'rgba(255, 255, 255, 0.14)',
  divider: 'rgba(255, 255, 255, 0.09)',
  'input-bg': '#2c2c2e',
  'input-border': 'rgba(255, 255, 255, 0.16)',
  accent: '#0a84ff',
  'accent-2': '#0a84ff',
  'btn-a': '#0071e3',
  'btn-b': '#0071e3',
  'accent-soft': 'rgba(10, 132, 255, 0.16)',
  dash: '#0a84ff',
  'dropzone-bg': '#1a1a1c',
  'thumb-bg': '#1a1a1c',
  sectionbg: '#1c1c1e',
  error: '#ff7a7a',
  'error-wash': '#3a1d1d',
  'error-soft-bg': '#3d1d1d',
  'error-soft-border': '#5a2a2a',
  'error-soft-text': '#ff7a7a',
  'error-banner-text': '#ffb3b3',
  'error-banner-dim': 'rgba(255, 179, 179, 0.85)',
  'success-bg': '#14351f',
  'success-text': '#34d399',
  'success-border': '#34d399',
  'warning-text': '#e6b84d',
  teal: '#2dd4bf',
  'tooltip-bg': '#48484a',
  'tooltip-text': '#f5f5f7',
  'tooltip-border': '#5a5a5e',
  'pill-bg': '#1e2f4a',
  'pill-text': '#60a5fa',
  'pill-border': '#2c4a73',
  'select-selected-bg': '#1c2b45',
  'select-selected-text': '#60a5fa',
  'badge-bg': '#1e2f4a',
  'badge-text': '#60a5fa',
  'select-hover-bg': '#2c2c2e',
  hoverbg: '#232326',
  'trash-hover': '#3a1f23',
  'option-text': '#d1d1d6',
  'swiper-active': '#0a84ff',
  'swiper-inactive': '#3a3a3c',
  fade: 'rgba(18, 18, 20, 0.8)',
  shadow: 'rgba(0, 0, 0, 0.45)',
  'banner-bg': '#3a1f23',
  'banner-border': '#5a2a2a',
  'banner-text': '#ffb3b3',
  'badge-off': '#48484a',
  pilldark: '#2c2c2e',
  thumbshadow: 'rgba(10, 132, 255, 0.3)',
};

/**
 * Legacy --ed-* aliases in global.css html:root.
 * Key = alias name (without --), value = the --t-* token it must point at.
 * (--accent / --accent-hover live in the :root block, checked separately.)
 */
const ED_ALIASES: Record<string, string> = {
  'ed-surface': 'surface',
  'ed-surface-2': 'surface-2',
  'ed-ink': 'ink',
  'ed-ink-2': 'ink-2',
  'ed-muted': 'muted',
  'ed-line': 'border',
  'ed-input-bg': 'input-bg',
  'ed-input-line': 'input-border',
  'ed-thumb-bg': 'thumb-bg',
  'ed-accent': 'accent',
  'ed-accent-hover': 'btn-b',
  'ed-error': 'error',
  'ed-error-soft': 'error-soft-bg',
  'ed-success': 'success-text',
  'ed-success-bg': 'success-bg',
  'ed-warning': 'warning-text',
  'ed-dropzone': 'dropzone-bg',
  'ed-dash': 'dash',
  'ed-pill-bg': 'pill-bg',
  'ed-pill-text': 'pill-text',
  'ed-pill-line': 'pill-border',
  'ed-checker-a': 'thumb-bg',
  'ed-checker-b': 'border',
};

describe('Container parity (web values)', () => {
  it('editor header inner is 1075px (web Header.astro) in Editor.tsx + editor/style.css', () => {
    const editor = readSource('entrypoints/editor/Editor.tsx');
    const headerClass = classNames(editor).find((c) => c.includes('ed-header-inner'));
    expect(headerClass, 'ed-header-inner className in Editor.tsx').toBeDefined();
    expect(headerClass).toContain('max-w-[1075px]');
    const css = readSource('entrypoints/editor/style.css');
    const block = extractBlock(css, /\.ed-header-inner\s*\{/);
    expect(block).toContain('max-width: 1075px');
  });

  it('editor main inner is 960px (web ShrinkItApp.tsx) in Editor.tsx + editor/style.css', () => {
    const editor = readSource('entrypoints/editor/Editor.tsx');
    const mainClass = classNames(editor).find((c) => c.includes('ed-main-inner'));
    expect(mainClass, 'ed-main-inner className in Editor.tsx').toBeDefined();
    expect(mainClass).toContain('max-w-[960px]');
    const css = readSource('entrypoints/editor/style.css');
    const block = extractBlock(css, /\.ed-main-inner\s*\{/);
    expect(block).toContain('max-width: 960px');
  });

  it('MainResizer wrappers are 960px (outer + results), never 1100px', () => {
    const main = stripBlockComments(readSource('src/components/MainResizer.tsx'));
    expect(main.match(/max-w-\[960px\]/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(main).not.toContain(FORBIDDEN_CONTAINER);
  });

  it('Dropzone is 940px + web shape (rounded-2xl, px-4 sm:px-8 py-6 sm:py-8 md:py-9)', () => {
    const dropzone = readSource('src/components/Dropzone.tsx');
    const container = classNames(dropzone).find((c) => c.includes('cursor-pointer'));
    expect(container, 'dropzone container className (with cursor-pointer)').toBeDefined();
    for (const token of [
      'max-w-[940px]',
      'rounded-2xl',
      'px-4',
      'sm:px-8',
      'py-6',
      'sm:py-8',
      'md:py-9',
    ]) {
      expect(container).toContain(token);
    }
    for (const stale of [FORBIDDEN_CONTAINER, 'rounded-[6px]', 'px-3', 'sm:px-6', 'sm:py-12']) {
      expect(container).not.toContain(stale);
    }
    expect(stripBlockComments(dropzone)).not.toContain(FORBIDDEN_CONTAINER);
  });

  it('settings form is 650px (web SettingsPanel.tsx)', () => {
    expect(readSource('src/components/SettingsPanel.tsx')).toContain('max-w-[650px]');
  });

  it('popup is 400px wide', () => {
    const css = readSource('entrypoints/popup/style.css');
    const block = extractBlock(css, /\.popup-root\s*\{/);
    expect(block).toContain('width: 400px');
    expect(block).toContain('max-width: 400px');
  });

  it('no 1100px container anywhere in extension CSS/TSX/TS (comments + media preludes stripped)', () => {
    const hits: string[] = [];
    for (const { path, text } of extensionSources()) {
      if (scanText(text).includes('1100px')) hits.push(path);
    }
    expect(hits).toEqual([]);
  });

  it('no fixed width >1100px in extension CSS/TSX', () => {
    const patterns = [
      /max-w-\[(\d+)px\]/g,
      /max-width:\s*(\d+)px/g,
      /(?<!max-)(?<!min-)width:\s*(\d+)px/g,
      /min-width:\s*(\d+)px/g,
      /\bw-\[(\d+)px\]/g,
    ];
    const violations: string[] = [];
    for (const { path, text } of extensionSources()) {
      const clean = scanText(text);
      for (const pattern of patterns) {
        for (const match of clean.matchAll(pattern)) {
          const value = Number(match[1]);
          if (value > 1100) violations.push(`${path}: ${match[0]}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

describe('Token parity (web --t-* values)', () => {
  it('global.css Light --t-* equal web Light tokens', () => {
    const css = readSource('src/styles/global.css');
    const light = parseDeclarations(extractBlock(css, /^:root\s*\{/m));
    for (const [key, expected] of Object.entries(WEB_LIGHT)) {
      expect(
        normalizeColor(light.get(`--t-${key}`)),
        `Light --t-${key} should be ${expected}`,
      ).toBe(normalizeColor(expected));
    }
  });

  it('global.css Dark --t-* equal web Dark 2 (Graphite) tokens', () => {
    const css = readSource('src/styles/global.css');
    const dark = parseDeclarations(extractBlock(css, /^\[data-theme='dark'\]\s*\{/m));
    for (const [key, expected] of Object.entries(WEB_DARK)) {
      expect(normalizeColor(dark.get(`--t-${key}`)), `Dark --t-${key} should be ${expected}`).toBe(
        normalizeColor(expected),
      );
    }
  });

  it('global.css html:root --ed-* aliases point at the matching --t-* token', () => {
    const css = readSource('src/styles/global.css');
    const aliases = parseDeclarations(extractBlock(css, /^html:root\s*\{/m));
    for (const [alias, token] of Object.entries(ED_ALIASES)) {
      expect(aliases.get(`--${alias}`), `--${alias} alias`).toBe(`var(--t-${token})`);
    }
    // Legacy shorthands live in the :root (Light) block, not html:root.
    const light = parseDeclarations(extractBlock(css, /^:root\s*\{/m));
    expect(light.get('--accent'), '--accent shorthand').toBe('var(--t-accent)');
    expect(light.get('--accent-hover'), '--accent-hover shorthand').toBe('var(--t-btn-b)');
  });

  it('no --t-* definition outside global.css contradicts web values', () => {
    const bad: string[] = [];
    for (const file of [
      'entrypoints/editor/style.css',
      'entrypoints/popup/style.css',
      'entrypoints/options/style.css',
    ]) {
      const css = stripBlockComments(readSource(file));
      for (const match of css.matchAll(/--t-([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
        const key = match[1];
        const value = normalizeColor(match[2]);
        const okLight = WEB_LIGHT[key] !== undefined && value === normalizeColor(WEB_LIGHT[key]);
        const okDark = WEB_DARK[key] !== undefined && value === normalizeColor(WEB_DARK[key]);
        if (!okLight && !okDark) bad.push(`${file}: --t-${key} = ${match[2].trim()}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('var(--t-*, hex) fallbacks equal web Light values (fallbacks are live until tokens load)', () => {
    const bad: string[] = [];
    for (const file of [
      'src/styles/global.css',
      'entrypoints/editor/style.css',
      'entrypoints/popup/style.css',
    ]) {
      const css = stripBlockComments(readSource(file));
      for (const match of css.matchAll(/var\(--t-([a-z0-9-]+)\s*,\s*(#[0-9a-fA-F]{3,8})\s*\)/g)) {
        const key = match[1];
        if (WEB_LIGHT[key] === undefined) continue;
        if (normalizeColor(match[2]) !== normalizeColor(WEB_LIGHT[key])) {
          bad.push(`${file}: var(--t-${key}, ${match[2]}) — web Light is ${WEB_LIGHT[key]}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('popup dark literals spot-check: root #121214, dropzone #1a1a1c, primary #0071e3', () => {
    const css = readSource('entrypoints/popup/style.css');
    const root = extractBlock(css, /\[data-theme='dark'\]\s*\.popup-root\s*\{/);
    expect(root).toContain('background: #121214');
    const dropzone = extractBlock(css, /\[data-theme='dark'\]\s*\.popup-dropzone\s*\{/);
    expect(dropzone).toContain('background: #1a1a1c');
    const primary = extractBlock(css, /\[data-theme='dark'\]\s*\.popup-primary\s*\{/);
    expect(primary).toContain('background: #0071e3');
  });

  it('every entrypoint imports global.css before its own style.css (tokens + aliases apply)', () => {
    for (const file of [
      'entrypoints/editor/main.tsx',
      'entrypoints/popup/main.tsx',
      'entrypoints/options/main.tsx',
    ]) {
      const main = readSource(file);
      const globalAt = main.indexOf("import '../../src/styles/global.css'");
      const localAt = main.indexOf("import './style.css'");
      expect(globalAt, `${file} imports global.css`).toBeGreaterThanOrEqual(0);
      expect(localAt, `${file} imports ./style.css`).toBeGreaterThanOrEqual(0);
      expect(globalAt, `${file}: global.css must load before ./style.css`).toBeLessThan(localAt);
    }
  });
});

describe('Breakpoints + overflow safeguards', () => {
  it('breakpoints 320/360/390/400/480/600/768/960 are handled in code', () => {
    const combined = extensionSources()
      .map((f) => stripBlockComments(f.text))
      .join('\n');
    for (const bp of [320, 360, 390, 400, 480, 600, 768, 960]) {
      const pattern = new RegExp(
        `(max-width:\\s*${bp}px|min-width:\\s*${bp}px|max-\\[${bp}px\\]|min-\\[${bp}px\\])`,
      );
      expect(combined, `breakpoint ${bp}px handled`).toMatch(pattern);
    }
  });

  it('overflow safeguards exist: flex-wrap + min-width:0 + overflow-x:clip + max-width:100%', () => {
    const globalCss = readSource('src/styles/global.css');
    expect(globalCss).toContain('min-width: 0');
    expect(globalCss).toContain('max-width: 100%');
    expect(globalCss).toContain('overflow-x: clip');
    const editorCss = readSource('entrypoints/editor/style.css');
    expect(editorCss).toContain('flex-wrap');
    expect(editorCss).toContain('min-width: 0');
    expect(editorCss).toContain('overflow-x: clip');
  });
});

describe('Logo pinning', () => {
  it('editor header logo <img> pins to 32px (attrs + inline style + .ed-logo CSS)', () => {
    const editor = readSource('entrypoints/editor/Editor.tsx');
    const logoImg = imgTags(editor).find((tag) => tag.includes('logoSrc'));
    expect(logoImg, 'expected an <img> rendering logoSrc in Editor.tsx').toBeDefined();
    expect(pinsTo32(jsxAttr(logoImg!, 'width'), editor)).toBe(true);
    expect(pinsTo32(jsxAttr(logoImg!, 'height'), editor)).toBe(true);
    expect(pinsTo32(styleProp(logoImg!, 'maxWidth'), editor)).toBe(true);
    expect(pinsTo32(styleProp(logoImg!, 'maxHeight'), editor)).toBe(true);
    const css = readSource('entrypoints/editor/style.css');
    const logo = extractBlock(css, /\.ed-logo\s*\{/);
    for (const rule of ['width: 32px', 'height: 32px', 'max-width: 32px', 'max-height: 32px']) {
      expect(logo).toContain(rule);
    }
  });

  it('popup header logo <img> pins to 32px (attrs + inline style + .popup-header img CSS)', () => {
    const popup = readSource('entrypoints/popup/Popup.tsx');
    const logoImg =
      imgTags(popup).find((tag) => tag.includes('logo_alt')) ??
      imgTags(popup).find((tag) => /width=\{32\}/.test(tag));
    expect(logoImg, 'expected a 32px header logo <img> in Popup.tsx').toBeDefined();
    expect(pinsTo32(jsxAttr(logoImg!, 'width'), popup)).toBe(true);
    expect(pinsTo32(jsxAttr(logoImg!, 'height'), popup)).toBe(true);
    expect(pinsTo32(styleProp(logoImg!, 'maxWidth'), popup)).toBe(true);
    expect(pinsTo32(styleProp(logoImg!, 'maxHeight'), popup)).toBe(true);
    const css = readSource('entrypoints/popup/style.css');
    const headerImg = extractBlock(css, /\.popup-header img\s*\{/);
    for (const rule of ['width: 32px', 'height: 32px', 'max-width: 32px', 'max-height: 32px']) {
      expect(headerImg).toContain(rule);
    }
  });
});

describe('Manifest locale', () => {
  it('wxt.config.ts sets no default_locale (custom JSON i18n, no _locales/ subtree)', () => {
    // Match an actual `default_locale:` assignment — the file's explanatory
    // comment mentions the key name without setting it.
    expect(readSource('wxt.config.ts')).not.toMatch(/default_locale\s*:/);
  });

  it.skipIf(
    !existsSync(fileURLToPath(new URL('../../.output/chrome-mv3/manifest.json', import.meta.url))),
  )('built manifest has no default_locale (run npm run build first)', () => {
    const manifest = JSON.parse(
      readFileSync(
        fileURLToPath(new URL('../../.output/chrome-mv3/manifest.json', import.meta.url)),
        'utf8',
      ),
    ) as Record<string, unknown>;
    expect('default_locale' in manifest).toBe(false);
  });
});
