# Tools — Target Size, Passport, Social, Compare

Ported from the ShrinkIt web app (`~/workspace/shrinkit/src/tools/`, read-only
source). Each tool owns its own dropzone (`<input type="file">` + drag-drop
inside the component), preview, settings, processing state, localized errors,
and download. The editor never supplies a Dropzone for these tools.

Styling: Tailwind + Poppins (inherited from the extension stylesheet) + blue
`#007bff` / hover `#016df0`, responsive (`flex-col` → `md:flex-row` cards).

No mocks, no TODOs, no `console.log`. Every user-visible string goes through
`t()` — except language-neutral symbols (`KB`, `px`, `DPI`, `mm`, `%`, `×`)
and the contracted English preset `label` fields (see below), which the UI
never renders directly.

## Files

| File                              | Exports                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| `target-size/TargetSizeTool.tsx`  | default `TargetSizeTool({ targetKb, locale })`                                        |
| `target-size/targetCompressor.ts` | `compressToTargetKb`, `TargetFormat`, `TargetCompressResult`, `TargetCompressOptions` |
| `passport/PassportTool.tsx`       | default `PassportTool({ locale })`                                                    |
| `passport/passportEngine.ts`      | `PASSPORT_PRESETS`, `makePassportPhoto`, `PassportPreset`                             |
| `social/SocialTool.tsx`           | default `SocialTool({ locale })`                                                      |
| `social/socialEngine.ts`          | `SOCIAL_PRESETS`, `resizeToPreset`, `SocialPreset`, `SocialFitMode`                   |
| `compare/CompareTool.tsx`         | default `CompareTool({ locale })`                                                     |

## Component props

- `TargetSizeTool`: `{ targetKb: number; locale: Locale }`. Re-compresses
  automatically when the `targetKb` prop, the format, or the file changes.
- `PassportTool`, `SocialTool`, `CompareTool`: `{ locale: Locale }`.

## Engine contracts

### `compressToTargetKb(file: File, targetKb: number, opts: { format: 'jpeg' | 'png' | 'webp' })`

Returns `Promise<{ blob: Blob; bytes: number; quality: number; width: number; height: number }>`.
Binary-searches JPEG/WebP quality (8 iterations, early stop within 2% /
500 bytes of the ceiling), then a bounded scale-down loop (×0.85 per step,
max 12 steps, min 64 px). PNG is lossless: one encode per size, scaling only.
Throws coded errors the caller maps to localized text:

- `invalid-target` — `targetKb` is not a positive finite number.
- `decode-failed` — the input could not be decoded as an image.
- `encode-failed` — no 2D canvas context / blob encode failed.
- `target-unreachable` — honest failure: no quality/dimension combination
  fits the ceiling, so no over-target blob is ever returned.

If the input already fits the ceiling and its MIME type matches the
requested format, it is returned untouched (quality `100`).

### `PASSPORT_PRESETS` / `makePassportPhoto(file, preset): Promise<Blob>`

```ts
PASSPORT_PRESETS = [
  { id: 'in-35x45', label: 'India 35×45mm', width: 413, height: 531, dpi: 300 },
  { id: 'us-2x2', label: 'US 2×2 inch', width: 600, height: 600, dpi: 300 },
];
```

Center-crop to the preset aspect ratio (30% top bias for tall sources so
heads stay framed), resize to exact preset pixels, white background, JPEG
0.92. Throws `decode-failed` / `encode-failed`.

### `SOCIAL_PRESETS` / `resizeToPreset(file, preset, fitMode?): Promise<Blob>`

```ts
SOCIAL_PRESETS = [
  { id: 'ig-square', label: 'Instagram Square', width: 1080, height: 1080 },
  { id: 'ig-story', label: 'Instagram Story / Reel', width: 1080, height: 1920 },
  { id: 'yt-thumb', label: 'YouTube Thumbnail', width: 1280, height: 720 },
  { id: 'li-banner', label: 'LinkedIn Banner', width: 1584, height: 396 },
  { id: 'fb-post', label: 'Facebook Post', width: 1200, height: 630 },
  { id: 'x-post', label: 'X Post', width: 1600, height: 900 },
];
```

