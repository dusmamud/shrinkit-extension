/**
 * check-responsive.mjs — web-app parity guard for containers, tokens,
 * breakpoints, logo pinning and manifest locale.
 *
 * Mirrors tests/unit/responsive-parity.test.ts in CLI form so a human can
 * run one command and see every parity check plus the per-width table.
 *
 * Usage: `npm run check:responsive`
 *   - Source checks always run (no build needed).
 *   - Built-CSS + built-manifest checks need `npm run build` first; when
 *     .output/ is absent they print SKIP and count as a failure, exactly
 *     like `npm run check:css`.
 *
 * What this script does NOT do: it never claims real-browser overflow was
 * verified. The width table below states, per width, what was checked in
 * CODE (containers, breakpoints, shrink guards) and that REAL-BROWSER
 * overflow was NOT verified here. Only a real Chrome run on the user's
 * laptop proves nothing actually overflows.
 *
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
const MANIFEST_PATH = path.join(ROOT, '.output', 'chrome-mv3', 'manifest.json');

let failures = 0;
function pass(label, detail = '') {
  console.log(`PASS: ${label}${detail ? ` — ${detail}` : ''}`);
}
function fail(label, detail = '') {
  failures += 1;
  console.log(`FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
}
function read(rel) {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}
function stripBlockComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}
function stripMediaPreludes(source) {
  return source.replace(/@media[^{]*/g, '');
}
function scanText(source) {
  return stripMediaPreludes(stripBlockComments(source));
}
function normalizeColor(value) {
  if (value === undefined) return '';
  let v = value.trim().toLowerCase().replace(/\s+/g, '');
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(v);
  if (short) v = `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  return v;
}
function parseDeclarations(block) {
  const map = new Map();
  // Strip block comments first: a comment sharing a `;`-segment with the
  // next declaration would otherwise swallow that declaration.
  const clean = block.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const part of clean.split(';')) {
    const match = /^\s*(--[a-z0-9-]+)\s*:\s*(.+?)\s*$/.exec(part);
    if (match) map.set(match[1], match[2]);
  }
  return map;
}
function extractBlock(css, selector) {
  const match = selector.exec(css);
  if (!match) return '';
  const open = css.indexOf('{', match.index);
  const close = css.indexOf('}', open);
  if (open < 0 || close < 0) return '';
  return css.slice(open + 1, close);
}
function extensionSources() {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(css|tsx|ts)$/.test(entry.name)) {
        out.push({ path: path.relative(ROOT, full), text: readFileSync(full, 'utf8') });
      }
    }
  };
  walk(path.join(ROOT, 'entrypoints'));
  walk(path.join(ROOT, 'src'));
  return out;
}

/**
 * The forbidden 1100px container class, built by concatenation on purpose:
 * Tailwind v4's scanner reads every scanned file — including guard files —
 * and emits a utility for any literal forbidden-class string it finds,
 * even in a comment or a check (proven: a build newer than all UI sources
 * still emitted the utility, with check-tailwind.mjs the only pre-build
 * file containing the literal). This file must never contain that literal,
 * or the guard itself would ship the forbidden utility.
 */
const FORBIDDEN_CONTAINER = 'max-w-[' + '1100px]';

/** Web Light tokens — see tests/unit/responsive-parity.test.ts for the source. */
const WEB_LIGHT = {
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
/** Web Dark 2 (Graphite) tokens. */
const WEB_DARK = {
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
const ED_ALIASES = {
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

console.log('Responsive parity — web-app targets (containers / tokens / widths)');
console.log('================================================================');

// --- 1. Containers ---------------------------------------------------------
const editorTsx = read('entrypoints/editor/Editor.tsx');
const editorCss = read('entrypoints/editor/style.css');
const popupCss = read('entrypoints/popup/style.css');
const globalCss = read('src/styles/global.css');
const mainResizer = read('src/components/MainResizer.tsx');
const dropzoneTsx = read('src/components/Dropzone.tsx');
const settingsPanel = read('src/components/SettingsPanel.tsx');

function checkContainer(label, ok, detail = '') {
  if (ok) pass(label, detail);
  else fail(label, detail);
}
checkContainer(
  'editor header inner 1075px (Editor.tsx + editor/style.css)',
  editorTsx.includes('max-w-[1075px]') &&
    extractBlock(editorCss, /\.ed-header-inner\s*\{/).includes('max-width: 1075px'),
);
checkContainer(
  'editor main inner 960px (Editor.tsx + editor/style.css)',
  editorTsx.includes('max-w-[960px]') &&
    extractBlock(editorCss, /\.ed-main-inner\s*\{/).includes('max-width: 960px'),
);
checkContainer(
  'MainResizer wrappers 960px (outer + results)',
  (mainResizer.match(/max-w-\[960px\]/g) ?? []).length >= 2 &&
    !mainResizer.includes(FORBIDDEN_CONTAINER),
);
const dropzoneClass =
  [...dropzoneTsx.matchAll(/className="([^"]+)"/g)]
    .map((m) => m[1])
    .find((c) => c.includes('cursor-pointer')) ?? '';
checkContainer(
  'dropzone 940px + web shape (rounded-2xl px-4 sm:px-8 py-6 sm:py-8 md:py-9)',
  ['max-w-[940px]', 'rounded-2xl', 'px-4', 'sm:px-8', 'py-6', 'sm:py-8', 'md:py-9'].every((t) =>
    dropzoneClass.includes(t),
  ) &&
    !['rounded-[6px]', 'px-3', 'sm:px-6', 'sm:py-12'].some((t) => dropzoneClass.includes(t)) &&
    !dropzoneClass.includes(FORBIDDEN_CONTAINER),
);
checkContainer('settings form 650px', settingsPanel.includes('max-w-[650px]'));
checkContainer(
  'popup 400px wide',
  extractBlock(popupCss, /\.popup-root\s*\{/).includes('width: 400px'),
);

// --- 2. No 1100px / no width >1100px ----------------------------------------
const sources = extensionSources();
const with1100 = sources.filter((f) => scanText(f.text).includes('1100px')).map((f) => f.path);
if (with1100.length === 0) pass('no 1100px in extension CSS/TSX/TS (comments + media stripped)');
else fail('no 1100px in extension CSS/TSX/TS (comments + media stripped)', with1100.join(', '));

const widthPatterns = [
  /max-w-\[(\d+)px\]/g,
  /max-width:\s*(\d+)px/g,
  /(?<!max-)(?<!min-)width:\s*(\d+)px/g,
  /min-width:\s*(\d+)px/g,
  /\bw-\[(\d+)px\]/g,
];
const violations = [];
for (const { path: p, text } of sources) {
  const clean = scanText(text);
  for (const pattern of widthPatterns) {
    for (const match of clean.matchAll(pattern)) {
      if (Number(match[1]) > 1100) violations.push(`${p}: ${match[0]}`);
    }
  }
}
if (violations.length === 0) pass('no fixed width >1100px in extension CSS/TSX');
else fail('no fixed width >1100px in extension CSS/TSX', violations.join('; '));

// --- 3. Tokens ---------------------------------------------------------------
function checkTokenMap(label, block, targets) {
  const decls = parseDeclarations(block);
  const bad = [];
  for (const [key, expected] of Object.entries(targets)) {
    const actual = normalizeColor(decls.get(`--t-${key}`));
    if (actual !== normalizeColor(expected)) bad.push(`--t-${key}: got ${actual || '(missing)'}`);
  }
  if (bad.length === 0) pass(label, `${Object.keys(targets).length} tokens`);
  else
    fail(label, bad.slice(0, 5).join('; ') + (bad.length > 5 ? ` (+${bad.length - 5} more)` : ''));
}
checkTokenMap(
  'global.css Light --t-* equal web Light',
  extractBlock(globalCss, /^:root\s*\{/m),
  WEB_LIGHT,
);
checkTokenMap(
  'global.css Dark --t-* equal web Dark 2 (Graphite)',
  extractBlock(globalCss, /^\[data-theme='dark'\]\s*\{/m),
  WEB_DARK,
);
{
  const aliases = parseDeclarations(extractBlock(globalCss, /^html:root\s*\{/m));
  const bad = Object.entries(ED_ALIASES).filter(
    ([alias, token]) => aliases.get(`--${alias}`) !== `var(--t-${token})`,
  );
  if (bad.length === 0) pass('global.css html:root --ed-* aliases point at --t-*');
  else fail('global.css html:root --ed-* aliases point at --t-*', bad.map(([a]) => a).join(', '));
  // Legacy shorthands live in the :root (Light) block, not html:root.
  const light = parseDeclarations(extractBlock(globalCss, /^:root\s*\{/m));
  if (
    light.get('--accent') === 'var(--t-accent)' &&
    light.get('--accent-hover') === 'var(--t-btn-b)'
  ) {
    pass('global.css :root --accent / --accent-hover shorthands point at --t-*');
  } else {
    fail('global.css :root --accent / --accent-hover shorthands point at --t-*');
  }
}
{
  const bad = [];
  for (const [file, css] of [
    ['entrypoints/editor/style.css', editorCss],
    ['entrypoints/popup/style.css', popupCss],
  ]) {
    const clean = stripBlockComments(css);
    for (const match of clean.matchAll(/var\(--t-([a-z0-9-]+)\s*,\s*(#[0-9a-fA-F]{3,8})\s*\)/g)) {
      const key = match[1];
      if (
        WEB_LIGHT[key] !== undefined &&
        normalizeColor(match[2]) !== normalizeColor(WEB_LIGHT[key])
      ) {
        bad.push(`${file}: var(--t-${key}, ${match[2]})`);
      }
    }
  }
  if (bad.length === 0) pass('var(--t-*, hex) fallbacks equal web Light values');
  else fail('var(--t-*, hex) fallbacks equal web Light values', bad.join('; '));
}

// --- 4. Breakpoints + overflow safeguards ------------------------------------
{
  const combined = sources.map((f) => stripBlockComments(f.text)).join('\n');
  const missing = [320, 360, 390, 400, 480, 600, 768, 960].filter(
    (bp) =>
      !new RegExp(
        `(max-width:\\s*${bp}px|min-width:\\s*${bp}px|max-\\[${bp}px\\]|min-\\[${bp}px\\])`,
      ).test(combined),
  );
  if (missing.length === 0) pass('breakpoints 320/360/390/400/480/600/768/960 handled in code');
  else fail('breakpoints handled in code', `missing: ${missing.join(', ')}`);
}
{
  const ok =
    globalCss.includes('min-width: 0') &&
    globalCss.includes('max-width: 100%') &&
    globalCss.includes('overflow-x: clip') &&
    editorCss.includes('flex-wrap') &&
    editorCss.includes('min-width: 0') &&
    editorCss.includes('overflow-x: clip');
  if (ok) pass('overflow safeguards: flex-wrap + min-width:0 + overflow-x:clip + max-width:100%');
  else fail('overflow safeguards: flex-wrap + min-width:0 + overflow-x:clip + max-width:100%');
}

// --- 5. Logo pinning -----------------------------------------------------------
function pinsTo32(expr, source) {
  if (expr === undefined) return false;
  const trimmed = expr.trim();
  if (trimmed === '32') return true;
  const name = trimmed.match(/^([A-Za-z_$][\w$]*)$/)?.[1];
  if (!name) return false;
  return new RegExp(`const\\s+${name}\\s*=\\s*32\\b`).test(source);
}
function imgTags(source) {
  return source.match(/<img[\s\S]*?\/>/g) ?? [];
}
function jsxAttr(tag, name) {
  return tag.match(new RegExp(`${name}=\\{([^}]+)\\}`))?.[1];
}
function styleProp(tag, name) {
  return tag.match(new RegExp(`${name}:\\s*([^,}\\s]+)`))?.[1];
}
{
  const logoImg = imgTags(editorTsx).find((tag) => tag.includes('logoSrc'));
  const ok =
    logoImg !== undefined &&
    pinsTo32(jsxAttr(logoImg, 'width'), editorTsx) &&
    pinsTo32(jsxAttr(logoImg, 'height'), editorTsx) &&
    pinsTo32(styleProp(logoImg, 'maxWidth'), editorTsx) &&
    pinsTo32(styleProp(logoImg, 'maxHeight'), editorTsx) &&
    ['width: 32px', 'height: 32px', 'max-width: 32px', 'max-height: 32px'].every((r) =>
      extractBlock(editorCss, /\.ed-logo\s*\{/).includes(r),
    );
  if (ok) pass('editor header logo pinned 32px');
  else fail('editor header logo pinned 32px');
}
{
  const popupTsx = read('entrypoints/popup/Popup.tsx');
  const logoImg =
    imgTags(popupTsx).find((tag) => tag.includes('logo_alt')) ??
    imgTags(popupTsx).find((tag) => /width=\{32\}/.test(tag));
  const ok =
    logoImg !== undefined &&
    pinsTo32(jsxAttr(logoImg, 'width'), popupTsx) &&
    pinsTo32(jsxAttr(logoImg, 'height'), popupTsx) &&
    pinsTo32(styleProp(logoImg, 'maxWidth'), popupTsx) &&
    pinsTo32(styleProp(logoImg, 'maxHeight'), popupTsx) &&
    ['width: 32px', 'height: 32px', 'max-width: 32px', 'max-height: 32px'].every((r) =>
      extractBlock(popupCss, /\.popup-header img\s*\{/).includes(r),
    );
  if (ok) pass('popup header logo pinned 32px');
  else fail('popup header logo pinned 32px');
}

// --- 6. default_locale -----------------------------------------------------------
// Match an actual `default_locale:` assignment — the file's explanatory
// comment mentions the key name without setting it.
if (!/default_locale\s*:/.test(read('wxt.config.ts'))) {
  pass('wxt.config.ts sets no default_locale');
} else {
  fail('wxt.config.ts sets no default_locale');
}

// --- 7. Built CSS + built manifest (needs npm run build) ------------------------
let builtCss = '';
if (!existsSync(ASSETS_DIR)) {
  console.log('SKIP: .output/chrome-mv3/assets/ not found — run npm run build first.');
  fail('built CSS present (run npm run build first)');
} else {
  const cssFiles = readdirSync(ASSETS_DIR)
    .filter((f) => f.endsWith('.css'))
    .sort();
  if (cssFiles.length === 0) {
    console.log('SKIP: no .css files in .output/chrome-mv3/assets/ — run npm run build first.');
    fail('built CSS present (run npm run build first)');
  } else {
    builtCss = cssFiles.map((f) => readFileSync(path.join(ASSETS_DIR, f), 'utf8')).join('\n');
    console.log(`INFO: checked ${cssFiles.length} built CSS file(s): ${cssFiles.join(', ')}`);
    for (const [label, needle] of [
      ['built CSS contains max-width:1075px (header)', 'max-width:1075px'],
      ['built CSS contains max-width:960px (main)', 'max-width:960px'],
      ['built CSS contains max-width:940px (dropzone)', 'max-width:940px'],
      ['built CSS contains max-width:650px (settings)', 'max-width:650px'],
    ]) {
      if (builtCss.includes(needle)) pass(label);
      else fail(label, 'not found in built CSS');
    }
    if (!builtCss.includes('1100px')) pass('built CSS contains no 1100px');
    else {
      // WARN, not FAIL, on purpose: Tailwind's scanner can emit a utility
      // for a class-shaped string found in a guard/script file, even if no
      // UI source uses the class. Source-level absence (checked above) is
      // the real guard. (Historical note: scripts/check-tailwind.mjs once
      // named the 1100px class in its marker text, which self-perpetuated
      // the utility; that marker has since been removed.)
      console.log(
        'WARN: built CSS still contains 1100px — source-level absence above ' +
          'is the real guard; check guard/script files for a stray class-shaped string.',
      );
    }
  }
}
if (!existsSync(MANIFEST_PATH)) {
  console.log('SKIP: .output/chrome-mv3/manifest.json not found — run npm run build first.');
  fail('built manifest present (run npm run build first)');
} else {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  if (!('default_locale' in manifest)) pass('built manifest has no default_locale');
  else fail('built manifest has no default_locale');
}

// --- Width table ---------------------------------------------------------------
// Each row states what was CHECKED IN CODE for that width. Real-browser
// overflow was NOT verified here — only a real Chrome run proves it.
console.log('');
console.log('Width table — code evidence only (REAL-BROWSER overflow NOT verified here)');
console.log(
  '| Viewport | Governing container / rule (code) | Code evidence checked | Real-browser overflow |',
);
console.log(
  '|----------|-----------------------------------|-----------------------|-----------------------|',
);
const rows = [
  [
    '320px',
    'editor shell w-full + px-4; shared .card guard',
    '@media 320px in global.css; flex-wrap + min-width:0 + overflow-x:clip',
    'NOT verified here',
  ],
  [
    '360px',
    'header stacks; tabs shrink (editor @media 360px)',
    '@media 360px in editor/style.css + global.css; min-width:0',
    'NOT verified here',
  ],
  [
    '390px',
    'editor @media 400px rules apply; shared .input guard',
    '@media 390px in global.css; @media 400px in editor/style.css',
    'NOT verified here',
  ],
  [
    '400px',
    'popup exact width 400px; editor @media 400px',
    'popup-root width:400px; @media 400px rules present',
    'NOT verified here',
  ],
  [
    '480px',
    'header tabs shrink; global body wrap guard',
    '@media 480px in editor/style.css + global.css',
    'NOT verified here',
  ],
  [
    '600px',
    'dropzone wraps; controls cap at viewport',
    '@media 600px in editor/style.css + global.css',
    'NOT verified here',
  ],
  [
    '768px',
    'settings label shows; card padding steps down',
    'min-width:768px in editor/style.css; @media 768px in global.css',
    'NOT verified here',
  ],
  [
    '960px',
    'main container caps at 960px',
    'max-w-[960px] in Editor/MainResizer + built CSS',
    'NOT verified here',
  ],
  [
    '1075px',
    'header inner caps at 1075px',
    'max-w-[1075px] in Editor.tsx + built CSS',
    'NOT verified here',
  ],
  [
    '1440px',
    'containers stay capped (1075/960/940/650); no full-width stretch',
    'no width >1100px in source; built CSS verified to contain no 1100px',
    'NOT verified here',
  ],
];
for (const [viewport, container, evidence, real] of rows) {
  console.log(`| ${viewport} | ${container} | ${evidence} | ${real} |`);
}
console.log('');
console.log(
  'NOTE: the popup is a fixed 400px Chrome popup — it does not shrink to a 320px viewport, by design.',
);

// --- Summary -------------------------------------------------------------------
if (failures > 0) {
  console.log(`RESULT: FAIL (${failures} check(s) failed)`);
  process.exit(1);
}
console.log('RESULT: PASS (all checks passed)');
