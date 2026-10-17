# ShrinkIt Chrome Extension — VERIFICATION REPORT

Version: 1.0.0 · Manifest V3 · WXT 0.20.27 + React 19 + Vite + TypeScript strict + Tailwind v4
Date: 2026-10-16 · Built in `~/workspace/shrinkit-extension` · Local build only.

## What was verified (all green, this run)

| Gate                                  | Result                                                                                                                                                                                                     |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx tsc --noEmit`                    | Clean, 0 errors                                                                                                                                                                                            |
| `npx eslint .`                        | Clean, 0 errors (global ignores fixed so generated `.output/` + `.wxt/` are excluded)                                                                                                                      |
| `npx prettier --check .`              | Clean                                                                                                                                                                                                      |
| `npx vitest run`                      | 6 files, **73/73 tests passed** (filenames, limits, units, dpi, settings, i18n)                                                                                                                            |
| `npm run build` (`wxt build`)         | Success — `.output/chrome-mv3/` with `popup.html`, `editor.html`, `options.html`, `offscreen.html`, `background.js`, `content-scripts/content.js`, `assets/processor.worker-*.js`, icons. Total 950.83 kB. |
| `npm run zip` (`wxt zip`)             | Success — `.output/shrinkit-extension-1.0.0-chrome.zip` (356.24 kB)                                                                                                                                        |
| `grep console.log` / `TODO` / `FIXME` | None in `entrypoints/`, `src/`, `tests/`                                                                                                                                                                   |
| i18n key parity                       | 330 keys each in `en.json`, `es.json`, `pt.json` (126 ported from web app + 32 `ext.*` + `popup.*` + `options.*` + `tools.*`)                                                                              |
| Icons                                 | `icon-16/32/48/128.png` verified PNG at correct dimensions (resized from web-app `icon-512.png` via PIL, logo not redrawn)                                                                                 |
| Manifest                              | MV3, permissions `storage, downloads, contextMenus, tabs, offscreen` + `host_permissions <all_urls>` (justified in `docs/PERMISSIONS.md`)                                                                  |

## What was built

- **Popup quick** (`entrypoints/popup/`): 1–5 images (drag-drop, browse, paste), presets 50% / 800px / 20KB / last-used, Width/Height + Unit + Format + Quality, Resize + Download, Download All (ZIP), "Open Full Editor" + Settings buttons.
- **Full Editor** (`entrypoints/editor/` + `src/components/`): 6 tabbed tools — Main Resizer (batch 50 + ZIP + full SettingsPanel: Stretch/Crop/Fit, DPI, EXIF, background, units, aspect lock) + Compress to 50KB + Compress to 20KB + Passport (India 413×531, US 600×600 @300dpi) + Social (6 presets) + Compare slider.
- **Right-click** (`entrypoints/background/` + `offscreen/` + `content/`): context menu "Resize with ShrinkIt" on images. `data:` URLs stored directly; `https:` fetched via offscreen document; `blob:` fetched via content script in page context. Bytes in `chrome.storage.session` only (never sync). Failures open the editor with a localized error (`ext.right_click_cors` / `ext.right_click_failed`), never silent.
- **Options page**: theme, language, defaults, download mode, EXIF, background — persisted via `chrome.storage.sync` with local fallback; settings never contain images.
- **Engine** (`src/lib/image/`): faithful port of the web app — `createImageBitmap` + EXIF orientation → pica worker resize → canvas/gifenc encode → DPI inject (JPEG EXIF + PNG pHYs). Limits: 120 MP, 16000 px input side, 12000 px output side.
- **Docs**: `README.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`, `docs/PERMISSIONS.md`, `docs/PRIVACY.md`, per-folder READMEs.

## Integration fixes applied by the coordinator

Parallel workers assumed slightly different contracts; the coordinator reconciled them:

- Added missing `popup.*`, `options.*`, `tools.*` i18n keys (ES/PT translated, not English copies).
- Fixed `t()` arg order (`t(locale, key)`) in Options/SettingsForm; fixed named switcher imports.
- Rewrote `Popup.tsx` to the real contracts (`ImageProcessor` instance, `ProcessSettings` with numeric dims, `Settings.language`, string-based last-used fields) and rewrote `popup/style.css` to match its class names.
- `SettingsForm` now uses real `Settings` fields (`lastFormat` / `lastQuality` / `lastDpi`, preset set `50%|800px|20KB|last-used`).
- Editor now handles `?src=error&reason=cors|blob|unknown` from the background worker.
- ESLint flat-config global ignores fixed (generated files were being linted).

## NOT verified — only the user's laptop + Chrome can prove these

- **Load unpacked**: `chrome://extensions` → Developer mode → Load unpacked → `.output/chrome-mv3`. Not run here (no display / no Chrome in sandbox).
- **Real popup flow**: upload → resize → download in a real browser; paste (Ctrl+V) in popup; theme/language switching.
- **Real right-click** on real sites: `https:` images (incl. CORS-strict CDNs), `data:` URLs, `blob:` URLs (e.g. image search results), and the error paths.
- **Real downloads**: `chrome.downloads` save dialog behaviour, ZIP download-all, filenames.
- **Real image quality**: visual check of resized / passport / social outputs, EXIF orientation on real phone photos.
- **Chrome Web Store review**: permissions justification, listing, screenshots — not submitted.

## NOT done (explicitly out of scope for this task)

- **GitHub push**: NOT done — local build only. No repo created on GitHub, no commits pushed.
- **Chrome Web Store listing**: NOT done — no account action, no upload, no $5 fee paid.
- **ES/PT translations for tool strings**: written by the coordinator (fluent UI Spanish/Portuguese); a native-speaker review pass is recommended before Store submission.

---

## Fix pass 2026-10-17 — Tailwind dead / giant logo / popup / formats / right-click

> Docs-worker note: this section documents the fix pass from the fix spec supplied to Worker 8. This worker edited docs only and ran no gates. Gate results below are intentionally left for the coordinator's final run. Nothing in this section claims visual correctness — visual correctness can only be proven by the built-CSS proof + a real Chrome check on the user's laptop (see "What only the user's laptop + Chrome can prove").

### What was broken (as reported from laptop testing + code audit in the fix spec)