`fitMode` defaults to `'crop-fill'` (center-crop to fill). `'fit-pad'` fits
the whole photo inside with a dark `#121214` pad so nothing is cropped.
JPEG 0.92. Throws `decode-failed` / `encode-failed`.

**Preset labels:** the `label` fields above are the contracted English
identifiers. The tools never render them; preset names come from `t()` keyed
by preset `id` (see the i18n list), so the UI is fully localized.

## Assumptions the integrator must confirm

1. **`t` signature.** All tools call `t(locale, key, inputs?)` — locale first,
   then a static message key, then an optional `{ name: string | number }`
   placeholder map (mirrors the web app's `t`). If the extension's
   `lib/i18n/index` uses a different signature, these call sites need an
   adapter; the keys and placeholders below are unchanged.
2. **Keys are static literals.** Every `t()` call uses a literal key (no
   dynamic key construction), so a union-typed `MessageKey` typechecks.
3. **`ProcessSettings` shape (CompareTool only).** `CompareTool` calls
   `ImageProcessor.process(file, settings)` with the web app's settings
   shape: `{ width, height, unit: 'pixels', dpi: 300, format: 'jpeg',
quality, background: 'white', preserveExif: false, mode: 'stretch' }`,
   and reads `ProcessedImage.data: Uint8Array`. If the extension's
   `lib/image/process` defines `ProcessSettings` differently, that one call
   site must be reconciled. If the processor throws at runtime, the tool
   falls back to a plain canvas JPEG encode at the same quality.
4. **`FORMAT_MIME`.** `targetCompressor` reads `FORMAT_MIME[format]` and
   `CompareTool` uses `FORMAT_MIME.jpeg` for the processor-output blob type.
5. **`chrome.downloads`.** Downloads go through
   `chrome.downloads.download({ url, filename, saveAs: false })` with a
   blob URL; any failure (or a missing `chrome.downloads`) falls back to an
   `<a download>` click. Blob URLs are revoked 60 s after the download call.
   Requires the `downloads` permission (already in the manifest).
6. **Object URLs** for previews are revoked when replaced/unmounted via
   effect cleanup.

## i18n keys required (en / es / pt)

Placeholders are `{name}` style. The i18n worker must provide every key
below; tools call `t(locale, key)` or `t(locale, key, { ... })` exactly as
listed.

### Target size — `tools.targetSize.*`

| Key                                       | Placeholders        | Notes                            |
| ----------------------------------------- | ------------------- | -------------------------------- |
| `badge`                                   | —                   | e.g. "100% In-Browser & Private" |
| `title`                                   | —                   |                                  |
| `subtitle`                                | —                   |                                  |
| `chooseTarget`                            | —                   |                                  |
| `custom`                                  | —                   | label before the custom KB input |
| `formatLabel`                             | —                   |                                  |
| `formatJpeg` / `formatPng` / `formatWebp` | —                   | "JPEG" / "PNG" / "WebP"          |
| `dropTitle`                               | —                   |                                  |
| `dropHint`                                | `{ kb }`            |                                  |
| `originalFile`                            | —                   |                                  |
| `targetOutput`                            | —                   |                                  |
| `dimensions`                              | `{ width, height }` | e.g. "1024 × 768 px"             |
| `quality`                                 | `{ quality }`       | e.g. "Quality: 82%"              |
| `underTarget`                             | `{ kb, bytes }`     | success line                     |
| `processing`                              | `{ kb }`            |                                  |
| `download`                                | —                   |                                  |
| `changePhoto`                             | —                   |                                  |
| `remove`                                  | —                   |                                  |
| `errorGeneric`                            | —                   |                                  |
| `errorDecode`                             | —                   |                                  |
| `errorUnreachable`                        | `{ kb }`            | target cannot be reached         |
| `errorInvalidTarget`                      | —                   |                                  |
| `errorNotImage`                           | —                   | selected file is not an image    |

### Passport — `tools.passport.*`

| Key                                              | Placeholders             | Notes                             |
| ------------------------------------------------ | ------------------------ | --------------------------------- |
| `badge`                                          | —                        | e.g. "Official 300 DPI Standards" |
| `title` / `subtitle`                             | —                        |                                   |
| `chooseSpec`                                     | —                        |                                   |
| `presetIn`                                       | —                        | "India 35×45mm"                   |
| `presetUs`                                       | —                        | "US 2×2 inch"                     |
| `dropTitle`                                      | —                        |                                   |
| `dropHint`                                       | `{ width, height, dpi }` |                                   |
| `physicalSize`                                   | —                        | label                             |
| `resolution`                                     | —                        | label                             |
| `background`                                     | —                        | label                             |
| `backgroundWhite`                                | —                        | "Solid Pure White"                |
| `fileSize`                                       | —                        | label                             |
| `compliant`                                      | —                        | standards note                    |
| `processing`                                     | —                        |                                   |
| `download` / `changePhoto` / `remove`            | —                        |                                   |
| `errorGeneric` / `errorDecode` / `errorNotImage` | —                        |                                   |
| `guidelinesTitle`                                | —                        |                                   |
| `guideline1` … `guideline4`                      | —                        | checklist items                   |

### Social — `tools.social.*`

| Key                                              | Placeholders                | Notes                          |
| ------------------------------------------------ | --------------------------- | ------------------------------ |
| `badge`                                          | —                           |                                |
| `title` / `subtitle`                             | —                           |                                |
| `choosePreset`                                   | —                           |                                |
| `presetIgSquare`                                 | —                           | "Instagram Square"             |
| `presetIgStory`                                  | —                           | "Instagram Story / Reel"       |
| `presetYtThumb`                                  | —                           | "YouTube Thumbnail"            |
| `presetLiBanner`                                 | —                           | "LinkedIn Banner"              |
| `presetFbPost`                                   | —                           | "Facebook Post"                |
| `presetXPost`                                    | —                           | "X Post"                       |
| `modeLabel`                                      | —                           |                                |
| `modeCrop`                                       | —                           | "Crop to Fill"                 |
| `modeFit`                                        | —                           | "Fit & Pad Borders"            |
| `dropTitle`                                      | —                           |                                |
| `dropHint`                                       | `{ width, height, aspect }` | `aspect` like "16:9"           |
| `platform`                                       | —                           | label                          |
| `aspectRatio`                                    | —                           | label                          |
| `dimensions`                                     | —                           | label                          |
| `processing`                                     | `{ name }`                  | `name` = localized preset name |
| `download` / `changePhoto` / `remove`            | —                           |                                |
| `errorGeneric` / `errorDecode` / `errorNotImage` | —                           |                                |

### Compare — `tools.compare.*`

| Key                                              | Placeholders  | Notes                               |
| ------------------------------------------------ | ------------- | ----------------------------------- |
| `badge`                                          | —             |                                     |
| `title` / `subtitle`                             | —             |                                     |
| `modeGenerate`                                   | —             | "Generate compressed version"       |
| `modeTwoFiles`                                   | —             | "Compare two files"                 |
| `dropTitle`                                      | —             | upload original                     |
| `dropHint`                                       | —             |                                     |
| `dropCompressedTitle`                            | —             | upload compressed file              |
| `dropCompressedHint`                             | —             |                                     |
| `qualityLabel`                                   | —             | "Compression Quality:"              |
| `originalLeft`                                   | —             | "Original (Left)"                   |
| `compressedRight`                                | —             | "Compressed (Right)"                |
| `originalLabel`                                  | `{ percent }` | overlay chip, e.g. "Original (50%)" |
| `compressedLabel`                                | `{ percent }` | overlay chip                        |
| `sliderLabel`                                    | —             | aria-label for the divider slider   |
| `processing`                                     | —             |                                     |
| `download` / `changePhoto` / `remove`            | —             |                                     |
| `errorGeneric` / `errorDecode` / `errorNotImage` | —             |                                     |

## CompareTool modes

- **Generate (default):** one upload + quality slider (10–95, default 65).
  The compressed side is regenerated on every slider change; stale runs are
  ignored via a run id.
- **Two files:** upload an original, then upload a second (already
  compressed) file; the quality slider is hidden in this mode.
- The divider is a 0–100 range input plus pointer/touch drag on the
  container. The original is clipped to the left of the divider
  (`clipPath: inset(0 ${100 - pos}% 0 0)`); the compressed image sits behind
  it. Both size badges show live byte sizes and the saved percentage.
