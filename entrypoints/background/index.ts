// ShrinkIt background service worker (Manifest V3).
//
// Owns: the "Resize with ShrinkIt" image context-menu entry, the
// right-click image handoff (data: / http(s) / blob: URLs), and the
// SHRINKIT_OPEN_EDITOR message that opens the Full Editor tab.
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

const MENU_ID = 'shrinkit-resize';
const EDITOR_PAGE = 'editor.html';
const OFFSCREEN_PAGE = 'offscreen.html';
const OFFSCREEN_TIMEOUT_MS = 65_000;

// Editor tool slugs accepted for ?tool=. Unknown values fall back to
// 'main'. The Editor worker owns the canonical tool list.
const KNOWN_TOOLS = new Set([
  'main',
  'compress-50kb',
  'compress-20kb',
  'passport',
  'social',
  'compare',
]);

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

function editorUrl(params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString();
  return `${chrome.runtime.getURL(EDITOR_PAGE)}?${query}`;
}

function openEditor(params: Record<string, string>): Promise<void> {
  return chrome.tabs.create({ url: editorUrl(params) }).then(() => undefined);
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
  await openEditor({ src: 'error', reason, key });
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

function safeTool(value: unknown): string {
  return typeof value === 'string' && KNOWN_TOOLS.has(value) ? value : 'main';
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

  // (a) data: URL — already fully in-memory. No fetch needed.
  if (srcUrl.startsWith('data:image/')) {
    const key = `rc-${Date.now()}`;
    const name = fileNameForDataUrl(srcUrl, `image-${Date.now()}`);
    await chrome.storage.session.set({ [key]: { name, dataUrl: srcUrl } });
    await openEditor({ src: 'rightclick', key, tool: 'main' });
    return;
  }

  // (b) http(s) URL — the service worker cannot fetch cross-origin
  // image bytes reliably (no DOM, CORS). Delegate to the offscreen
  // document, which runs in a page context.
  if (srcUrl.startsWith('http://') || srcUrl.startsWith('https://')) {
    try {
      const { dataUrl, name } = await fetchViaOffscreen(srcUrl);
      const key = `rc-${Date.now()}`;
      await chrome.storage.session.set({ [key]: { name, dataUrl } });
      await openEditor({ src: 'rightclick', key, tool: 'main' });
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
      const key = `rc-${Date.now()}`;
      const name =
        typeof response.name === 'string' && response.name.length > 0
          ? response.name
          : fileNameForDataUrl(response.dataUrl, `image-${Date.now()}`);
      await chrome.storage.session.set({ [key]: { name, dataUrl: response.dataUrl } });
      await openEditor({ src: 'rightclick', key, tool: 'main' });
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

    // Toolbar popup / Editor / Options ask to open the Editor.
    if (typed.type === 'SHRINKIT_OPEN_EDITOR') {
      const openMessage = message as OpenEditorMessage;
      void openEditor({ tool: safeTool(openMessage.tool) });
      return;
    }
  });
});