- **Tailwind was dead.** `wxt.config.ts` had no Tailwind Vite plugin wired in, so `global.css`'s Tailwind import generated zero utilities. The built editor CSS was ~2.2 KB with no Tailwind classes.
- **Giant logo full-screen.** Because Tailwind utilities were missing, the editor logo's size classes did nothing, so the logo rendered at its natural 1024 px size and filled the screen. The popup did not even import `global.css`.
- **Popup UI was basic / not web-app quality.** The popup used minimal custom CSS, not ShrinkIt web-app parity.
- **Editor looked broken.** The editor page itself rendered broken once CSS was dead — the user correctly called the whole right-click → editor flow broken, even though the routing itself opened the editor tab.
- **Formats filtered by MIME only.** The popup filtered uploads by `file.type` starting with `image/`, not by the shared supported-file check. Formats whose MIME can be missing or inconsistent (notably BMP / AVIF) could be rejected, and SVG handling was inconsistent across surfaces.
- **Slug mismatch.** Tool slugs were not unified across surfaces (per fix spec).
- **Google Fonts CSP risk.** Loading Google Fonts in extension pages carried a Content Security Policy risk; fonts did not belong in extension UI.

### What was fixed (per fix spec)

- **Tailwind plugin wiring.** Tailwind's Vite plugin wired into `wxt.config.ts`, so `global.css` actually produces utilities in the build.
- **Global CSS imports.** `global.css` imported in the popup and editor entrypoints, so both surfaces share the same styling foundation.
- **Fonts removal.** Google Fonts loading removed from extension pages (CSP risk gone; system fonts instead).
- **Popup rebuilt to web-app parity.** Popup rebuilt toward ShrinkIt web-app quality (same look/feel, presets, Resize + Download flow) instead of the minimal custom-CSS version.
- **Editor header hardening.** Editor header hardened so the logo cannot blow up to full-screen again (fixed logo size via explicit width/height attributes + CSS), plus a guard script / check that catches a missing-CSS regression.
- **`isSupportedInputFile` everywhere.** All upload/filter paths now use the single shared `isSupportedInputFile` check (extension-based), not ad-hoc MIME prefix checks, so format acceptance is consistent across popup, editor, and right-click flows.
- **Slug unification.** Tool slugs unified across surfaces (per fix spec).
- **Logo attrs + guard script.** Logo carries explicit size attributes, and a CSS guard (`npm run check:css`) exists to fail fast if built CSS is missing Tailwind utilities again.

### Format matrix (authoritative for this extension)

- **Input:** JPG / JPEG, PNG, GIF, WebP, BMP, AVIF.
- **Output:** JPG, PNG, WebP, GIF.
- **SVG NOT supported** (neither as input nor as output).

### What is verified in sandbox vs what only the user's laptop + Chrome can prove

**Sandbox can prove (coordinator final run — to be filled):**

- Built CSS proof: `npm run check:css` PASS — 4 built CSS files, 53,676 total bytes (was ~2.2 KB editor CSS when Tailwind was dead), 3/3 utility markers found (`.min-h-screen`, standalone `.flex`, `max-width:1100px`), Editor logo pinned width={32} height={32}. Built global CSS 40,133 B (was 22 KB with zero utilities); editor CSS 5,294 B; popup CSS 8,048 B. `grep -c default_locale .output/chrome-mv3/manifest.json` = 0.
- Gates (coordinator final run, after tools-format fix): `tsc --noEmit` clean (0 errors); `eslint .` clean (0 errors); `prettier --check .` clean; `vitest run` 8 files, 132/132 passed (was 73: +51 formats, +4 css-guard, +4 filenames); `npm run build` success (986 KB total); `npm run check:css` PASS; `npm run zip` success (362.2 KB zip). Coordinator integration fix: 4 tool files (`TargetSizeTool`, `PassportTool`, `SocialTool`, `CompareTool` ×2 handlers) switched from `next.type.startsWith('image/')` to `isSupportedInputFile(next)` — verified `grep` for MIME-only gates in tools = 0. Remaining `startsWith('image/')` hits are clipboard-item enumeration (Popup/MainResizer) where every candidate still passes through `addFiles → isSupportedInputFile`, plus the helper's own MIME check — not final gates.

**Only the user's laptop + Chrome can prove (NOT claimed here):**

- Real popup look — does it actually match web-app quality in a real popup window?
- Real editor look — header, logo size, all 6 tools, no overflow, no giant elements.
- Real right-click on real sites, including CORS-strict pages and `blob:` URLs (e.g. image search results), plus the error paths.
- Real BMP / AVIF uploads (files whose MIME may be missing or inconsistent).
- Visual quality of resized / passport / social outputs.
- Real downloads / ZIP behaviour via `chrome.downloads`.

**Lesson carried forward:** static gates (`tsc` / `vitest` / `build`) do NOT prove visual correctness. A build can pass every gate while the UI is broken (as happened here: Tailwind dead, logo full-screen). Any future "verified" claim about look/feel must cite built-CSS proof + a real-browser check, and must name exactly what was checked.

---

## Parity pass 2026-10-17 — responsive + tokens (Worker 8: tests + docs)

> Scope: this worker owned tests + docs + the responsive check script only.
> It did not change any UI file. Containers, tokens, and breakpoints below
> were landed by the other parity workers; this section pins them with
> tests so they cannot regress. Gate results are from this worker's run
> at the time of writing (see bottom).

### What was added

