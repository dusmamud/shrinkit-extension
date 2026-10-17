/**
 * check-tailwind.mjs — visual-regression guard for the dead-Tailwind bug.
 *
 * Background: the extension once shipped with Tailwind utilities missing
 * (wxt.config.ts had `vite: () => ({ plugins: [] })`, so no
 * `@tailwindcss/vite` plugin scanned sources for class usage). The built
 * CSS still contained Tailwind's theme-token layer (~22KB of `--color-*`
 * variables), so a bare byte-size check did NOT catch it — but zero
 * utility rules (`.flex`, `.min-h-screen`, …) were emitted, and the editor
 * logo rendered at its natural 1024px size.
 *
 * This script FAILS (exit 1) when any of these hold:
 *   1. No built CSS exists (run `npm run build` first).
 *   2. Total built CSS is suspiciously small (<= 20000 bytes).
 *   3. No Tailwind utility marker is present in the built CSS — i.e. the
 *      plugin is not generating utilities even though theme tokens exist.
 *   4. src/components/layout/Header.tsx's logo <img> lacks width={34}
 *      height={34}, so the header logo can blow up to natural size.
 *      (Web parity: the header brand icon renders at 34px; the popup
 *      keeps its own 32px pin, checked by check-responsive.mjs.)
 *
 * Usage: `npm run check:css` (must run AFTER `npm run build`).
 * No dependencies beyond node:fs / node:path / node:url.
 */
// Node CLI script: console output and process.exit are its entire purpose
// (PASS/FAIL lines + exit code).
/* eslint-disable no-console, no-undef */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS_DIR = path.join(ROOT, '.output', 'chrome-mv3', 'assets');
const HEADER_PATH = path.join(ROOT, 'src', 'components', 'layout', 'Header.tsx');

let failures = 0;
function pass(label, detail = '') {
  console.log(`PASS: ${label}${detail ? ` — ${detail}` : ''}`);
}
function fail(label, detail = '') {
  failures += 1;
  console.log(`FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
}

// --- 1. Built CSS must exist -------------------------------------------------
if (!existsSync(ASSETS_DIR)) {
  console.log('SKIP: .output/chrome-mv3/assets/ not found — run npm run build first.');
  console.log('FAIL: no built CSS to check (run npm run build first)');
  process.exit(1);
}
const cssFiles = readdirSync(ASSETS_DIR)
  .filter((f) => f.endsWith('.css'))
  .sort();
if (cssFiles.length === 0) {
  console.log('SKIP: no .css files in .output/chrome-mv3/assets/ — run npm run build first.');
  console.log('FAIL: no built CSS to check (run npm run build first)');
  process.exit(1);
}
const css = cssFiles.map((f) => readFileSync(path.join(ASSETS_DIR, f), 'utf8')).join('\n');
const totalBytes = Buffer.byteLength(css, 'utf8');
console.log(`INFO: checked ${cssFiles.length} built CSS file(s): ${cssFiles.join(', ')}`);

// --- 2. Total CSS bytes -------------------------------------------------------
// A real Tailwind v4 build is large; the dead build was ~2.2KB per entry
// CSS file (theme tokens alone still total ~27KB, so this check is
// necessary but NOT sufficient — the utility markers below are the real
// discriminator).
if (totalBytes > 20000) {
  pass('total built CSS bytes > 20000', `${totalBytes} bytes`);
} else {
  fail('total built CSS bytes > 20000', `only ${totalBytes} bytes`);
}

// --- 3. Tailwind utility markers ----------------------------------------------
// Each marker proves the plugin actually scanned sources and emitted a
// utility rule. The dead build had NONE of these (only `@layer theme`
// tokens). At least one must be present.
const markers = [
  {
    name: '.min-h-screen utility (min-height:100vh)',
    // Editor root uses className="min-h-screen …".
    test: /\.min-h-screen\{[^}]*min-height:\s*100vh/.test(css),
  },
  {
    name: '.flex utility (display:flex)',
    // Standalone `.flex{…}` rule. Anchored so `.popup-header{…display:flex}`
    // or `.flex-wrap{…}` from hand-written CSS cannot false-positive.
    test: /(?:^|[},])\.flex\{[^}]*display:\s*flex/.test(css),
  },
  // NOTE: a third marker for the old 1100px container was REMOVED here on
  // purpose. Naming that class-shaped string in this file made Tailwind's
  // scanner emit the 1100px utility into built CSS (self-perpetuating),
  // and 1100px is forbidden in the UI. The .min-h-screen + .flex markers
  // above are sufficient proof the plugin generates utilities.
];
const foundMarkers = markers.filter((m) => m.test);
for (const m of markers) {
  console.log(`${m.test ? 'PASS' : 'FAIL'}: utility marker ${m.name}`);
}
if (foundMarkers.length >= 1) {
  pass(
    'at least one Tailwind utility marker present',
    `${foundMarkers.length}/${markers.length} markers found`,
  );
} else {
  failures += 1;
  console.log(
    'FAIL: at least one Tailwind utility marker present — 0/2 markers found. ' +
      'Tailwind is dead: check that wxt.config.ts wires @tailwindcss/vite.',
  );
}

// --- 4. Header logo <img> must be size-pinned ---------------------------------
// The header lives in Header.tsx (not Editor.tsx): the shell renders
// <Header/>. Accepts the literal `width={34}` or a named constant defined
// as 34 in the same file (`const LOGO_SIZE = 34` + `width={LOGO_SIZE}`) —
// both pin the logo to 34px (web Header.astro parity); the old broken
// code had neither. The <img> also carries inline width/height/maxWidth/
// maxHeight 34 in style — checked by check-responsive.mjs.
function pinsTo34(expr, source) {
  if (expr === undefined) return false;
  const trimmed = expr.trim();
  if (trimmed === '34') return true;
  const name = trimmed.match(/^([A-Za-z_$][\w$]*)$/)?.[1];
  if (!name) return false;
  return new RegExp(`const\\s+${name}\\s*=\\s*34\\b`).test(source);
}

if (!existsSync(HEADER_PATH)) {
  fail(
    'Header.tsx logo img has width={34} height={34}',
    'src/components/layout/Header.tsx not found',
  );
} else {
  const header = readFileSync(HEADER_PATH, 'utf8');
  // The header logo <img> is the one rendering resolveIconUrl().
  const imgTags = header.match(/<img[\s\S]*?\/>/g) ?? [];
  const logoImg = imgTags.find((tag) => tag.includes('resolveIconUrl()'));
  if (!logoImg) {
    fail(
      'Header.tsx logo img has width={34} height={34}',
      'no <img> rendering resolveIconUrl() found',
    );
  } else {
    const widthExpr = logoImg.match(/width=\{([^}]+)\}/)?.[1];
    const heightExpr = logoImg.match(/height=\{([^}]+)\}/)?.[1];
    const hasWidth = pinsTo34(widthExpr, header);
    const hasHeight = pinsTo34(heightExpr, header);
    if (hasWidth && hasHeight) {
      pass('Header.tsx logo img has width={34} height={34}');
    } else {
      fail(
        'Header.tsx logo img has width={34} height={34}',
        `found <img> with width pinned to 34: ${hasWidth}, height pinned to 34: ${hasHeight}`,
      );
    }
  }
}

// --- Summary -------------------------------------------------------------------
if (failures > 0) {
  console.log(`RESULT: FAIL (${failures} check(s) failed)`);
  process.exit(1);
}
console.log('RESULT: PASS (all checks passed)');
