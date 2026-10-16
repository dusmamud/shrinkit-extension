# Image engine (`src/lib/image/`)

The real, dependency-free-of-the-UI image pipeline, ported from the ShrinkIt
web app (`~/workspace/shrinkit/src/lib/image/`). 100% client-side, no uploads.

| File                  | Purpose                                                                                                                                                                                                                                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `engine.ts`           | Full pipeline: decode (EXIF-orientation aware) → validate → resize (stretch / crop / fit) → flatten → encode → DPI. Exports `processImageBytes` / `processBytes` (low-level bytes-in/bytes-out, used by the tools workers), `ProcessError`, `ProcessSettings`, `ProcessedImage`, plus re-exports of the filename / limits / units surface. |
| `process.ts`          | Main-thread API: `ImageProcessor.process(file, settings)` and `ImageProcessor.processBytes(bytes, fileName, settings)` (both accept an optional `AbortSignal`). Routes through the worker, falls back to the main thread on any worker failure.                                                                                            |
| `processor.worker.ts` | Dedicated Web Worker wrapping the engine. Protocol: `{ id, fileName, data: ArrayBuffer, settings }` → `{ id, ok, result \| { code, message } }`. Buffers are transferred, not copied.                                                                                                                                                      |
| `dpi.ts`              | Honest DPI metadata: JPEG EXIF via piexifjs (incl. EXIF-preserve with Orientation reset to 1), PNG pHYs chunk by hand. WebP/GIF carry no standard DPI container — bytes untouched.                                                                                                                                                         |
| `filenames.ts`        | Output names, MIME/extension maps, accepted inputs, `formatBytes`, `percentSaved`. Pure functions.                                                                                                                                                                                                                                         |
| `limits.ts`           | Safety guards: max/warn megapixels, max input/output side, batch cap, unit/DPI/quality limits. Pure functions.                                                                                                                                                                                                                             |
| `units.ts`            | Unit conversion (`percent` / `pixels` / `cm` / `inches`), crop-rect and fit-dim math. Pure functions.                                                                                                                                                                                                                                      |
| `*.d.ts`              | Hand-written type shims for `pica`, `gifenc`, `piexifjs` (none ship types).                                                                                                                                                                                                                                                                |

Notes:

- Decode uses `createImageBitmap` with `imageOrientation: 'from-image'`,
  with an `exifr` fallback for engines that ignore the option.
- Resize uses `pica` (Lanczos) with a native Canvas 2D fallback if pica fails.
- JPEG/PNG/WebP encode via canvas blobs; GIF via `gifenc` (256-colour quantize).
- No Astro, no `import.meta.env`, no `document` access in worker paths.
  `OffscreenCanvas` is used when available; `document.createElement` is only
  a main-thread fallback.
- Errors are `ProcessError` with a typed `code`
  (`decode-failed` | `too-large` | `invalid-size` | `encode-failed` | `aborted`).