| File                                                       | What it is                                                                                                                                                       |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/unit/responsive-parity.test.ts` (NEW)               | 21 tests: containers, tokens (Light + Dark), fallbacks, breakpoints, overflow safeguards, logo pinning, manifest locale. Asserts TARGET values from the web app. |
| `tests/unit/css-guard.test.ts` (APPEND only)               | 4 fast fail-fast spot-checks (no 1100px container, popup 400px, `--t-accent` #016df0, breakpoints 360/400/480/600). Existing guard untouched.                    |
| `scripts/check-responsive.mjs` (NEW)                       | CLI mirror of the tests + the per-width table. Run: `npm run check:responsive` (built-CSS part needs `npm run build` first).                                     |
| `package.json`                                             | Added ONLY the `check:responsive` script entry. No other script or dependency changed.                                                                           |
| `VERIFICATION_REPORT.md` / `README.md` / `ARCHITECTURE.md` | This parity section + condensed tables in README / ARCHITECTURE.                                                                                                 |

### Parity table — web value vs extension value

Web sources are the read-only reference in `~/workspace/shrinkit`
(`Header.astro`, `ShrinkItApp.tsx`, `Dropzone.tsx`, `SettingsPanel.tsx`,
`src/styles/global.css`). Extension values are what the code carries now.

| Surface / token               | Web value (source)                                                     | Extension value (source)                                                                  | Status           |
| ----------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------- |
| Editor header inner           | 1075px (`Header.astro`)                                                | 1075px (`Editor.tsx` + `editor/style.css`)                                                | ✅ Match         |
| Editor main wrapper           | 960px (`ShrinkItApp.tsx`)                                              | 960px (`Editor.tsx` + `editor/style.css` + `MainResizer.tsx` outer + results)             | ✅ Match         |
| Dropzone                      | 940px, rounded-2xl, px-4 sm:px-8 py-6 sm:py-8 md:py-9 (`Dropzone.tsx`) | 940px + same shape (`Dropzone.tsx` container)                                             | ✅ Match         |
| Settings form                 | 650px (`SettingsPanel.tsx`)                                            | 650px (`SettingsPanel.tsx`)                                                               | ✅ Match         |
| Popup                         | — (extension-only surface)                                             | 400px wide, max 560px tall (`popup/style.css`)                                            | ✅ Fixed         |
| Tokens, Light                 | 59 `--t-*` values (`global.css` `:root`)                               | 59 `--t-*` in `global.css` `:root`, all equal to web                                      | ✅ Match         |
| Tokens, Dark 2 (Graphite)     | 59 `--t-*` values (`global.css` `[data-theme="dark"]`)                 | 59 `--t-*` in `global.css` `[data-theme="dark"]`, all equal to web                        | ✅ Match         |
| `--ed-*` / `--accent` aliases | — (extension legacy names)                                             | `html:root` aliases point at the matching `--t-*`; `--accent` → `--t-accent` in `:root`   | ✅ Match         |
| `var(--t-*, hex)` fallbacks   | —                                                                      | Every hex fallback in popup/editor CSS equals the web Light value                         | ✅ Match         |
| Logo                          | Header logo 34px (web)                                                 | Editor + popup header logos pinned 32px (attrs + inline style + CSS)                      | ✅ Pinned        |
| `default_locale`              | — (web N/A)                                                            | Absent from `wxt.config.ts` + built manifest (custom JSON i18n, no `_locales/`)           | ✅ Absent        |
| Breakpoints                   | 600 / 480 / 400 / 360 (+ 1184 swiper, 390 QA)                          | 320 / 360 / 390 / 400 / 480 / 600 / 768 / 960 handled (`global.css` + `editor/style.css`) | ✅ Covered       |
| No width > 1100px             | —                                                                      | None in extension CSS/TSX/TS (media-query preludes excluded — breakpoints are not widths) | ✅ None          |
| No 1100px container           | —                                                                      | None in extension CSS/TSX/TS (comments + media preludes stripped)                         | ✅ None (source) |
| Overflow safeguards           | `overflow-x: clip`, `max-width: 100%`                                  | `flex-wrap` + `min-width: 0` + `overflow-x: clip` + `max-width: 100%` + `box-sizing`      | ✅ Present       |

### Width table — what was checked in code (NOT in a real browser)

| Viewport | Governing container / rule (code)                                | Code evidence checked                                                     | Real-browser overflow |
| -------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------- |
| 320px    | Editor shell `w-full` + `px-4`; shared `.card` guard             | `@media 320px` in `global.css`; flex-wrap + min-width:0 + overflow-x:clip | NOT verified here     |
| 360px    | Header stacks; tabs shrink (editor `@media 360px`)               | `@media 360px` in `editor/style.css` + `global.css`; min-width:0          | NOT verified here     |
| 390px    | Editor `@media 400px` rules apply; shared `.input` guard         | `@media 390px` in `global.css`; `@media 400px` in `editor/style.css`      | NOT verified here     |
| 400px    | Popup exact width 400px; editor `@media 400px`                   | `popup-root width:400px`; `@media 400px` rules present                    | NOT verified here     |
| 480px    | Header tabs shrink; global body wrap guard                       | `@media 480px` in `editor/style.css` + `global.css`                       | NOT verified here     |
| 600px    | Dropzone wraps; controls cap at viewport                         | `@media 600px` in `editor/style.css` + `global.css`                       | NOT verified here     |
| 768px    | Settings label shows; card padding steps down                    | `min-width:768px` in `editor/style.css`; `@media 768px` in `global.css`   | NOT verified here     |
| 960px    | Main container caps at 960px                                     | 960px in Editor/MainResizer + built CSS                                   | NOT verified here     |
| 1075px   | Header inner caps at 1075px                                      | 1075px in Editor.tsx + built CSS                                          | NOT verified here     |
| 1440px   | Containers stay capped (1075/960/940/650); no full-width stretch | No width > 1100px in source (see built-CSS note below)                    | NOT verified here     |

The popup is a fixed 400px Chrome popup — it does not shrink to a 320px
viewport, by design.

### Gates at the time of writing (this worker's run)

- `npx vitest run` — 9 files, **157/157 passed** (incl. 21 new parity + 4 new css-guard spot-checks).
- `npx tsc --noEmit` — clean. `npx eslint .` on owned files — clean. `npx prettier --check` on owned files — clean.
- `npm run check:css` — PASS, untouched (see stale-marker note below).
- `npm run check:responsive` — PASS, with one WARN (built-CSS 1100, see below).

### Honest notes — read before claiming parity

- **No real browser run in the sandbox.** Everything above is code-level
  evidence. The user must verify in real Chrome, at minimum at **390px**
  and **1440px** (plus 320/360px if time allows): editor header/tabs,
  dropzone, settings form, popup, all 6 tools, no horizontal overflow.
- **Built CSS still carries the 1100 utility — and that is NOT a UI bug.**
  Proven by timestamps: a build newer than all UI sources (06:17:18 UTC)
  still emitted the 1100 utility while no UI source used the class; the
  only pre-build file containing the literal class string was
  `scripts/check-tailwind.mjs` (its marker text names the class).
  Tailwind v4's scanner reads guard/script files too and emits a utility
  for any class-shaped string it finds, even in a comment or a string.
  Consequences: (1) `check:responsive` reports built-CSS 1100 as WARN, not
  FAIL — source-level absence is the real guard. (2) This worker's new
  files never contain the literal forbidden class (concatenated
  construction + comment explaining why). (3) `check:css`'s 1100 marker
  is now stale AND self-perpetuating — it keeps the utility in built CSS
  by naming it. Its owner should reword the marker to avoid the literal
  class string. This worker did not touch that file (not owned).
- **`editor/style.css` still carries stale pre-parity `--ed-*` literals**
  (e.g. old accent). They are overridden at runtime by the `html:root`
  `--ed-*` → `--t-*` aliases in `global.css` (specificity 0,1,1 beats the
  `:root` 0,1,0 definitions), and every entrypoint imports `global.css`
  before its own stylesheet. If the aliases are ever removed, the editor
  values regress — the token tests pin the aliases + `--t-*` definitions,
  not the stale literals.
- **Web 1184 swiper edge fades intentionally not copied** — the extension
  has no swiper, so there is no equivalent.
- **Dropzone upload mark is 32px base / 36px `sm:`** (web icon box is
  56–64px). Icon sizing is NOT asserted by these tests; noted as scope,
  not a failure.
- **`check:responsive` built-CSS checks need `npm run build` first**,
  like `check:css`. Without `.output/`, they print SKIP and fail.

---

## Coordinator integration addendum — parity pass (2026-10-17)

Eight parallel workers landed; the coordinator reconciled the flagged
conflicts and re-ran every gate. No worker files were silently overwritten.

### Reconciliation — flagged conflicts resolved

| Flag                                                                                                                         | Verdict                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Dropzone still has an internal 1100px container" (worker 5)                                                                 | **Wrong — stale read.** `Dropzone.tsx` container is `max-w-[940px]` (line 134), icon box `h-14 w-14 sm:h-16 sm:w-16` (56–64px), mark `h-8 w-8 sm:h-9 sm:w-9` (32–36px) inside it. No 1100px anywhere in the component. (Wording kept free of the literal class string: Tailwind's scanner reads .md files too, and naming the class here re-emitted the utility into built CSS.) |
| "ResultPanel caps results at `max-w-[850px]`" (worker 5)                                                                     | **Not a bug — exact web parity.** Web `ResultPanel.tsx:138` uses the same `max-w-[850px]` for its result section; the extension matches it line-for-line. The 960px wrapper is MainResizer's outer container; the result section itself is 850px on both.                                                                                                                        |
| "`[data-tip]` CSS missing, tooltips render nothing" (worker 4)                                                               | **Wrong — landed concurrently.** Tokens worker ported web's `[data-tip]` / `[data-tip]::after` (absolute-positioned) into `global.css:346-377`. Tooltips render with zero layout impact (no 443px phantom-width bug).                                                                                                                                                            |
| New `--ed-*` names (`--ed-teal`, `--ed-badge-off`, `--ed-accent-2`, `--ed-btn-b`, `--ed-line-soft`) had light fallbacks only | **Fixed.** Added as `var(--t-*)` aliases in `global.css` `html:root`, so they follow light/dark automatically (dark: teal #2dd4bf, badge-off #48484a, accent-2 #0a84ff, btn-b #0071e3, line-soft rgba white).                                                                                                                                                                    |
| `editor/style.css` stale `--ed-*` literals (#007bff, #1a1a1a, …)                                                             | **Fixed.** Deleted the stale `:root` + `[data-theme='dark']` literal blocks; `global.css` aliases are now the single source of truth. Kept `color-scheme: dark` in the dark block.                                                                                                                                                                                               |
| `check:css` 1100px marker self-perpetuating                                                                                  | **Fixed.** Removed the 1100px marker from `scripts/check-tailwind.mjs` (markers now 2/2: `.min-h-screen`, `.flex`). Rebuilt CSS now contains **0 hits** for `1100px` (was WARN, now PASS). `check:responsive` stale WARN comment + 1440-row note updated.                                                                                                                        |
| `entrypoints/options/README.md` stale (claimed Options uses SettingsForm)                                                    | **Fixed.** Rewritten: Options inlines its form; `SettingsForm` is a separate reusable form kept for future popup/editor embedding; Settings field table now matches the real `Settings` type.                                                                                                                                                                                    |
| Prettier                                                                                                                     | `Dropzone.tsx` had a formatting drift — fixed with `prettier --write` (whitespace only).                                                                                                                                                                                                                                                                                         |

### Final gates (coordinator re-run, after integration)

| Gate                       | Result                                                    |
| -------------------------- | --------------------------------------------------------- |
| `npx tsc --noEmit`         | Clean, 0 errors                                           |
| `npx eslint .`             | Clean, 0 errors                                           |
| `npx prettier --check .`   | Clean                                                     |
| `npx vitest run`           | 9 files, **157/157 passed**                               |
| `npm run build`            | Success — 1.02 MB total                                   |
| `npm run check:css`        | PASS — 76,091 bytes, 2/2 markers                          |
| `npm run check:responsive` | PASS — built CSS contains 1075/960/940/650, **no 1100px** |
| `npm run zip`              | Success — 369.11 kB zip                                   |
| Built manifest             | `default_locale` = 0 hits (still absent)                  |

### Parity table (web value → extension value, verified in code)

| Item           | Web                                                                      | Extension                                              |
| -------------- | ------------------------------------------------------------------------ | ------------------------------------------------------ |
| Editor main    | 960px                                                                    | 960px                                                  |
| Dropzone       | 940px, rounded-2xl, px-4/sm:px-8, py-6/sm:py-8/md:py-9, icon box 56–64px | Same                                                   |
| Header inner   | 1075px, px-4 py-4                                                        | Same                                                   |
| Settings form  | 650px, title 2rem, inputs h-50px w-68/72px, Resize px-12 py-3.5          | Same                                                   |
| Tokens         | `--t-*` (accent #016df0, ink #000, …) light + dark                       | Same, byte-identical 59+59 values; `--ed-*` aliases    |
| Popup          | n/a (web has no popup)                                                   | 400px fixed, max-height 560px, same web design compact |
| Result section | 850px                                                                    | 850px (exact parity)                                   |
| Breakpoints    | 600/480/400/360/1184                                                     | 320/360/390/400/480/600/768/960/1075/1440              |

### Still NOT proven — only the user's laptop + real Chrome can prove

- Real rendering at 390px + 1440px (plus 320/360px): header/tabs, dropzone, settings, popup, all 6 tools, no horizontal overflow.
- Real popup look (400px), real editor look, real right-click on real sites, real BMP/AVIF uploads + SVG rejection message, real downloads/ZIP, real phone EXIF.
- ES/PT tool strings still need native-speaker review before Store submission.

**Not done (per task):** GitHub push — parent pushes after verification. Chrome Web Store listing — not submitted.

---

## Multi-page rebuild — docs + verification prep (Worker 10: docs only)

> Scope: this worker owned docs only — `docs/ROUTING.md` (new),
> `README.md`, `ARCHITECTURE.md`, and this section. It edited no code
> and ran no gates; gate results are the coordinator's final run, not
> this section's. Nothing below claims the multi-page code is built,
> rendered, or verified. The route table documents the rebuild spec,
> reconciled mid-task against the page + layout files the code workers
> had landed (`src/pages/*Page.tsx`, `src/components/home/`,
> `src/components/layout/` — read, not edited). At the time of writing,
> the Editor shell router wiring had NOT landed
> (`entrypoints/editor/Editor.tsx` was still the tab-based version in
> git status), so the "Status" column below means: page file present,
> shell wiring still to be confirmed by the coordinator. The route
> strings are the contract; file paths follow the landed layout.

### What was written

| File                    | Change                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/ROUTING.md` (NEW) | Hash-routing scheme (`editor.html[?query]#/route`), why hash routing, query-before-hash rule, full route table, query-parameter table, who-opens-which-URL table, router behaviour, shared Header/Footer layout (+ `#/resize` minimal-footer exception), what is NOT hash-routed (popup / options / offscreen), how to add a new page.                        |
| `README.md`             | Single-editor description replaced with the multi-page structure (Home / Tools hub / 5 tool pages / About / Contact / Privacy / Terms / 404 / Popup / Options), routes, project tree (`src/pages/`), laptop test step for every route.                                                                                                                        |
| `ARCHITECTURE.md`       | Editor entrypoint row updated to multi-page; new "Multi-page app" section (router, layout, pages, invariant list: Tailwind wired, logo 32px, formats gate, right-click slugs, `default_locale` absent, tokens byte-identical, containers 960/940/1075/650, routing rules, no hardcoded strings); tools + message-protocol sections updated to the page model. |

### Route table — route → web page mirrored → page file → status

| Route                          | Web page mirrored                                 | Page file                            | Status                                                         |
| ------------------------------ | ------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------- |
| `#/`                           | `/` (Home: hero tool + HowItWorks + InfoSections) | `src/pages/HomePage.tsx`             | Page file landed — router shell wiring: coordinator to confirm |
| `#/resize`                     | `/resize`                                         | `src/pages/ResizePage.tsx`           | Page file landed — router shell wiring: coordinator to confirm |
| `#/tools`                      | `/tools` (Tools hub)                              | `src/pages/ToolsHubPage.tsx`         | Page file landed — router shell wiring: coordinator to confirm |
| `#/tools/compress-to-50kb`     | `/tools/compress-to-50kb`                         | `src/pages/tools/Compress50Page.tsx` | Page file landed — router shell wiring: coordinator to confirm |
| `#/tools/compress-to-20kb`     | `/tools/compress-to-20kb`                         | `src/pages/tools/Compress20Page.tsx` | Page file landed — router shell wiring: coordinator to confirm |
| `#/tools/passport-photo-maker` | `/tools/passport-photo-maker`                     | `src/pages/tools/PassportPage.tsx`   | Page file landed — router shell wiring: coordinator to confirm |
| `#/tools/social-media-resizer` | `/tools/social-media-resizer`                     | `src/pages/tools/SocialPage.tsx`     | Page file landed — router shell wiring: coordinator to confirm |
| `#/tools/compare-images`       | `/tools/compare-images`                           | `src/pages/tools/ComparePage.tsx`    | Page file landed — router shell wiring: coordinator to confirm |
| `#/about`                      | `/about`                                          | `src/pages/AboutPage.tsx`            | Page file landed — router shell wiring: coordinator to confirm |
| `#/contact`                    | `/contact`                                        | `src/pages/ContactPage.tsx`          | Page file landed — router shell wiring: coordinator to confirm |
| `#/privacy`                    | `/privacy`                                        | `src/pages/PrivacyPage.tsx`          | Page file landed — router shell wiring: coordinator to confirm |
| `#/terms`                      | `/terms`                                          | `src/pages/TermsPage.tsx`            | Page file landed — router shell wiring: coordinator to confirm |
| Any other hash                 | `/404`                                            | `src/pages/NotFoundPage.tsx`         | Page file landed — router shell wiring: coordinator to confirm |

The 5 tool pages are the `/tools/*` rows. The main resizer lives on
Home (`#/`) and `#/resize`, matching the web app. Popup (`popup.html`)
and Options (`options.html`) are separate entrypoints, not routes.

### Needs laptop — NOT claimed here (only real Chrome can prove)

- [ ] Every route renders: `#/`, `#/resize`, `#/tools`, all 5 tool pages, `#/about`, `#/contact`, `#/privacy`, `#/terms`, plus an unknown hash showing the 404 page.
- [ ] Every route at **390px + 1440px** (plus 320/360px if time allows): no horizontal overflow, header nav wraps/stacks cleanly, footer readable, tool UI usable.
- [ ] Header/Footer nav: every link moves between pages without a reload; the current route is marked active; browser back/forward works through the route history.
- [ ] Right-click landing: right-click a real image → editor opens on `#/` with the image preloaded in the hero tool; right-click failure → `#/` with the localised error banner, never blank, never silent.
- [ ] Popup polish: popup opens `#/` (Full Editor) and `#/tools` correctly; popup itself still looks like the web app at 400px.
- [ ] Deep links survive reload: reloading `editor.html#/tools/passport-photo-maker` (and each other route) renders that page, not Home or blank.
- [ ] `#/resize` shows the minimal footer (copyright bar only); all other pages show the full footer.
- [ ] Legacy `?tool=passport`-style links (no hash) still land on the matching tool page.

### Open items for the coordinator (not resolved by this worker)

- **Router shell wiring:** page + layout components landed, but the Editor shell (`Editor.tsx`) was still tab-based at the time of writing. Confirm the shell worker lands the hash router (parse hash on load + `hashchange`, default `#/`, unknown → 404, scroll/anchor handling, `document.title`, query-before-hash handoff) and that it renders `Header`/`Footer` from `src/components/layout/` around `src/pages/` components.
- **i18n keys for new pages:** the catalogs carry `about.*`, `contact.*`, `privacy.*`, `info1.*` / `info2.*`, and `footer.*` keys (incl. `footer.about`, `footer.terms`, `footer.tools_all`), but **zero `terms.*` keys** and no `nav.about` / `nav.terms` keys. Check what copy source `TermsPage.tsx` actually uses — if it needs `terms.*` content keys, they must be added in all three catalogs (en / es / pt), not English-only.
- **Logo size discrepancy:** the pre-rebuild parity invariant pinned the editor header logo at 32px; the landed Header uses the web's 34px (footer brand 30px, popup 32px). Decide whether 34px stands or 32px is restored, and update the invariant + tests to match the decision.
- **`docs/README.md` index** does not yet list `docs/ROUTING.md` (that file was outside this worker's owned set) — add one row pointing at it.
- **Gates:** `tsc` / `eslint` / `prettier` / `vitest` / `build` / `check:css` / `check:responsive` / `zip` are the coordinator's final run. This worker ran none of them.
- **No push** per task (coordinator / parent pushes after verification).

---

## Multi-page rebuild — coordinator integration + final gates (2026-10-17)

All 10 rebuild workers delivered. The coordinator integrated them, resolved
every open item from the section above, and ran the full gates on the
combined state. **Do NOT push** — parent pushes after verification.

### Integration fixes (coordinator)

| #   | Fix                                                                                                                                                                                                                                                                                                                                          | Files                                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Tool-page broken imports: `../../../lib                                                                                                                                                                                                                                                                                                      | tools`→`../../lib                                                                                                                    | tools`(was the only`tsc` failure, 10 errors) | `src/pages/tools/*.tsx` |
| 2   | Header active-route marking: Editor passes `currentRoute`; Header renders `aria-current="page"` + accent style on desktop + mobile nav                                                                                                                                                                                                       | `entrypoints/editor/Editor.tsx`, `src/components/layout/Header.tsx`                                                                  |
| 3   | Skip-to-content link (a11y F3): first focusable element in Editor, targets `<main id="main-content">`; new `nav.skip_to_content` key (EN/ES/PT)                                                                                                                                                                                              | `entrypoints/editor/Editor.tsx`, `src/i18n/messages/*.json`                                                                          |
| 4   | Header nav `aria-label`s localised (F5): `nav.primary` / `nav.mobile` keys added (EN/ES/PT)                                                                                                                                                                                                                                                  | `src/components/layout/Header.tsx`, `src/i18n/messages/*.json`                                                                       |
| 5   | `ResizePage` is now STANDALONE (web parity), not a redirect: shared `Hero` + `MainResizer`. The old `resize.redirect_text` / `resize.back_home` keys were removed (all 3 locales) + removed from the i18n pinned list; router test updated to assert no hash-write redirect                                                                  | `src/pages/ResizePage.tsx`, `tests/unit/router.test.ts`, `tests/unit/i18n.test.ts`, `src/i18n/messages/*.json`                       |
| 6   | Footer `variant="minimal"` (copyright bar only) for `#/resize`, matching the web page's 0-footer-links footer                                                                                                                                                                                                                                | `src/components/layout/Footer.tsx`, `entrypoints/editor/Editor.tsx`                                                                  |
| 7   | Footer links reach the 24px WCAG target (F7): `inline-block py-0.5`                                                                                                                                                                                                                                                                          | `src/components/layout/Footer.tsx`                                                                                                   |
| 8   | Mobile menu Escape returns focus to the hamburger (F8)                                                                                                                                                                                                                                                                                       | `src/components/layout/Header.tsx`                                                                                                   |
| 9   | Tool components ported to `--t-*` tokens (F6): `slate-*` / `bg-white` / `[#007bff]` → `tink` / `tmuted` / `tline` / `tsurface` / `taccent` (109 occurrences, 4 files). Dark mode now applies to all tool UIs                                                                                                                                 | `src/tools/*/*.tsx`                                                                                                                  |
| 10  | Tool dropzones: `aria-label` (F1) + Space `preventDefault()` (F2) on all 5; main `Dropzone.tsx` Space `preventDefault()` + `tabIndex={disabled ? -1 : 0}` (F10)                                                                                                                                                                              | `src/tools/*/*.tsx`, `src/components/Dropzone.tsx`                                                                                   |
| 11  | Result images use the source file name as `alt` (F12); CompareTool uses new localised `tools.compare.originalAlt` / `compressedAlt` keys (no File state exists for the compressed side)                                                                                                                                                      | `src/tools/*/*.tsx`, `src/i18n/messages/*.json`                                                                                      |
| 12  | Options `<nav>` gets `aria-label` (F9)                                                                                                                                                                                                                                                                                                       | `entrypoints/options/Options.tsx`                                                                                                    |
| 13  | Dead header/tab CSS removed: `.ed-header*`, `.ed-brand*`, `.ed-logo`, `.ed-tabs`, `.ed-tab*`, `.ed-header-actions`, `.ed-settings-*` from `entrypoints/editor/style.css` + `src/styles/global.css` (nothing renders them since the header moved to `Header.tsx`)                                                                             | `entrypoints/editor/style.css`, `src/styles/global.css`                                                                              |
| 14  | Guards repointed at the real header + logo invariant decided per-context (NOT forced to one size): editor header 34px (web parity), footer 30px, popup 32px. `check-tailwind.mjs` §4 + `check-responsive.mjs` + `css-guard` + `responsive-parity` tests now check `Header.tsx` (34px, 1075px) instead of the dead `Editor.tsx` inline header | `scripts/check-tailwind.mjs`, `scripts/check-responsive.mjs`, `tests/unit/css-guard.test.ts`, `tests/unit/responsive-parity.test.ts` |
| 15  | `docs/README.md` index rows added for `docs/ROUTING.md` + `docs/RESPONSIVE.md`; `docs/RESPONSIVE.md` findings F1–F12 marked FIXED except F11 (OPEN) and F4 (MOOT — tabs removed)                                                                                                                                                             | `docs/README.md`, `docs/RESPONSIVE.md`                                                                                               |

Decisions recorded: **logo sizes are per-context** (34 / 30 / 32) — the old
"32px everywhere" invariant was wrong for the web-parity header; **route
slugs are the web slugs** (`#/tools/compress-to-50kb`, …), not short slugs;
**duplicate i18n key families** (e.g. `tools.hub.title` vs
`tools.hub_title`) both exist and are populated — cleanup deferred, not a
correctness issue. Remaining a11y gap: **F11** (SettingsPanel combobox
lacks `aria-activedescendant`) — needs a screen-reader check.

### Final gates — combined state (all green)

| Gate                       | Result                                                    |
| -------------------------- | --------------------------------------------------------- |
| `npx tsc --noEmit`         | 0 errors                                                  |
| `npx eslint .`             | 0 problems                                                |
| `npx prettier --check .`   | clean                                                     |
| `npx vitest run`           | **195/195** (was 157; +38: router 28, pages 6, i18n +4)   |
| `npm run build`            | OK — 1.15 MB total                                        |
| `npm run check:css`        | PASS — 84,149 bytes built CSS, Header logo 34px pin       |
| `npm run check:responsive` | PASS — containers 1075/960/940/650, no 1100px             |
| `npm run zip`              | OK — `.output/shrinkit-extension-1.0.0-chrome.zip` 403 KB |
| Built manifest             | `default_locale` 0 occurrences                            |
| Built CSS                  | 0 occurrences of `1100px`                                 |
| i18n catalogs              | 566 keys each (en/es/pt), identical key sets              |

### Still ONLY provable on the user's laptop (not claimed here)

- Every route renders in real Chrome at 390px + 1440px (no overflow, header hamburger <768px, hero scales, grids collapse).
- Right-click on real sites (https incl. CORS-strict, `data:`, `blob:`) lands on `#/` with the image preloaded; error paths show the localised banner.
- Real BMP/AVIF uploads + SVG rejection; real downloads / ZIP; real-phone EXIF.
- Reload deep-link (`editor.html#/tools/passport-photo-maker`) renders that page.
- `#/resize` shows the copyright-only footer; all other pages show the full footer.
- ES/PT strings: machine-translated from EN/web copy — native-speaker review still needed before Store submission.
- Screen-reader pass for F11 (combobox `aria-activedescendant`).

---

## Header-wrap fix (2026-10-17)

> Scope: this worker owned docs only — this section, plus the targeted
> corrections in `docs/ROUTING.md` and `docs/RESPONSIVE.md` listed at the
> bottom. It edited no code, no tests, no CSS, and no workflow files, and
> ran no gates. Gate results (including the new header regression tests)
> are the coordinator's final run, not this section's. Everything below is
> **code evidence** (committed `HEAD` vs the working tree + `git diff`),
> not a browser result.
>
> **Timing (explicit):** these docs were written **after** the other
> workers' header changes landed in the working tree — not before. The
> sequence was: watch the working tree until the header diff stabilised
> (identical file checksums 60s apart, 16 modified files + 1 untracked
> test), then read the final `Header.tsx` / switcher / CSS diffs, then
> write. At the time of writing the header fix was **uncommitted**
> (working tree only, `HEAD` still `1132c49`); no commit and no push by
> this worker.

### What the user saw (screenshots, the bug)

At tablet widths the header broke words mid-word: **"Shrink / It"**,
**"Tool / s"**, **"Privac / y"**, **"Conta / ct"** — nav + CTA +
dropdowns crammed and wrapping. The screenshots are the user's evidence;
no screenshot was taken in this environment (see "Honest note" below).

### BEFORE — committed `HEAD` (`git show HEAD:src/components/layout/Header.tsx`)

| Item                    | BEFORE value (HEAD)                                                                                                                                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop-nav breakpoint  | `md:` — desktop nav `hidden items-center md:flex` (visible from **768px**); hamburger wrapper + mobile panel `md:hidden`                                                                                                         |
| Nav links (`NAV_LINKS`) | **5** — `#/` (`nav.resize`), `#/tools` (`nav.tools`), `#/#how-it-works` (`nav.how`), `#/privacy` (`nav.privacy`), `#/contact` (`nav.contact`)                                                                                    |
| Duplicate Resize        | The `#/` `nav.resize` link duplicated the "Resize Image" CTA (separate `href="#/"` button) — per the regression test's comment, ~120px wider than the web header                                                                 |
| Wrapping protection     | **None** on the text: brand wordmark `<span>`, nav `<a>`s, and CTA had no `whitespace-nowrap`; brand link and CTA had no `shrink-0` (only the logo `<img>` had `shrink-0`). Inner bar was plain `flex` (wrapping allowed)        |
| Global break rules      | `src/styles/global.css`: `body { overflow-wrap: break-word }` at ≤480px **and** `p, li, h1, h2, h3, a { overflow-wrap: break-word }` — global rules that let words split. Popup CSS carried `overflow-wrap: anywhere` on 9 rules |

Why it broke at 768–1024px: the web header waits until `lg:` (1024px)
before showing the full nav, but the extension showed all 5 links + CTA +
2 switchers from 768px — ~256px less room for ~120px more content, with
nothing stopping words from splitting. Squeezing broke the words.

### AFTER — working tree (`Header.tsx` + switchers + CSS, as read after stabilisation)

| Item                    | AFTER value (worktree)                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop-nav breakpoint  | `lg:` — desktop nav `hidden flex-nowrap items-center lg:flex` (visible from **1024px**); hamburger wrapper `shrink-0 lg:hidden`; mobile panel `lg:hidden`. `grep` confirms **zero** `md:flex` / `md:hidden` in `Header.tsx`                                                                                                                                                                                                                                                         |
| Nav links (`NAV_LINKS`) | **4** — exactly the web app's links: `#/#how-it-works` (`nav.how`), `#/tools` (`nav.tools`), `#/privacy` (`nav.privacy`), `#/contact` (`nav.contact`). No `#/` entry, no `nav.resize` key                                                                                                                                                                                                                                                                                           |
| Duplicate Resize        | Gone as a nav link. "Resize Image" exists only as the CTA (`href="#/"`, `nav.resize_image`) — the single Resize entry point, matching the web header (CTA + logo link home)                                                                                                                                                                                                                                                                                                         |
| Wrapping protection     | Inner bar `flex-nowrap … gap-x-4`; brand link `shrink-0`, wordmark `whitespace-nowrap`; each nav-link wrapper `shrink-0`, dividers `shrink-0`, nav links `whitespace-nowrap`; CTA `shrink-0` + `whitespace-nowrap`; switcher wrapper `shrink-0`. Mobile-panel links + CTA also `whitespace-nowrap`                                                                                                                                                                                  |
| Switchers               | `LanguageSwitcher` + `ThemeSwitcher`: wrapper / label / `<select>` all `whitespace-nowrap` + `shrink-0`, `h-11` (44px touch target), `lg:px-2` (padding tightens at the squeeze width)                                                                                                                                                                                                                                                                                              |
| Global break rules      | **Removed.** `global.css`: the `body` ≤480px `break-word` rule and the `p, li, h1, h2, h3, a` `break-word` rule are both deleted, replaced by a NOTE ("no global overflow-wrap here — UI text must never break mid-word"). Popup CSS: `overflow-wrap: anywhere` removed from all 9 rules; the single remaining break rule is a **scoped** exception — `.popup-thumb-name { overflow-wrap: break-word }` for long filenames only, with a comment saying it never applies to UI prose |
| Regression tests        | New untracked `tests/unit/header-responsive.test.ts`: pins `lg:flex` / `lg:hidden`, zero `md:flex` / `md:hidden`, exactly the 4 web hrefs, `whitespace-nowrap` + `shrink-0` on brand / nav links / CTA, no `break-all` / `overflow-wrap: anywhere` on any global selector in the 4 CSS files, 13 routes unchanged                                                                                                                                                                   |

### Word-break audit (this worker's own `grep`, not just the test)

- `Header.tsx`: **zero** `break-*` / `overflow-wrap` / `word-break` rules.
- All 4 CSS files (`src/styles/global.css`, `entrypoints/editor/style.css`,
  `entrypoints/options/style.css`, `entrypoints/popup/style.css`): **zero**
  `break-all`, **zero** `overflow-wrap: anywhere`. One scoped
  `overflow-wrap: break-word` remains (`.popup-thumb-name`, filenames
  only) — it cannot split header words.
- No rule anywhere can split a header word mid-word anymore. What the
  code does **not** prove is whether the full single-row content fits at
  exactly 1024px (see the 1024px row below).

### Per-width table — header state + overflow verdict from CODE evidence only

"Code evidence" means: what the classes + `NAV_LINKS` + CSS in the
working tree force to happen. It is **not** a rendering measurement —
font metrics, translated label lengths (EN/ES/PT), and real layout can
only be measured in a real browser.

| Viewport | Header state (code)                                                                                                                                                                                              | Overflow verdict (CODE evidence only)                                                                                                                                                                                                                                                                                                                                                     |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 320px    | Hamburger (`lg:hidden` shows it; desktop nav `hidden`). Brand + hamburger only. Mobile panel, when opened, stacks links vertically                                                                               | No squeeze: desktop nav hidden; brand wordmark `nowrap` + `shrink-0`, hamburger `shrink-0`. Fit of brand + hamburger in 288px inner width not measured — code evidence only                                                                                                                                                                                                               |
| 360px    | Hamburger. Same as 320px                                                                                                                                                                                         | Same as 320px — no wrap/break mechanism in code; fit not measured                                                                                                                                                                                                                                                                                                                         |
| 390px    | Hamburger. Same as 320px                                                                                                                                                                                         | Same as 320px — no wrap/break mechanism in code; fit not measured. **390px is a must-check on the laptop** (see Honest note)                                                                                                                                                                                                                                                              |
| 480px    | Hamburger. Same as 320px                                                                                                                                                                                         | Same as 320px — no wrap/break mechanism in code; fit not measured                                                                                                                                                                                                                                                                                                                         |
| 768px    | **Hamburger** (changed — was desktop nav before). The 768–1024px squeeze zone is gone: the full nav never renders here now                                                                                       | No squeeze by construction: desktop nav `hidden` below `lg:`. This is the width band the screenshots proved broken before                                                                                                                                                                                                                                                                 |
| 1024px   | **Single-row desktop nav** (`lg:flex` first applies; Tailwind `lg:` = min-width 1024px). Tightest single-row width: inner bar = 1024 − 32px padding = 992px for brand + 4 links + 3 dividers + CTA + 2 switchers | **No mid-word break by construction** (`nowrap` + `shrink-0` + `flex-nowrap` everywhere). **Total-width fit NOT proven by code alone**: whether the intrinsic widths of all single-row items fit 992px depends on rendered font metrics + locale label lengths (ES/PT labels are longer) — only a real-browser measurement can prove it. **1024px is the must-check width on the laptop** |
| 1075px   | Single-row desktop nav. Inner bar at its 1075px cap (minus 32px padding = 1043px usable)                                                                                                                         | Same as 1024px, with 51px more room — no mid-word break by construction; total fit not measured in code                                                                                                                                                                                                                                                                                   |
| 1280px   | Single-row desktop nav. Inner bar stays capped at 1075px, centred                                                                                                                                                | Same as 1075px — no mid-word break by construction; total fit not measured in code                                                                                                                                                                                                                                                                                                        |
| 1440px   | Single-row desktop nav. Inner bar stays capped at 1075px, centred; no full-width stretch                                                                                                                         | Same as 1075px — no mid-word break by construction; total fit not measured in code                                                                                                                                                                                                                                                                                                        |

Popup note (unchanged by this fix): the popup is a fixed 400px Chrome
popup; it does not shrink to page-viewport widths and is not part of
this table.

### Honest note — no real-browser screenshots taken in this environment

- **No screenshots were taken here.** This environment has no live
  browser / real Chrome run; every verdict above is read from source
  (`Header.tsx`, switchers, CSS, `git diff`). Code can prove that no
  rule _can_ split a word, but it cannot prove how the header _looks_.
- **Only the user's laptop + real Chrome can prove rendering**, at
  minimum at **1024px** (tightest single-row width — does everything
  actually fit on one row, in EN _and_ ES _and_ PT?) and **390px**
  (hamburger + brand, mobile panel open + closed, no horizontal
  scrollbar). 768px is also worth one look to confirm the hamburger now
  shows where the screenshots showed the broken nav.
- Also still laptop-only: translated label lengths (ES/PT switcher +
  nav labels are longer than EN — the 1024px fit question is really a
  per-locale question), and the regression tests' pass/fail result
  (coordinator's final run, not this worker's).

### Docs updated (after the workers' changes, not before)

| Doc                  | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/ROUTING.md`    | Header bullet corrected: old 5-link nav (Resize, Tools, How it works, Privacy, Contact) → **4 links** (How it works, Tools, Privacy, Contact) + desktop nav at `lg:` + `nowrap`/`shrink-0` + CTA as the single Resize entry point. No other ROUTING.md content touched                                                                                                                                                                                              |
| `docs/RESPONSIVE.md` | Breakpoint table corrected: added a **1024px** row (desktop nav appears at `lg:` — tightest single-row width); 960px row "Compressing" → **hamburger** (desktop nav hidden below `lg:`); 768px row "below `md`" → **below `lg:`**; How-to-test step 2 width list gained **1024**; step 3 "hamburger (below 768px)" → **(below 1024px)**. Hero `md:` / dropzone `sm:`/`md:` mentions untouched — those are hero/dropzone Tailwind classes, not the header breakpoint |

**Not done (per task):** no push; no edits outside `VERIFICATION_REPORT.md`, `docs/ROUTING.md`, `docs/RESPONSIVE.md`; no gates run by this worker.
