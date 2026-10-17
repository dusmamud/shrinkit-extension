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
