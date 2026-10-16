# Permissions — ShrinkIt Chrome Extension

This page justifies every permission the extension requests, for users and for Chrome Web Store review. The extension has a **single purpose**: resize, compress, and convert images the user selects, entirely locally on their device.

Single-purpose statement: ShrinkIt does one thing — it takes images the user chooses (from the popup, the Full Editor, or a right-click on an image) and produces resized / compressed / converted copies on the same device. It has no other purpose, no background data collection, and no secondary features that use these permissions.

## `storage`

**Why needed:** Save the user's settings (language, theme, per-tool defaults) and sync them across the user's Chrome browsers via `chrome.storage.sync`. The Options page, popup, and editor all read from this one settings store.

**What it does NOT do:**

- It never stores images, image bytes, data URLs, or blobs.
- It never stores browsing history, page contents, or personal data.
- It holds only small settings JSON (strings, numbers, booleans).

## `downloads`

**Why needed:** Save the resized images the user produces to their Downloads folder (single files, or a ZIP for a batch). Without this permission the extension could not deliver its core output.

**What it does NOT do:**

- It downloads nothing except files the user explicitly produced by clicking Resize + Download (or Download in the editor).
- It never downloads anything in the background, never downloads from remote servers, and never writes outside the user's Downloads folder.

## `contextMenus`

**Why needed:** Add one menu item — **“Resize with ShrinkIt”** — to the right-click menu when the user right-clicks an image. This is the entry point for the right-click flow.

**What it does NOT do:**

- It adds nothing to any other context (no menu items on pages, links, selections, or non-image elements).
- It does not read, modify, or monitor anything until the user clicks the menu item.

## `tabs`

**Why needed:** Open the Full Editor in a new tab when the user clicks **Full Editor** in the popup, or **Resize with ShrinkIt** in the right-click menu. The editor is a full-page experience (6 tools, batch of 50) that does not fit in a popup.

**What it does NOT do:**

- It does not read tab URLs, tab titles, or browsing history.
- It does not modify, close, or reorder the user's existing tabs.
- It only opens one new tab, and only in direct response to a user click.

## `offscreen`

**Why needed:** Run an offscreen document that fetches the bytes of an image the user right-clicked. In Manifest V3 the service worker has no DOM or Canvas, so it cannot fetch-then-decode an image itself. The offscreen document does that one job and hands the bytes back for the editor.

**What it does NOT do:**

- It does not display anything to the user, play audio, or run in the background beyond the single fetch.
- It does not access pages, scrape content, or run on pages the user visits.

## `host_permissions: <all_urls>`

**Why needed:** Fetch the bytes of an image the user right-clicked, on any site. Many pages serve images from CDNs or with headers that block cross-origin reads from page context (CORS). Fetching in extension context (the offscreen document) is the only reliable way to get the bytes of the image the user explicitly chose. Without this host permission, right-click resize would fail on a large share of real sites.

**What it does NOT do:**

- It does not fetch anything unless the user right-clicks an image and chooses “Resize with ShrinkIt”.
- It does not read, scan, or monitor pages the user visits. No content is fetched, stored, or analysed except the single image the user clicked.
- The fetched bytes are processed locally and **never sent anywhere** — no upload, no server, no analytics. See [PRIVACY.md](PRIVACY.md).
- It does not inject scripts into pages, modify pages, or bypass any site's login or paywall — it only fetches the same image bytes the browser already loaded for display.

## Summary

| Permission                     | Minimal use                                                   |
| ------------------------------ | ------------------------------------------------------------- |
| `storage`                      | Settings only (sync). Never images.                           |
| `downloads`                    | Save user-produced output to Downloads.                       |
| `contextMenus`                 | One menu item on images.                                      |
| `tabs`                         | Open the Full Editor tab on user click.                       |
| `offscreen`                    | Fetch a right-clicked image's bytes.                          |
| `host_permissions: <all_urls>` | Make that fetch work on any site, for the clicked image only. |

No other permissions are requested. If a future version ever needs a new permission, this page and the README permissions table will be updated with its justification before it ships.
