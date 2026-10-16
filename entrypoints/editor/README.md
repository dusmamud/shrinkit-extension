# Full Editor (editor.html)

Standalone full-page editor tab for the ShrinkIt Chrome Extension.
Opened from the popup ("Full Editor"), the context menu
("Resize with ShrinkIt"), or directly as `editor.html`.

## Files

- `entrypoints/editor/index.html` — WXT entrypoint shell (root div + `main.tsx`).
- `entrypoints/editor/main.tsx` — React root; imports global Tailwind CSS + `style.css`.
- `entrypoints/editor/style.css` — Light/dark theme tokens (`--ed-*`),
  checkerboard backdrop, two-line clamp, processing-dots animation,
  resize-mode slide-open, dropdown entrance, reduced-motion handling.
- `entrypoints/editor/Editor.tsx` — Header (logo + tool tabs + language +
  theme + settings link), tab routing, theme/language persistence,
  right-click preload.
- `src/components/MainResizer.tsx` — Faithful port of the web app's
  `ShrinkItApp`: dropzone + settings + results, batch up to 50.
- `src/components/Dropzone.tsx` — Drag-drop + browse + paste target with
  thumbnail strip, batch badge, and error banner.
- `src/components/SettingsPanel.tsx` — Size/format/quality/background
  controls. Includes the `CustomSelect` dropdown as a local helper
  (no separate file) and the resize-mode diagrams.
- `src/components/ResultPanel.tsx` — Single + multi result layouts,
  per-file download, copy-to-clipboard, Download All (ZIP), Clear.

## URL parameters

- `?tool=main|target50|target20|passport|social|compare` — initial tab.
- `?src=rightclick&key=<session key>` — preload one image handed off via
  `chrome.storage.session`: the stored value must be
  `{ name: string, dataUrl: string }`. It is converted to a `File` and fed
  to `MainResizer` once. A missing/expired key shows a localized error
  (`ext.right_click_failed`) instead of failing silently. When another
  tab is active, a localized banner offers to switch to the main tab
  where the image is loaded.

## Contracts (verified against the real modules in this repo)

- `src/lib/i18n/index` exports `t(locale, key, params?)` (plain string
  keys; a missing key returns the key itself, never throws) and type
  `Locale = "en" | "es" | "pt"`.
- `src/lib/settings/index` exports `getSettings(): Promise<Settings>`
  (never null, never throws), `saveSettings(patch: Partial<Settings>)`,
  and type `Settings` — the locale field is named **`language`**, not
  `locale`; theme is `Theme = "light" | "dark" | "system"`.
- `src/components/LanguageSwitcher` is a **named** export accepting
  `{ locale, onChange }`.
- `src/components/ThemeSwitcher` is a **named** export accepting
  `{ locale?, theme, onChange }`.
- `src/lib/image/process` exports `ImageProcessor`, `ProcessedImage`,
  `ProcessSettings`, `ProcessError`. Process errors are read duck-typed
  via `err.code` (`decode-failed`, `too-large`, `invalid-size`,
  `aborted`) so no `ProcessError` import is required.
- `src/lib/image/limits` exports `MAX_BATCH`, `UNIT_LIMITS`,
  `DPI_LIMITS`, `QUALITY_LIMITS`.
- `src/lib/image/filenames` exports `FORMAT_MIME`,
  `isSupportedInputFile`, `formatBytes`, `percentSaved`, `OutputFormat`.
- `src/lib/image/units` exports `SizeUnit`, `OriginalSize`,
  `getDefaultDimensionsForUnit`, `calculateProportionalDimension`.
- Tool components (TOOLS worker) at the exact paths/names, all **default**
  exports, and they take **no `settings` prop**:
  - `src/tools/target-size/TargetSizeTool` — props `{ targetKb, locale }`
  - `src/tools/passport/PassportTool` — props `{ locale }`
  - `src/tools/social/SocialTool` — props `{ locale }`
  - `src/tools/compare/CompareTool` — props `{ locale }`

## Interfaces actually used

```ts
// SettingsPanel.tsx
export type ResizeMode = 'stretch' | 'crop' | 'fit';
export interface SettingsState {
  width: string;
  height: string;
  unit: SizeUnit;
  locked: boolean;
  mode: ResizeMode;
  format: OutputFormat;
  quality: string;
  dpi: string;
  background: 'white' | 'black';
  preserveExif: boolean;
}
export interface SettingsPanelProps {
  settings: SettingsState;
  onChange: (patch: Partial<SettingsState>) => void;
  locale: Locale;
  originalSize?: OriginalSize | null;
  disabled?: boolean;
  onProcess?: () => void;
  processing?: boolean;
  queuedCount?: number;
  itemCount?: number;
  onClear?: () => void;
  onAbort?: () => void;
}

// Dropzone.tsx
export interface DropzoneProps {
  files: QueueItem[];
  onFiles: (files: File[]) => void;
  maxFiles: number;
  locale: Locale;
  disabled?: boolean;
  onRemove?: (id: string) => void;
  processing?: boolean;
  error?: string | null;
  failedFiles?: string[];
  onDismissError?: () => void;
}

// ResultPanel.tsx
export type ItemStatus = 'queued' | 'processing' | 'done' | 'error';
export interface QueueItem {
  id: string;
  file: File;
  previewUrl: string;
  status: ItemStatus;
  error?: string;
  result?: ProcessedImage;
  resultUrl?: string;
  background: 'white' | 'black';
  dims?: { width: number; height: number };
}
export interface ResultPanelProps {
  items: QueueItem[];
  onDownload: (item: QueueItem) => void;
  onDownloadAll: () => Promise<void> | void;
  onClear: () => void;
  onRemove: (id: string) => void;
  locale: Locale;
}

// MainResizer.tsx
export interface MainResizerProps {
  locale: Locale;
  initialFiles?: File[] | null;
  onInitialFilesConsumed?: () => void;
}
```

## i18n keys used

All web-app keys under `dropzone.*`, `settings.*`, `result.*`,
`errors.*`, `nav.resize`, `nav.tools`, `site.name`, `site.tagline`,
`footer.tools_50kb`, `footer.tools_20kb`, `footer.tools_passport`,
`footer.tools_social`, `footer.tools_compare` — plus these existing
extension keys (no new keys invented):

- `ext.open_settings` — label for the options-page button.
- `ext.right_click_failed` — right-click image could not be loaded
  (key missing/expired).
- `ext.right_click_title` — heading of the "image ready" banner shown
  when a preloaded file waits while another tab is active
  (with the file name appended; the button reuses `nav.resize`).

## Notes

- Downloads go through `chrome.downloads.download` with a blob URL;
  the URL is revoked 30s later. Anchor download is the fallback when
  the downloads API is unavailable.
- Download All builds the ZIP with `jszip` in memory, then downloads it
  the same way.
- No mock data, no `console.*` calls, no hardcoded user-visible English:
  every string goes through `t()`.
