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
