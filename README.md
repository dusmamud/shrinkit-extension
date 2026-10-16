# ShrinkIt — Image Resizer (Chrome Extension)

Shrink, compress, and convert images entirely in your browser. No sign-up, no uploads, no watermarks. 100% private.

ShrinkIt is a Chrome extension (Manifest V3, built with WXT + React + TypeScript + Tailwind CSS). It has one purpose: **resize, compress, and convert images you select, locally on your device.**

## What it does

- **Popup quick resize** — Resize 1–5 images fast from the toolbar popup: pick a preset, click Resize + Download, done. A Full Editor button opens the complete editor.
- **Full Editor (new tab)** — All 6 tools in one place:
  1. Main resizer — resize by dimensions, percentage, or target file size
  2. Compress to 50 KB — hit a 50 KB target
  3. Compress to 20 KB — hit a 20 KB target
  4. Passport Photo Maker — passport-size photos
  5. Social Media Resizer — sizes for common social formats
  6. Compare Images — compare original vs. resized side by side
- **Batch** — up to 50 images at a time in the Full Editor.
- **Right-click** — Right-click any image on any page and choose **Resize with ShrinkIt** to send it straight to the editor.
- **Languages** — English, Spanish, and Portuguese (en / es / pt).
- **Settings sync** — Your settings (language, theme, defaults) sync across your Chrome browsers via `chrome.storage.sync`. Images are never synced or stored.
- **100% local** — Every image is processed on your device. Nothing is uploaded to any server, ever.

## What it does NOT do

- No uploads, no servers, no accounts, no analytics, no tracking.
- No watermarks, no paid gating. All features are free.
- No mock or placeholder data. What you see is what the extension actually does.

See [docs/PRIVACY.md](docs/PRIVACY.md) for the full privacy statement.

## Install (development / local build)

Prerequisites: Node.js (LTS) and npm.

```bash
npm install
npm run dev
```

Then load the extension in Chrome:

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select the `.output/chrome-mv3` folder inside this project.

Production build:

```bash
npm run build   # outputs to .output/chrome-mv3
npm run zip     # produces a distributable .zip for the Chrome Web Store
```

> Status: this project is a **local build only**. GitHub push and Chrome Web Store listing are **not done** yet.

## Project tree

```
shrinkit-extension/
├── entrypoints/
│   ├── popup/        # Toolbar popup — quick resize (1–5 images)
│   ├── editor/       # Full Editor page — all 6 tools, batch up to 50
│   ├── background/   # Service worker — context menu, right-click routing
│   ├── options/      # Options page — settings
│   ├── offscreen/    # Offscreen document — fetches right-clicked images
│   └── content/      # Content script — page-side support for right-click flow
├── src/
│   ├── lib/          # Image engine, i18n, settings
│   ├── tools/        # The 6 tool definitions (shared by popup + editor)
│   ├── components/   # Shared React components
│   ├── i18n/         # en / es / pt message catalogs
│   └── styles/       # Global styles (Tailwind)
├── public/
│   └── icons/        # Extension icons (copied from the ShrinkIt web app)
├── tests/
│   └── unit/         # Vitest unit tests
├── docs/             # PERMISSIONS.md, PRIVACY.md, docs index
├── wxt.config.ts     # WXT config + manifest (permissions, icons)
├── package.json
├── README.md
├── ARCHITECTURE.md
└── CONTRIBUTING.md
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for how the pieces fit together.

## Permissions

| Permission                     | Why it is needed                                                                                                                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`                      | Save settings (language, theme, defaults) and sync them via `chrome.storage.sync`. Never images.                                                                                          |
| `downloads`                    | Save your resized images to your Downloads folder.                                                                                                                                        |
| `contextMenus`                 | Add “Resize with ShrinkIt” to the right-click menu on images.                                                                                                                             |
| `tabs`                         | Open the Full Editor in a new tab from the popup or the context menu.                                                                                                                     |
| `offscreen`                    | Run an offscreen document that fetches a right-clicked image's bytes (service workers cannot use DOM/Canvas).                                                                             |
| `host_permissions: <all_urls>` | Fetch the bytes of an image you right-clicked, including images on pages where the page itself blocks cross-origin reads (CORS). The bytes are processed locally and never sent anywhere. |

Full justification, including what each permission does **not** do, is in [docs/PERMISSIONS.md](docs/PERMISSIONS.md).

## Privacy summary

- Images stay on your device. They are never uploaded, never sent to a server, never used for analytics.
- `chrome.storage.sync` holds only small settings (language, theme, defaults) — never images.
- No accounts, no sign-in, no analytics, no third-party trackers.
- The right-click fetch loads the image you clicked, locally, so it can be resized locally.

Full statement: [docs/PRIVACY.md](docs/PRIVACY.md).

## Docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — entrypoints, image engine, message protocol, data flow.
- [CONTRIBUTING.md](CONTRIBUTING.md) — setup, scripts, code style, PR checklist.
- [docs/README.md](docs/README.md) — index of the `docs/` folder.
- [docs/PERMISSIONS.md](docs/PERMISSIONS.md) — permission-by-permission justification.
- [docs/PRIVACY.md](docs/PRIVACY.md) — privacy policy.

## License

MIT — see [LICENSE](LICENSE).

```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Related project

The ShrinkIt web app (same 100%-client-side approach) lives in a separate repository. This extension reuses its logo and icons, and mirrors its tools — it does not depend on the web app at runtime.
```

---

## Testing on laptop

Use this flow to test the extension in real Chrome. The sandbox cannot prove how the popup/editor actually look — only this laptop check can.

```bash
git pull
npm install
npm run build
```

Then load the built extension in Chrome:

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select the `.output/chrome-mv3` folder inside this project.
5. Open the popup from the toolbar, and open the Full Editor (popup → "Open Full Editor", or right-click an image → **Resize with ShrinkIt**).
6. Check: popup looks like the ShrinkIt web app (not basic/broken), editor header logo is small (not full-screen), all 6 tools render, and a real BMP / AVIF file uploads.

> If popup/editor looks broken, run `npm run check:css`. That guard checks the built CSS actually contains Tailwind utilities. If it fails, the Tailwind wiring is broken again — do not judge the UI until `check:css` passes and you have rebuilt. (Built CSS proof: `npm run check:css` PASS — 53,676 bytes, 3/3 Tailwind markers, logo pinned.)

Supported formats: Input — JPG / JPEG, PNG, GIF, WebP, BMP, AVIF. Output — JPG, PNG, WebP, GIF. SVG is NOT supported.
