// ShrinkIt background service worker (Manifest V3).
//
// Owns: the "Resize with ShrinkIt" image context-menu entry, the
// right-click image handoff (data: / http(s) / blob: URLs), and the
// SHRINKIT_OPEN_EDITOR message that opens the Full Editor tab.
//
// Editor URLs use the shared hash-routing scheme (see docs/ROUTING.md
// and src/router/): `editor.html[?query]#/route` — the query string
// always comes BEFORE the hash, and the route is a hash route
// (`#/`, `#/tools`, `#/tools/compress-to-50kb`, …). Right-click and
// error landings always open Home (`#/`). The background NEVER emits
// a legacy tool URL; a legacy slug arriving inside a
// SHRINKIT_OPEN_EDITOR message is mapped to its hash route via the
// shared router table (src/router/routes.ts).
//
// The service worker has NO DOM, NO URL.createObjectURL and NO canvas.
// Every byte-fetch that needs a DOM/network context is delegated:
//  - http(s) URLs -> the offscreen document (entrypoints/offscreen/)
//  - blob: URLs   -> the content script in the source tab
//    (entrypoints/content/), because blob: URLs are only fetchable
//    from the page that created them.
//
// Images are NEVER stored in chrome.storage.sync (quota + privacy).
// Right-clicked images live only in chrome.storage.session under a
// one-shot key (rc-<timestamp>) that the Editor reads once and deletes.
// User-facing copy lives in src/i18n/messages/*.json (I18N worker);
// this file only passes machine-readable reason codes ('cors',
// 'blob', 'unknown') in the Editor URL — the Editor maps each code to
// a localized string. The only literal English in this file is the
// product name in the context-menu title and the offscreen
// justification string, both required by the Chrome APIs.

import { defineBackground } from 'wxt/utils/define-background';

import { buildHash } from '../../src/router/hash';
import { legacyToolToRoute, type Route } from '../../src/router/routes';

const MENU_ID = 'shrinkit-resize';
const EDITOR_PAGE = 'editor.html';
const OFFSCREEN_PAGE = 'offscreen.html';
const OFFSCREEN_TIMEOUT_MS = 65_000;

type OffscreenResultMessage = {
  type: 'SHRINKIT_OFFSCREEN_RESULT';
  requestId: string;
  ok: boolean;
  dataUrl?: string;
  name?: string;
  error?: string;
};

type OpenEditorMessage = {
  type: 'SHRINKIT_OPEN_EDITOR';
  tool?: unknown;
};

type ContentFetchResponse = {
  ok?: boolean;
  dataUrl?: string;
  name?: string;
  error?: string;
};

type PendingFetch = {
  resolve: (value: { dataUrl: string; name: string }) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

// Pending offscreen fetches, keyed by requestId. The offscreen
// document answers via chrome.runtime.sendMessage, so the request
// and the response arrive on different channels.
const pendingFetches = new Map<string, PendingFetch>();

/**
 * Build an Editor URL: `base[?query]#/route`. The query string always
 * comes BEFORE the hash — anything after the first `#` is fragment, so
 * a query placed after the hash would be invisible to URLSearchParams.
 * The hash is produced by the shared router's buildHash, so the
 * background can never emit a route the Editor does not understand.
 * Pure function (takes the base URL explicitly) so tests can call it
 * without a chrome runtime.
 */
export function buildEditorUrl(
  baseUrl: string,
  params: Record<string, string>,
  route: Route,
): string {
  const query = new URLSearchParams(params).toString();
  return query ? `${baseUrl}?${query}${buildHash(route)}` : `${baseUrl}${buildHash(route)}`;
}

function openEditor(params: Record<string, string>, route: Route): Promise<void> {
  return chrome.tabs
    .create({ url: buildEditorUrl(chrome.runtime.getURL(EDITOR_PAGE), params, route) })
    .then(() => undefined);
}

async function openErrorEditor(reason: string): Promise<void> {
  const key = `rc-error-${Date.now()}`;
  try {
    await chrome.storage.session.set({ [key]: reason });
  } catch (error) {
    // Session storage failing must not leave the user with a silent
    // no-op: the Editor still shows the localized error from ?reason=.
    console.warn('ShrinkIt: session storage write failed for error key', error);
  }
  await openEditor({ src: 'error', reason, key }, '/');
}

function fileNameForDataUrl(dataUrl: string, fallbackBase: string): string {
  const mimeMatch = /^data:([^;,]+)/.exec(dataUrl);
  const extByMime: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp',
    'image/x-icon': 'ico',
  };
  const ext = mimeMatch ? (extByMime[mimeMatch[1]] ?? 'png') : 'png';
  return `${fallbackBase}.${ext}`;
}

