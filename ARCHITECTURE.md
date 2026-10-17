# Architecture — ShrinkIt Chrome Extension

This document describes how the ShrinkIt extension is put together: its entrypoints, the image engine, internationalisation and settings, the shared tool definitions, and the message protocol that carries a right-clicked image into the editor.

Stack: **WXT + React 19 + TypeScript (strict) + Tailwind CSS v4**, Manifest V3 (`chrome` extension API). All image processing is 100% local, on-device. There is no backend, no network call for processing, and no analytics.

## Entrypoints

All entrypoints live under `entrypoints/`. WXT builds each one into the MV3 bundle.

| Entrypoint    | What it is                                    | What it does                                                                                                                                                                                                                                                                                                                                    |
| ------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `popup/`      | Toolbar popup (React)                         | Quick resize: 1–5 images, preset picker, Resize + Download, and a Full Editor button. Closes when it loses focus, so it stays small and single-purpose.                                                                                                                                                                                         |
| `editor/`     | Full Editor page (React, opened in a new tab) | Multi-page app with hash routing (`editor.html#/route`, see [docs/ROUTING.md](docs/ROUTING.md)): Home (hero tool + HowItWorks + InfoSections), Resize, Tools hub, 5 tool pages (one tool each), About, Contact, Privacy, Terms, 404 — all sharing the Header/Footer layout. Main resizer batch up to 50 images, download (single files or ZIP). |
| `background/` | Service worker (plain TypeScript, no React)   | Owns the context menu (“Resize with ShrinkIt”), receives right-click events, and routes the clicked image into the editor via the offscreen document and session storage.                                                                                                                                                                       |
| `options/`    | Options page (React)                          | Settings UI: language, theme, defaults. Reads/writes the same settings store as the popup and editor.                                                                                                                                                                                                                                           |
| `offscreen/`  | Offscreen document                            | Fetches the bytes of a right-clicked image and hands them to the editor flow. Exists because MV3 service workers have no DOM or Canvas, so they cannot fetch-then-decode an image themselves.                                                                                                                                                   |
| `content/`    | Content script                                | Page-side support for the right-click flow: helps identify the image the user clicked so the background worker can resolve it to a URL.                                                                                                                                                                                                         |

Rules:

- The service worker (`background/`) is plain TypeScript — no React, no DOM. It only coordinates: menus, routing, storage.
- All DOM/Canvas image work happens in `popup/`, `editor/`, or `offscreen/` — never in the service worker.
- The popup and the editor share the same image engine (`src/lib/`) and the same tool definitions (`src/tools/`), so a resize behaves identically in both.

## Multi-page app — hash router, layout, pages

The editor is a multi-page app, not a single page with tabs. One built
file (`editor.html`) serves every route; the route is the URL fragment.
Full scheme, route table, and the query-before-hash rule live in
[docs/ROUTING.md](docs/ROUTING.md). This section states the architecture
the router implements.

### Router

- **Route source:** `window.location.hash` (`#/`, `#/tools`, …). The
  router renders the matching page component on initial load and on
  every `hashchange`. Navigation never reloads the page.
- **Default:** empty / missing hash renders `#/` (Home).
- **Unknown hash → 404 page**, never a blank page, never a crash.
- **Query is separate:** handoff parameters (`?src=…&key=…`,
  `?src=error&reason=…`) live in `window.location.search`, before the
  hash, and are read once on the initial load. The router never reads
  query parameters out of the fragment.
- **Legacy `?tool=`:** the previous build's `?tool=<tab-slug>` links map
  to their hash route when no hash is present. New code must not
  generate `?tool=` links.
- **No path routing, no `pushState` to a path.** Extension pages are
  files under `chrome-extension://`; a path-style URL is a missing
  file. Internal links are hash links only.
- **Per-route side effects:** scroll-to-top on every route change;
  localised `document.title` per page.

### Layout — shared Header / Footer

Every editor page renders the same layout shell:

- **Header** (ported from web `Header`): logo pinned 34px (web
  parity) + site name, primary nav — Resize (`#/`), Tools (`#/tools`),
  How it works (`#/#how-it-works`, anchor on Home), Privacy
  (`#/privacy`), Contact (`#/contact`) — with the current route marked
  active, language switcher, theme switcher. About is reached via the
  Footer. Header inner width 1075px.
