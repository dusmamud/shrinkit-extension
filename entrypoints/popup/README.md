# Popup — ShrinkIt Chrome Extension

Toolbar popup: quick resize for **1–5 images** in a compact ~400 × 560px panel.
The Full Editor (all 6 tools, batch up to 50) lives in `entrypoints/editor/`.

## Files

- `index.html` — WXT entrypoint. WXT picks `entrypoints/popup/index.html` up as
  the toolbar action popup automatically.
- `main.tsx` — React root, mounts `<Popup />`.
- `Popup.tsx` — All popup UI + logic.
- `style.css` — Popup-only styles: fixed size, theme-aware surfaces
  (`data-theme` on `<html>`), compact switcher selects, range slider, scrollbar.

## What it does

- **Header** — Logo (`icons/icon-48.png` via `chrome.runtime.getURL`) + `ShrinkIt`
  brand + `<LanguageSwitcher />` + `<ThemeSwitcher />` (rendered bare:
  self-contained, they read/write the shared settings store).
- **Dropzone** — Drag-drop, click-to-browse, and paste (Ctrl+V / Cmd+V) for
  images. Non-image files get a localised error; past the 5-file cap, extras are
  refused with a localised error. Thumbnails strip with per-file remove buttons.
- **Presets** — `50%` (50% × 50%), `800px` (800 px wide, height auto),
  `20KB` (heuristic: JPEG, quality 60, 800 px wide, height auto — exact
  target-size iteration lives in the Full Editor's 20 KB tool), `Last used`
  (restores the last resize saved via `saveSettings`; disabled when none exists).
- **Quick controls** — Width / Height (blank = auto), aspect-lock checkbox,
  Unit (`%`, `px`, `cm`, `inch`), Format (JPEG / PNG / WebP / GIF), Quality
  slider 1–100 (disabled for PNG/GIF, which have no quality parameter).
  With aspect-lock on, editing one dimension scales the other from the first
  image's natural size (`%` keeps both percentages equal).
- **Resize** — Runs each file through `ImageProcessor.process`, one at a time.
  Per-file failures show a localised error naming the file; the rest still process.
  On success the used settings are persisted via `saveSettings` (last-used).
- **Results** — Per-file row: name, original → output bytes, % saved, Download.
  `Download All` (shown when >1 result) zips the batch with JSZip
  (`shrinkit-resized.zip`, duplicate names de-duplicated with `-2`, `-3`, …).
  Downloads use `chrome.downloads.download` with the blob URL, falling back to
  an `<a download>` click when the API is unavailable.
- **Footer** — `Full Editor` button + `Settings` button.

## How the popup opens the Full Editor

```ts
const url = chrome.runtime.getURL('editor.html');
await chrome.tabs.create({ url });
```

WXT builds `entrypoints/editor/index.html` to `editor.html` at the extension
root, so `runtime.getURL('editor.html')` (no leading slash) is its address.
If `tabs.create` throws, the popup falls back to `window.open(url, '_blank')`.
`Settings` uses `chrome.runtime.openOptionsPage()`, falling back to
`chrome.tabs.create({ url: chrome.runtime.getURL('options.html') })`.

## Assumed contracts (imported, not recreated)

These modules are owned by parallel workers; the popup imports exactly the
shapes below. If a contract owner chose a different shape, this file's
assumptions are the reconciliation list.

- `src/lib/i18n/index.ts` —
  `t(locale: Locale, key: string, params?: Record<string, string | number>): string`,
  `Locale = 'en' | 'es' | 'pt'`. Every user-visible string goes through `t()`
  (brand name `ShrinkIt`, format codes `JPEG/PNG/…`, unit symbols, and `B/KB/MB`
  byte units are the only literals).
- `src/lib/settings/index.ts` —
  `getSettings(): Promise<Settings>`, `saveSettings(settings: Settings): Promise<void>`.
  `Settings` carries at least `locale: Locale` and `theme: 'light' | 'dark' | 'system'`.
  The popup additionally reads/writes `lastWidth`, `lastHeight`, `lastUnit`,
  `lastFormat`, `lastQuality`, `lastAspectLocked` on the settings object via
  defensive `Record` access (missing keys → "Last used" preset disabled).
  The popup re-loads settings on `chrome.storage.onChanged` so switcher changes
  apply without reopening the popup.
- `src/lib/image/process.ts` —
  `ImageProcessor.process(file: File, settings: ProcessSettings)` (static),
  where `ProcessSettings = { width: number | null; height: number | null;
unit: '%' | 'px' | 'cm' | 'inch'; format: 'jpeg' | 'png' | 'webp' | 'gif';
quality: number; keepAspectRatio: boolean }` (`null` dimension = auto).
  The result is normalised defensively: either a bare `Blob` or an object with
  `{ blob: Blob; fileName?: string }`.
- `src/components/LanguageSwitcher`, `src/components/ThemeSwitcher` —
  rendered bare (no props), self-contained selects. `ThemeSwitcher` is expected
  to set `data-theme` on `<html>`; the popup also applies it from settings
  (`system` resolves via `prefers-color-scheme`) so the theme is correct even if
  the switcher only writes storage.

## i18n keys used (all under `popup.*`)

`logo_alt`, `dropzone_label`, `dropzone_title`, `dropzone_hint` (`{max}`),
`browse`, `paste_hint`, `files_selected` (`{count}`, `{max}`), `remove` (`{name}`),
`presets_label`, `preset_50`, `preset_800`, `preset_20kb`, `preset_last_used`,
`width`, `height`, `auto`, `unit`, `unit_percent`, `unit_px`, `unit_cm`,
`unit_inch`, `format`, `aspect_lock`, `quality`, `resize`, `processing`,
`results_label`, `download`, `download_all`, `saved` (`{percent}`),
`open_editor`, `settings`, `dismiss`, `error_not_image`,
`error_too_many` (`{max}`), `error_no_files`, `error_process_failed` (`{name}`),
`error_download_failed`, `error_zip_failed`, `error_save_settings`.

## Notes / limits

- No mocks, no TODOs, no `console.*`. Errors are localised, dismissible banners;
  they are never silent. Settings-load failure falls back to defaults (English,
  50% preset) rather than breaking the popup.
- Images are never written to `chrome.storage` — they live only as in-memory
  blobs / object URLs. Preview URLs are revoked on remove / re-run.
- Theme: light surfaces by default; `[data-theme='dark']` overrides in
  `style.css`. Reduced-motion respected.
- GIF is offered as an output format per the popup spec; per ARCHITECTURE.md the
  engine decodes GIF input to a still frame — if the engine cannot encode GIF
  output, that file surfaces as a localised per-file error.
- **Not yet verified:** `tsc` / `eslint` / `prettier` / `wxt build` could not run
  here — `node_modules` is not installed and the imported contract modules
  (`src/lib/i18n`, `src/lib/settings`, `src/lib/image/process`,
  `src/components/LanguageSwitcher`, `src/components/ThemeSwitcher`) do not
  exist yet (parallel workers). Run the full gate after the contracts land.