// SVG is vector, not raster: the resize engine cannot resize it, so
// SVG right-clicks must never reach the preload path. Detection is
// exactly the two signals defined for this handoff: a .svg source URL
// (query/hash stripped, case-insensitive) or an SVG data-URL MIME.
// SVG reuses the existing 'unknown' error path deliberately: the
// Editor only distinguishes 'cors' from a generic failure, and a new
// 'svg' code would render as the same generic banner without an Editor
// change (Editor.tsx is owned by another worker). 'unknown' is
// honest — it shows the generic "could not load" banner, never a
// success state, and never claims SVG works.
function isSvgSourceUrl(srcUrl: string): boolean {
  if (srcUrl.startsWith('data:image/svg+xml')) {
    return true;
  }
  const bare = srcUrl.split(/[?#]/, 1)[0].toLowerCase();
  return bare.endsWith('.svg');
}

function isSvgDataUrl(dataUrl: string): boolean {
  return dataUrl.startsWith('data:image/svg+xml');
}

async function ensureOffscreenDocument(): Promise<void> {
  if (typeof chrome.offscreen === 'undefined') {
    throw new Error('offscreen-api-unavailable');
  }
  const hasDocument =
    typeof chrome.offscreen.hasDocument === 'function'
      ? await chrome.offscreen.hasDocument()
      : false;
  if (hasDocument) {
    return;
  }
  try {
    await chrome.offscreen.createDocument({
      justification:
        'Fetch bytes of an image the user right-clicked, to resize locally. No data leaves the device.',
      reasons: ['BLOBS'],
      url: OFFSCREEN_PAGE,
    });
  } catch (error) {
    // A second concurrent caller may have created the document first;
    // Chrome then throws "only one offscreen document allowed".
    // Re-check before giving up.
    const stillMissing =
      typeof chrome.offscreen.hasDocument === 'function'
        ? !(await chrome.offscreen.hasDocument())
        : true;
    if (stillMissing) {
      throw error instanceof Error ? error : new Error('offscreen-create-failed');
    }
  }
}

function fetchViaOffscreen(srcUrl: string): Promise<{ dataUrl: string; name: string }> {
  return new Promise((resolve, reject) => {
    const requestId = `rc-req-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    const timeoutId = setTimeout(() => {
      pendingFetches.delete(requestId);
      reject(new Error('offscreen-timeout'));
    }, OFFSCREEN_TIMEOUT_MS);
    pendingFetches.set(requestId, { resolve, reject, timeoutId });
    ensureOffscreenDocument()
      .then(() =>
        chrome.runtime.sendMessage({
          type: 'SHRINKIT_OFFSCREEN_FETCH',
          requestId,
          srcUrl,
        }),
      )
      .catch((error: unknown) => {
        const pending = pendingFetches.get(requestId);
        if (pending) {
          pendingFetches.delete(requestId);
          clearTimeout(pending.timeoutId);
          pending.reject(error instanceof Error ? error : new Error('offscreen-send-failed'));
        }
      });
  });
}

function isContentFetchResponse(value: unknown): value is ContentFetchResponse {
  return typeof value === 'object' && value !== null;
}

async function fetchViaContentScript(tabId: number, srcUrl: string): Promise<ContentFetchResponse> {
  const response = await chrome.tabs.sendMessage(tabId, {
    type: 'SHRINKIT_FETCH_BLOB',
    srcUrl,
  });
  if (!isContentFetchResponse(response)) {
    throw new Error('content-script-bad-response');
  }
  return response;
}

async function handleContextMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab: chrome.tabs.Tab | undefined,
): Promise<void> {
  const srcUrl = typeof info.srcUrl === 'string' ? info.srcUrl : '';

  // No URL at all (should not happen for an image context): never
  // fail silently — open the Editor on the localized error state.
  if (!srcUrl) {
    await openErrorEditor('unknown');
    return;
  }

  // SVG (data: SVG or a .svg source URL): never preload as resizable.
  // The engine cannot resize vector images, so open the error Editor.
  if (isSvgSourceUrl(srcUrl)) {
    await openErrorEditor('unknown');
    return;
  }

  // (a) data: URL — already fully in-memory. No fetch needed.
  if (srcUrl.startsWith('data:image/')) {
    const key = `rc-${Date.now()}`;
    const name = fileNameForDataUrl(srcUrl, `image-${Date.now()}`);
    await chrome.storage.session.set({ [key]: { name, dataUrl: srcUrl } });
    await openEditor({ src: 'rightclick', key }, '/');
    return;
  }

  // (b) http(s) URL — the service worker cannot fetch cross-origin
  // image bytes reliably (no DOM, CORS). Delegate to the offscreen
  // document, which runs in a page context.
  if (srcUrl.startsWith('http://') || srcUrl.startsWith('https://')) {
    try {
      const { dataUrl, name } = await fetchViaOffscreen(srcUrl);
      // SVG served from an extensionless URL: the fetched MIME is the
      // only signal. Discard instead of preloading.
      if (isSvgDataUrl(dataUrl)) {
        await openErrorEditor('unknown');
        return;
      }
      const key = `rc-${Date.now()}`;
      await chrome.storage.session.set({ [key]: { name, dataUrl } });
      await openEditor({ src: 'rightclick', key }, '/');
    } catch (error) {
      console.warn('ShrinkIt: offscreen fetch failed for right-clicked image', error);
      await openErrorEditor('cors');
    }
    return;
  }

  // (c) blob: URL — only the creating page can fetch it. Ask the
  // content script in the source tab to convert it to a data URL.
  if (srcUrl.startsWith('blob:')) {
    if (typeof tab?.id !== 'number') {
      await openErrorEditor('blob');
      return;
    }
    try {
      const response = await fetchViaContentScript(tab.id, srcUrl);
      if (!response.ok || typeof response.dataUrl !== 'string') {
        throw new Error(response.error ?? 'content-script-fetch-failed');
      }
      // SVG blob: same rule as https: — discard, do not preload.
      if (isSvgDataUrl(response.dataUrl)) {
        await openErrorEditor('unknown');
        return;
      }
      const key = `rc-${Date.now()}`;
      const name =
        typeof response.name === 'string' && response.name.length > 0
          ? response.name
          : fileNameForDataUrl(response.dataUrl, `image-${Date.now()}`);
      await chrome.storage.session.set({ [key]: { name, dataUrl: response.dataUrl } });
      await openEditor({ src: 'rightclick', key }, '/');
    } catch (error) {
      // Content script absent (chrome:// pages, extension pages,
      // or pages where injection is blocked) or fetch failed.
      console.warn('ShrinkIt: blob fetch via content script failed', error);
      await openErrorEditor('blob');
    }
    return;
  }

  // Any other scheme (e.g. filesystem:, chrome://) is not fetchable.
  await openErrorEditor('unknown');
}

export default defineBackground(() => {
  // (Re)create the context-menu entry on install/update. removeAll
  // first: creating a duplicate id throws.
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        contexts: ['image'],
        id: MENU_ID,
        title: 'Resize with ShrinkIt',
      });
    });
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== MENU_ID) {
      return;
    }
    void handleContextMenuClick(info, tab);
  });

  chrome.runtime.onMessage.addListener((message: unknown) => {
    if (typeof message !== 'object' || message === null) {
      return;
    }
    const typed = message as { type?: unknown };

    // Offscreen fetch result — resolve the matching pending request.
    if (typed.type === 'SHRINKIT_OFFSCREEN_RESULT') {
      const result = message as OffscreenResultMessage;
      const pending = pendingFetches.get(result.requestId);
      if (pending) {
        pendingFetches.delete(result.requestId);
        clearTimeout(pending.timeoutId);
        if (result.ok && typeof result.dataUrl === 'string' && typeof result.name === 'string') {
          pending.resolve({ dataUrl: result.dataUrl, name: result.name });
        } else {
          pending.reject(new Error(result.error ?? 'offscreen-fetch-failed'));
        }
      }
      return;
    }

    // Toolbar popup / Editor / Options ask to open the Editor. A
    // legacy tool slug in the message maps to its hash route via the
    // shared router table; unknown/absent values land on Home ('/').
    // The background NEVER emits a legacy tool URL itself.
    if (typed.type === 'SHRINKIT_OPEN_EDITOR') {
      const openMessage = message as OpenEditorMessage;
      void openEditor({}, legacyToolToRoute(openMessage.tool) ?? '/');
      return;
    }
  });
});