- **Footer** (ported from web `Footer`): product / tools / legal link
  columns (including About, Terms, Contact) + copyright bar. Footer
  brand mark pinned 30px. All links are plain hash `href`s — no
  `onClick` routing.
- **Anchor suffix:** `#/#how-it-works` is route `/` scrolled to the
  `how-it-works` element; the router splits the hash on the second `#`
  and scrolls to the anchor instead of to the top.
- **Exception:** `#/resize` renders the minimal footer (copyright bar
  only), matching web `/resize`.
- **Main content** is the only part that changes between routes.

### Pages

| Page                 | Route                          | Content                                                      |
| -------------------- | ------------------------------ | ------------------------------------------------------------ |
| Home                 | `#/`                           | Hero + main resizer + HowItWorks + InfoSections + tools grid |
| Resize               | `#/resize`                     | Main resizer, standalone page, minimal footer                |
| Tools hub            | `#/tools`                      | Links to the five tool pages                                 |
| Compress to 50 KB    | `#/tools/compress-to-50kb`     | Target-size tool, 50 KB                                      |
| Compress to 20 KB    | `#/tools/compress-to-20kb`     | Target-size tool, 20 KB                                      |
| Passport Photo Maker | `#/tools/passport-photo-maker` | Passport tool                                                |
| Social Media Resizer | `#/tools/social-media-resizer` | Social tool                                                  |
| Compare Images       | `#/tools/compare-images`       | Compare tool                                                 |
| About                | `#/about`                      | About page                                                   |
| Contact              | `#/contact`                    | Contact page                                                 |
| Privacy              | `#/privacy`                    | Privacy page                                                 |
| Terms                | `#/terms`                      | Terms page                                                   |
| Not found            | any other hash                 | 404 page + link back Home                                    |

Page components live under `src/pages/` (tool pages in
`src/pages/tools/`), named `*Page.tsx` (`HomePage.tsx`,
`ToolsHubPage.tsx`, …). Home sections live in `src/components/home/`,
Header/Footer in `src/components/layout/`. Each tool page renders one tool in
full — the tool components in `src/tools/` are reused unchanged; they
are definitions + UI, not pages. The popup and Options page are separate
entrypoints, not router pages (see [docs/ROUTING.md](docs/ROUTING.md)).

### Invariants (must hold after every change)

- **Tailwind wired:** Tailwind's Vite plugin stays in `wxt.config.ts`,
  and every entrypoint imports `global.css` before its own stylesheet.
  `npm run check:css` must pass on the built CSS.
- **Logo pinning:** editor Header brand logo pinned 34px (web
  parity), popup logo 32px, footer brand mark 30px — each via
  width/height attributes + inline style + CSS, never utilities alone.
  Note: the pre-rebuild parity invariant said 32px for the editor
  header; the landed Header uses the web's 34px. The coordinator
  decides whether 34px stands or 32px is restored — the docs record
  the landed 34px.
- **Formats gate:** every upload/filter path uses the single shared
  `isSupportedInputFile` check (extension-based), never an ad-hoc
  `file.type` prefix check. Input JPG/JPEG/PNG/GIF/WebP/BMP/AVIF;
  output JPG/PNG/WebP/GIF; SVG rejected everywhere.
- **Right-click slugs:** background, editor, and popup agree on the
  URL contract — right-click opens
  `editor.html?src=rightclick&key=<key>#/`; errors open
  `editor.html?src=error&reason=<code>#/`; `SHRINKIT_OPEN_EDITOR`
  opens `editor.html#/`. Query always before the hash.
- **`default_locale` absent:** the manifest must not set
  `default_locale` — the extension uses custom JSON i18n
  (`src/i18n/messages/en|es|pt.json`), not `chrome.i18n`, and there is
  no `_locales/` subtree.
- **Tokens byte-identical:** the 59 `--t-*` values in Light plus the 59
  in Dark 2 (Graphite) in `src/styles/global.css` match the web app
  exactly. `--ed-*` / `--accent` names are aliases onto `--t-*`, never
  a second source of truth.
