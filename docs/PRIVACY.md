# Privacy Policy — ShrinkIt Chrome Extension

**Short version: your images never leave your device.** ShrinkIt processes everything locally in your browser. There are no uploads, no servers, no accounts, no analytics, and no tracking.

## What ShrinkIt does with your images

- Images you choose (file picker, drag-and-drop, popup, or right-click) are decoded, resized, and encoded **on your device**, inside your browser.
- Images stay on your device. They are **never uploaded** to any server, never sent to any third party, and never used for analytics, advertising, or model training.
- The resized output is saved only where you tell it to: your Downloads folder (as files, or as a ZIP for a batch).
- When you close the popup or the editor tab, in-memory image data goes away with it.

## Right-click flow

When you right-click an image and choose **“Resize with ShrinkIt”**:

1. The extension fetches the bytes of **that one image** — the one you clicked — so it can be resized. This fetch happens locally, in extension context (via the offscreen document), because many pages block cross-origin reads from page context.
2. The bytes are passed to the editor through `chrome.storage.session` — a short-lived, in-memory handoff that is cleared when the browser session ends, and cleared by the editor once consumed.
3. The image is processed locally, exactly like a file you picked yourself.

Nothing about this flow uploads, shares, or retains the image. The fetch is local-only: the bytes go from the image's source to your browser, and no further.

## What is stored

| Storage                  | What it holds                                                                                                                                                        | What it never holds                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `chrome.storage.sync`    | Settings only: language, theme, per-tool defaults. Small JSON. Syncs across your Chrome browsers.                                                                    | Images, image bytes, data URLs, blobs, browsing history, page contents. |
| `chrome.storage.session` | Short-lived handoff for the right-click flow: the bytes of the one image you just clicked, until the editor consumes them. In-memory; cleared when the session ends. | Anything long-term. It is never a cache and never synced.               |
| Downloads folder         | Output files you explicitly download.                                                                                                                                | Nothing else.                                                           |

No other data is written anywhere by the extension.

## What ShrinkIt does NOT do

- **No uploads.** No image, file, or pixel ever leaves your device.
- **No servers.** There is no backend. Processing needs no network connection (the only network use is fetching the one image you right-clicked, locally, so it can be processed locally).
- **No analytics.** No usage tracking, no event logging, no crash reporting, no telemetry of any kind.
- **No accounts.** No sign-in, no sign-up, no profile, no identifier tied to you.
- **No ads, no trackers.** No third-party scripts, no advertising SDKs, no tracking pixels.
- **No browsing history.** The extension does not read your history, your open tabs' contents, or the pages you visit — except fetching the single image you explicitly right-clicked.
- **No access to other extensions' or sites' data.** The extension cannot see your passwords, cookies, or data from other sites.

## Permissions

The permissions the extension requests, and why each is needed, are justified in [PERMISSIONS.md](PERMISSIONS.md). Every permission serves the single purpose of resizing images locally.

## Changes to this policy

If this policy ever changes, the change will be described in the extension's release notes and in this file before the new version is published. The core promise — images never leave your device — will not change.

## Contact

Questions about privacy: see the repository's issue tracker (linked from the project README). Do not send private images with a report — a description of the issue is enough.
