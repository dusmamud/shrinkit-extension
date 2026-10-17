/**
 * css-guard.test.ts — source-level guard for the dead-Tailwind bug.
 *
 * The extension once shipped with Tailwind utilities missing (no
 * `@tailwindcss/vite` plugin in wxt.config.ts) and the editor logo
 * rendering at its natural 1024px size (no width/height on the <img>).
 * Static gates (tsc / vitest / build) did NOT catch it, so these tests
 * read the source files directly and assert the hardening is present.
 *
 * Reads files with node:fs + path only — no DOM, no build output.
 * Companion runtime check over the built CSS: `npm run check:css`.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function readSource(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(`../../${relativePath}`, import.meta.url)), 'utf8');
}

/** All <img … /> tags in the source, so checks target the logo tag only. */
function imgTags(source: string): string[] {
  return source.match(/<img[\s\S]*?\/>/g) ?? [];
}

/**
 * True when a JSX size expression pins to 32px: either the literal `32`
 * or a named constant defined as 32 in the same file
 * (`const LOGO_SIZE = 32;` + `width={LOGO_SIZE}`).
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

describe('Logo / Tailwind hardening guard', () => {
  it('Logo.tsx pins the <img> size via attrs + inline style so it can never render at natural 1024px', () => {
    const logo = readSource('src/components/Logo.tsx');
    // Attribute pins (layout size even before CSS loads).
    expect(logo).toContain('width={size}');
    expect(logo).toContain('height={size}');
    // Inline-style pins (beat any stylesheet that would stretch the img).
    expect(logo).toMatch(/maxWidth:\s*size\b/);
    expect(logo).toMatch(/maxHeight:\s*size\b/);
    expect(logo).toMatch(/width:\s*size\b/);
    expect(logo).toMatch(/height:\s*size\b/);
    // Utility class keeps flex layout from stretching it.
    expect(logo).toContain('shrink-0');
    // Brand behavior unchanged.
    expect(logo).toContain('resolveIconUrl');
  });

  it('Editor.tsx header logo <img> pins to 32px via width/height attrs + maxWidth/maxHeight style', () => {
    const editor = readSource('entrypoints/editor/Editor.tsx');
    const logoImg = imgTags(editor).find((tag) => tag.includes('logoSrc'));
    expect(logoImg, 'expected an <img> rendering logoSrc in Editor.tsx').toBeDefined();
    // Literal `width={32}` or a named constant defined as 32 in the file
    // (`const LOGO_SIZE = 32` + `width={LOGO_SIZE}`) — both pin to 32px.
    expect(pinsTo32(jsxAttr(logoImg!, 'width'), editor)).toBe(true);
    expect(pinsTo32(jsxAttr(logoImg!, 'height'), editor)).toBe(true);
    expect(pinsTo32(styleProp(logoImg!, 'maxWidth'), editor)).toBe(true);
    expect(pinsTo32(styleProp(logoImg!, 'maxHeight'), editor)).toBe(true);
  });

  it('wxt.config.ts wires the @tailwindcss/vite plugin', () => {
    const config = readSource('wxt.config.ts');
    expect(config).toMatch(/import\s+\w+\s+from\s+['"]@tailwindcss\/vite['"]/);
    expect(config).toMatch(/plugins:\s*\[\s*tailwindcss\(\)/);
  });

  it('popup/main.tsx imports global.css so Tailwind utilities reach the popup', () => {
    const main = readSource('entrypoints/popup/main.tsx');
    expect(main).toMatch(/import\s+['"][^'"]*global\.css['"]/);
  });
});

/**
 * Responsive parity spot-checks (web-app targets). The full contract lives
 * in responsive-parity.test.ts; these four are the fast fail-fast subset
 * appended to the CSS guard so a container/token/breakpoint regression
 * trips the same file that already guards the logo / Tailwind wiring.
 */
function stripCssComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

describe('Responsive parity spot-checks (web-app targets)', () => {
  it('no 1100px container survives in Editor / MainResizer / Dropzone / editor shell CSS', () => {
    for (const file of [
      'entrypoints/editor/Editor.tsx',
      'src/components/MainResizer.tsx',
      'src/components/Dropzone.tsx',
      'entrypoints/editor/style.css',
    ]) {
      expect(stripCssComments(readSource(file)), `${file} must not contain 1100px`).not.toContain(
        '1100px',
      );
    }
  });

  it('popup root is 400px wide', () => {
    const css = readSource('entrypoints/popup/style.css');
    expect(css).toMatch(/\.popup-root\s*\{[^}]*width:\s*400px/);
  });

  it('global.css Light --t-accent is the web accent #016df0', () => {
    const css = readSource('src/styles/global.css');
    const rootBlock = css.match(/^:root\s*\{([^}]*)\}/m)?.[1] ?? '';
    expect(rootBlock).toMatch(/--t-accent:\s*#016df0\b/);
  });

  it('web breakpoints 360/400/480/600 are handled in extension CSS', () => {
    const combined = [
      readSource('src/styles/global.css'),
      readSource('entrypoints/editor/style.css'),
      readSource('entrypoints/popup/style.css'),
    ]
      .map(stripCssComments)
      .join('\n');
    for (const bp of [360, 400, 480, 600]) {
      expect(combined, `breakpoint ${bp}px handled`).toMatch(
        new RegExp(`(max-width:\\s*${bp}px|min-width:\\s*${bp}px)`),
      );
    }
  });
});