- **Containers:** editor header inner 1075px, editor main wrapper
  960px, dropzone 940px, settings form 650px, popup 400px wide. No
  container wider than the 1075px header cap.
- **Routing:** no path-style editor URL, no `pushState` to a path, no
  tab-slug routes. Unknown hashes render the 404 page.
- **No hardcoded user-visible strings:** every user-visible string
  goes through `t()` (en / es / pt). No `TODO` / `FIXME` / `console.*`
  in `entrypoints/`, `src/`, `tests/`.

## Image engine — `src/lib/`

The image engine is the only place that touches pixels. UI code calls into it; it never calls out to the UI.

Pipeline for every output image:

```
decode -> resize (pica) -> encode -> DPI metadata
```

1. **Decode** — The input file (or fetched image bytes) is decoded to a bitmap (Canvas / `ImageBitmap`). EXIF orientation is honoured so photos from phones come out upright.
2. **Resize (pica)** — Resizing is done with [pica](https://github.com/nodeca/pica), a high-quality Lanczos resampler that runs off the main thread where possible. This is the same resampling approach used by the ShrinkIt web app. Width/height, percentage, and target-size modes all funnel through this one step.
3. **Encode** — The resized bitmap is encoded to the user's chosen output format (JPEG / PNG / WebP, per the tool's options) at the chosen quality. Target-size tools (50 KB, 20 KB) loop: encode, measure, adjust quality/dimensions, re-encode — until the output fits the target or the loop reaches its quality floor.
4. **DPI metadata** — Where a tool needs it (e.g. passport photos), DPI metadata is written into the encoded output so the file carries the correct print density, not just pixel dimensions.

Supporting concerns in `src/lib/`:

- **Format handling** — JPEG/PNG/WebP encode paths; GIF input decoded to a still frame (the extension resizes still images, it does not re-encode animations).
- **EXIF** — Orientation honoured on decode; DPI written on encode where required. No other EXIF is preserved or transmitted.
- **Batch + ZIP** — The editor processes each image through the same pipeline independently, then offers individual downloads or a single ZIP (via JSZip) for the batch.
- **Errors** — Unsupported or corrupt files produce a readable, localised error message naming the file. No error data leaves the device.

## Tools — `src/tools/`

`src/tools/` holds the six tool definitions shared by the popup and the editor:

1. **Main** — resize by dimensions / percentage / target file size, format + quality.
2. **Compress to 50 KB** — iterative encode loop targeting ≤ 50 KB.
3. **Compress to 20 KB** — iterative encode loop targeting ≤ 20 KB.
4. **Passport Photo Maker** — fixed passport dimensions + DPI.
5. **Social Media Resizer** — preset dimensions for common social formats.
6. **Compare Images** — original vs. resized, side by side, so the user can judge quality before downloading.

Each tool is a definition (its inputs, defaults, constraints, and which engine options it sets) plus its UI. The popup exposes a small subset (quick resize presets); the editor exposes all six in full — the main resizer on Home (`#/`) and `#/resize`, the other five each on their own tool page. Tool logic is never duplicated between popup and editor — both import from `src/tools/`.

## i18n — `src/lib/i18n` + `src/i18n/`

- Languages: **English (en), Spanish (es), Portuguese (pt)**. English is the fallback: any missing key renders in English, never a raw key.
- Message catalogs live in `src/i18n/` (one catalog per language). UI code references keys, never literal strings.
- **No hardcoded English** (or any language) in UI code — every user-visible string goes through the i18n lookup. This is enforced by code review (see [CONTRIBUTING.md](CONTRIBUTING.md)).
- The user's language choice is a synced setting (see below). Changing it in Options applies everywhere (popup, editor, options) without reload gymnastics.

## Settings — `src/lib/` settings + `chrome.storage.sync`

Settings are small JSON only: language, theme, and per-tool defaults. They are stored with `chrome.storage.sync` so they follow the user across their Chrome browsers.

Constraints the code respects:

