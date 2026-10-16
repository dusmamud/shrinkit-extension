# Background service worker

`entrypoints/background/index.ts` — Manifest V3 service worker (WXT `defineBackground`).
No DOM, no `URL.createObjectURL`, no canvas. It owns the right-click
handoff and opening the Full Editor.

## What it does

- On install/update: creates the `Resize with ShrinkIt` context-menu
  entry (`contexts: ['image']`). `removeAll` first — re-creating a
  duplicate menu id throws.
- On context-menu click for that entry: dispatches on `info.srcUrl`
  (see "Right-click handling" below).
- Listens for `SHRINKIT_OPEN_EDITOR` (from popup / Editor / Options)
  and opens the Editor tab with `?tool=<tool>`.

## Right-click handling by URL kind

| `srcUrl` scheme         | Path                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data:image/...`        | Already in-memory. Stored directly in `chrome.storage.session` under `rc-<timestamp>` as `{ name, dataUrl }`, then Editor opens with `?src=rightclick&key=<key>&tool=main`. No fetch.                                                                                                                                                                                   |
| `http://` / `https://`  | Delegated to the offscreen document (`entrypoints/offscreen/`), which fetches the bytes in a page context and returns a data URL. Background stores it in session storage and opens the Editor the same way. On any fetch failure (CORS, network, timeout) it stores `rc-error-<timestamp> = 'cors'` and opens the Editor with `?src=error&reason=cors` — never silent. |
| `blob:`                 | Only the creating page can fetch it. Background sends `SHRINKIT_FETCH_BLOB` to the content script in the source tab (`entrypoints/content/`), which converts it to a data URL. Same session-store + open flow. If the content script is absent (chrome:// pages, extension pages, blocked injection) or the fetch fails, Editor opens with `?src=error&reason=blob`.    |
| anything else / missing | Editor opens with `?src=error&reason=unknown`.                                                                                                                                                                                                                                                                                                                          |

## Message protocol

Background **receives**:

- `SHRINKIT_OFFSCREEN_RESULT` — `{ type, requestId, ok, dataUrl?, name?, error? }`
  from the offscreen document. Resolves/rejects the pending fetch with
  the matching `requestId`. `error` is a machine code
  (`timeout` | `fetch-failed` | `empty-body` | `read-failed`), never
  user-facing copy.
- `SHRINKIT_OPEN_EDITOR` — `{ type, tool? }` from popup / Editor /
  Options. `tool` must be one of `main`, `compress-50kb`,
  `compress-20kb`, `passport`, `social`, `compare`; anything else
  falls back to `main`.

Background **sends**:

- `SHRINKIT_OFFSCREEN_FETCH` — `{ type, requestId, srcUrl }` to the
  offscreen document. The reply comes back as a separate
  `SHRINKIT_OFFSCREEN_RESULT` message (broadcast), correlated by
  `requestId`. Background-side timeout is 65 s (offscreen aborts at
  60 s), so a hung fetch cannot leak a pending entry.
- `SHRINKIT_FETCH_BLOB` — `{ type, srcUrl }` via
  `chrome.tabs.sendMessage(tabId, ...)` to the content script.
  The reply is the `sendResponse` payload
  `{ ok, dataUrl?, name?, error? }`.

## Storage policy

- Right-clicked images go ONLY in `chrome.storage.session` under a
  one-shot key (`rc-<timestamp>`). Session storage is cleared when the
  browser closes and is never synced — images must never land in
  `chrome.storage.sync` (quota + privacy).
- Error handoffs store a short reason code (`rc-error-<timestamp>`),
  not the image, so the Editor can show a localized error.
- The Editor owns reading + deleting the one-shot key after load
  (this worker does not delete it — the Editor may need a retry).

## Permissions used here

- `contextMenus` — the right-click entry.
- `tabs` — open the Editor tab; send a message to the source tab.
- `offscreen` — create the offscreen document for http(s) fetches.
- `storage` — session storage for the one-shot handoff keys.
- `host_permissions: <all_urls>` — so the offscreen document can fetch
  the bytes of a right-clicked image from any origin (CDN / CORS-blocked
  pages). Bytes are processed locally and never sent anywhere.
