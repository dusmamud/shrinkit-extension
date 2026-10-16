# Offscreen document

`entrypoints/offscreen/index.html` + `entrypoints/offscreen/main.ts` —
invisible helper page (no UI, no user-visible content), created by the
background worker via `chrome.offscreen.createDocument({ reasons:
['BLOBS'], ... })` only when a right-clicked http(s) image needs
fetching.

## Why it exists

The MV3 service worker has no DOM and cannot reliably fetch
cross-origin image bytes. This page runs in a real page context, so it
can `fetch(srcUrl)` → `Blob` → `FileReader` data URL. It handles one
job and nothing else.

## Message protocol

Receives (broadcast via `chrome.runtime.onMessage`):

- `SHRINKIT_OFFSCREEN_FETCH` — `{ type, requestId, srcUrl }`.
  Starts the fetch; the reply is a separate message (see below), so
  the handler returns immediately.

Sends (via `chrome.runtime.sendMessage`):

- `SHRINKIT_OFFSCREEN_RESULT` —
  `{ type, requestId, ok, dataUrl?, name?, error? }`.
  `requestId` echoes the request so the background worker can match
  it to the pending fetch. On success `dataUrl` is the full image as
  a data URL and `name` is a sanitized filename derived from the URL
  path (extension kept when present, otherwise inferred from the
  response MIME type). On failure `error` is one of the machine
  codes `timeout` | `fetch-failed` | `empty-body` | `read-failed` —
  never user-facing copy. The background maps any failure to the
  Editor reason `cors`, and the Editor renders the localized string.

## Limits

- Fetch aborts after 60 s (`AbortController`). The background worker
  has its own 65 s backstop.
- Large images: the whole blob is held in memory as a data URL
  (base64, ~33% overhead) — same cost the Editor pays to hold the
  image anyway. No chunking: the handoff is a single data URL in
  session storage by design.

## Permissions / privacy

Created with justification: "Fetch bytes of an image the user
right-clicked, to resize locally. No data leaves the device." Fetched
bytes are returned to the background worker and stored only in
`chrome.storage.session`. Nothing is uploaded anywhere.