- **Sync quotas are small.** `chrome.storage.sync` enforces small per-item and total quotas, so settings must stay tiny plain JSON (strings, numbers, booleans). Nothing large ever goes here.
- **Never images.** Image bytes, data URLs, and blobs are never written to `storage.sync` (or to any `chrome.storage` area). Images live only in memory and in `chrome.storage.session` for the short right-click handoff described below.
- **Defaults** — On first run, defaults apply (English, system/light theme, standard quality). A corrupt or missing settings object falls back to defaults rather than breaking the UI.
- **Single store** — Popup, editor, and options all read/write through the same settings module in `src/lib/`, so there is exactly one source of truth.

## Message protocol — right-click flow

Right-clicking an image has to move image bytes from an arbitrary web page into the editor. MV3 forbids the straightforward path (the service worker cannot use DOM/Canvas), so the handoff is split across four actors and one short-lived store:

```
User right-clicks an image
  -> content script identifies the clicked image (page side)
  -> background service worker receives the context-menu click (URL + page info)
  -> background asks the offscreen document to fetch the image bytes
       (offscreen has DOM/fetch; this also bypasses page CORS blocks,
        because the fetch happens in extension context, not page context)
  -> offscreen returns the bytes to background
  -> background writes the bytes to chrome.storage.session
       (session storage: in-memory, cleared when the browser session ends,
        never synced, never persisted to disk by the extension)
  -> background opens the Full Editor in a new tab (chrome.tabs) at
     `editor.html?src=rightclick&key=<key>#/` (query before the hash;
     see [docs/ROUTING.md](docs/ROUTING.md))
  -> editor reads the bytes from chrome.storage.session, decodes them,
       and presents the image ready to resize
  -> editor clears the session entry once consumed
```

Rules for this protocol:

- `chrome.storage.session` is a **handoff buffer only**: one image (or one small set of images from one click), consumed by the editor, then cleared. It is never a cache and never holds user data long-term.
- The background worker never inspects pixel data — it only passes bytes through.
- If any step fails (fetch blocked, session read empty, editor closed before consuming), the editor shows a readable, localised error and the flow stops. No partial or stale image is ever shown as if it were the clicked one.
- The same editor also accepts images the user picks directly (file picker / drag-and-drop) — the session handoff is only one input path, not a dependency.

## Data flow diagram (text)

```
┌──────────────┐   pick / drop files    ┌──────────────────┐
│  Popup       │ ──────────────────────▶│  Image engine    │
│  (1–5 imgs)  │   decode→pica→encode   │  src/lib/        │
└──────────────┘   + DPI                 │  (shared)        │
        │                                └────────┬─────────┘
        │ Full Editor button                      │ outputs
        ▼                                         ▼
┌──────────────┐   pick / drop / right-click    ┌──────────────────┐
│  Editor      │ ──────────────────────────────▶│  Downloads / ZIP │
│  (6 tools,   │   (session handoff for          │  (user's folder) │
│   batch 50)  │    right-clicked images)        └──────────────────┘
└──────────────┘
        ▲
        │ context menu click
┌──────────────┐   fetch bytes    ┌──────────────────┐
│  Background  │ ───────────────▶│  Offscreen doc   │
│  (service    │ ◀───────────────│  (fetch + return)│
│   worker)    │   bytes          └──────────────────┘
└──────────────┘
        │  session handoff (chrome.storage.session)
        │  new tab (chrome.tabs)
        ▼
   Editor (above)

┌──────────────┐   settings JSON only   ┌──────────────────┐
│  Options /   │ ◀─────────────────────▶│ chrome.storage   │
│  Popup /     │   (sync, tiny, never   │ .sync            │
│  Editor      │    images)              └──────────────────┘
└──────────────┘

i18n catalogs (src/i18n/: en / es / pt) serve every UI surface.
```

## Why WXT + MV3

- **Manifest V3 is required** for new Chrome Web Store submissions. MV2 is deprecated and cannot be listed.
- **WXT** is the standard build tooling for MV3 extensions: it generates the manifest, bundles each entrypoint, handles the dev server with hot reload, and produces the Store-ready `.zip` (`npm run zip`). Hand-rolling the manifest and bundling would re-implement what WXT already does correctly.
- **React + TypeScript** match the ShrinkIt web app's stack, so components, tool logic, and i18n patterns carry over directly instead of being rewritten in a second style.
- **No background page** — MV3 replaces persistent background pages with an event-driven service worker. That is why the offscreen document exists (see the right-click protocol above): DOM/Canvas work that used to live in a background page now lives in the offscreen document.

## What this extension never does

- No network requests for processing, analytics, or tracking. The only network use is the offscreen document fetching the bytes of an image the user explicitly right-clicked, so it can be resized locally.
- No servers, no accounts, no sign-in.
- No storing images in `chrome.storage` (sync or local). Images exist in memory, in the session handoff, and as files the user downloads.
- No reading browsing history, no content-script scraping, no injecting code into pages beyond the minimal right-click support.

See [docs/PRIVACY.md](docs/PRIVACY.md) and [docs/PERMISSIONS.md](docs/PERMISSIONS.md).

---

## Fix pass 2026-10-17 — Tailwind dead / giant logo / popup / formats / right-click

### Tailwind wiring (read this before touching styles)

Tailwind v4 in this extension works only if **both** halves are in place:

1. **`wxt.config.ts`** wires in Tailwind's Vite plugin. Without it, the build emits CSS with zero Tailwind utilities (this happened once: built editor CSS was ~2.2 KB, no utilities, logo rendered at natural 1024 px full-screen).
2. **`global.css`** is imported by the popup and editor entrypoints. A surface that does not import it gets no Tailwind classes at all (the popup once did not import it).

Rules:

- Never remove the Tailwind plugin from `wxt.config.ts` or the `global.css` import from an entrypoint without replacing the styling foundation first.
- Logo sizing must not depend on utilities alone: the editor header logo carries explicit width/height attributes + CSS so a CSS regression cannot blow it up to full-screen again.
- `npm run check:css` is the fast guard: it checks built CSS actually contains Tailwind utilities. Run it whenever popup/editor "looks broken". (Built CSS proof: `npm run check:css` PASS — 53,676 bytes, 3/3 Tailwind markers, logo pinned.)
- No Google Fonts in extension pages (Content Security Policy risk) — system fonts only.
- Static gates (`tsc` / `vitest` / `build`) do NOT prove visual correctness. A visual claim needs built-CSS proof + a real-Chrome check.

### i18n note — custom JSON, NOT `chrome.i18n`

This extension uses **custom JSON catalogs** in `src/i18n/` (`en.json`, `es.json`, `pt.json`) with its own `t()` lookup. It does **NOT** use `chrome.i18n`, and there is no `_locales/` subtree.

Consequence: the manifest must **NOT** set `default_locale`. Setting `default_locale: 'en'` without a `_locales/` subtree makes Chrome refuse to load the extension ("Default locale was specified, but _locales subtree is missing"). If a future change adopts `chrome.i18n`, the `_locales/` subtree must be added in the same change — never set `default_locale` alone.

### Format matrix

| Direction     | Formats                               |
| ------------- | ------------------------------------- |
| Input         | JPG / JPEG, PNG, GIF, WebP, BMP, AVIF |
| Output        | JPG, PNG, WebP, GIF                   |
| NOT supported | SVG (neither input nor output)        |

All upload/filter paths must use the single shared `isSupportedInputFile` check (extension-based), never an ad-hoc `file.type` prefix check. MIME types can be missing or inconsistent for formats such as BMP / AVIF, so a MIME-only filter wrongly rejects real files and makes SVG handling inconsistent across surfaces. Tool slugs are unified across popup, editor, and right-click flows.

---

## Responsive + token parity with the web app

The extension mirrors the ShrinkIt web app's geometry, tokens, and
responsive behaviour. The web app (`~/workspace/shrinkit`) is a
read-only reference — the extension does not depend on it at runtime.

### Tokens — three layers, one source of truth

1. **`--t-*` definitions** in `src/styles/global.css` — 59 tokens in
   `:root` (Light) + 59 in `[data-theme='dark']` (Dark 2 / Graphite),
   ported verbatim from the web app. These are the only token values
   that matter; tests pin all 118 of them.
2. **`--ed-*` / `--accent` aliases** in `global.css` — `html:root`
   aliases point every legacy `--ed-*` name at its matching `--t-*`
   token (`--ed-accent` → `--t-accent`, `--ed-line` → `--t-border`,
   …), and `:root` maps `--accent` → `--t-accent`,
   `--accent-hover` → `--t-btn-b`. Specificity (`html:root` 0,1,1)
   beats the `:root` (0,1,0) definitions, so the aliases win over the
   stale pre-parity `--ed-*` literals still present in
   `entrypoints/editor/style.css` (kept as fallback only; the token
   tests pin the aliases, not the stale literals).
3. **`var(--t-*, <web Light fallback>)` usages** in popup/editor CSS —
   every hex fallback equals the web Light value, so the UI is correct
   even if `global.css` ever failed to load. Dark surfaces in the popup
   carry web Dark 2 values as literals.

Every entrypoint imports `global.css` **before** its own `style.css`,
so the tokens + aliases apply on all three pages. Tests pin this import
order.

### Container geometry

| Surface             | Width  | Source of the value                                                 |
| ------------------- | ------ | ------------------------------------------------------------------- |
| Editor header inner | 1075px | Web `Header.astro`                                                  |
| Editor main wrapper | 960px  | Web `ShrinkItApp.tsx`                                               |
| Dropzone            | 940px  | Web `Dropzone.tsx` (rounded-2xl, px-4 sm:px-8 py-6 sm:py-8 md:py-9) |
| Settings form       | 650px  | Web `SettingsPanel.tsx`                                             |
| Popup               | 400px  | Extension-only (Chrome popup geometry), max 560px tall              |

Plain-CSS shell rules in `entrypoints/editor/style.css` mirror the
Tailwind classes, so the shell keeps its geometry even if Tailwind
failed to load. No container is 1100px; no fixed width above 1100px
exists in extension CSS/TSX/TS (media-query preludes excluded —
breakpoints are not widths).

### Breakpoints + overflow safeguards

Handled in code: **320 / 360 / 390 / 400 / 480 / 600 / 768 / 960**
(`global.css` shared guards + `editor/style.css` header rules). The
web's 1184 swiper edge fades are intentionally not copied — the
extension has no swiper. Overflow is guarded by `flex-wrap` +
`min-width: 0` + `overflow-x: clip` + `max-width: 100%` +
`box-sizing: border-box` (including a global `min-width: 0` /
`max-width: 100%` guard for media). Logos are pinned to 32px (attrs +
inline style + CSS) on editor and popup headers.

| Viewport | Code evidence checked (NOT a real-browser run)                 |
| -------- | -------------------------------------------------------------- |
| 320px    | `@media 320px` shared guard; shell `w-full` + `px-4`           |
| 360px    | `@media 360px`; header stacks, tabs shrink                     |
| 390px    | `@media 390px` shared guard; `@media 400px` editor rules apply |
| 400px    | Popup exact width 400px; editor `@media 400px`                 |
| 480px    | `@media 480px`; header tabs shrink                             |
| 600px    | `@media 600px`; dropzone wraps                                 |
| 768px    | `min-width:768px`; settings label shows                        |
| 960px    | Main container caps at 960px                                   |
| 1075px   | Header inner caps at 1075px                                    |
| 1440px   | Containers stay capped; no full-width stretch                  |

### Guards

- `tests/unit/responsive-parity.test.ts` — the full contract (21 tests).
- `tests/unit/css-guard.test.ts` — 4 fast spot-checks appended to the
  existing CSS guard.
- `npm run check:responsive` — CLI mirror + width table (built-CSS part
  needs `npm run build` first).

### Honest scope

Static checks prove the code carries the right containers, tokens,
breakpoints, and shrink guards. They do NOT prove nothing overflows in
a real browser. Verify in real Chrome at **390px and 1440px** (plus
320/360px if time allows) before calling the UI matched.

One known wart: built CSS still contains an unused 1100 utility because
Tailwind v4's scanner picks up the class string from a guard script's
marker text (`scripts/check-tailwind.mjs`). Source-level absence is the
real guard; `check:responsive` reports the built-CSS 1100 as WARN, not
FAIL. This worker's guard files avoid the literal forbidden class
(concatenated construction) so they cannot add to it.
