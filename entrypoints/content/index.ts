// ShrinkIt content script.
//
// Tiny, no UI, no CSS injection. Two jobs:
//  1. Remember the last image the user right-clicked (the context-menu
//     click itself carries info.srcUrl, but this is a fallback for
//     pages where the menu target is wrapped, e.g. <picture>).
//  2. Fetch blob: URLs in page context. A blob: URL is only fetchable
//     from the page that created it — the service worker cannot fetch
//     it — so the background worker asks this script to convert it to
//     a data URL.
//
// No user-facing strings: replies carry machine codes only
// ('fetch-failed' | 'read-failed' | 'empty-body').

import { defineContentScript } from 'wxt/utils/define-content-script';

const FETCH_TIMEOUT_MS = 60_000;

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'image/x-icon': 'ico',
};

type FetchBlobMessage = {
  type: 'SHRINKIT_FETCH_BLOB';
  srcUrl?: unknown;
};

type FetchBlobResponse = {
  ok: boolean;
  dataUrl?: string;
  name?: string;
  error?: string;
};

function fileNameForBlobUrl(srcUrl: string, mimeType: string): string {
  const ext = EXT_BY_MIME[mimeType] ?? 'png';
  return `image-${Date.now()}.${ext}`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      reject(new Error('read-failed'));
    };
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('read-failed'));
      }
    };
    reader.readAsDataURL(blob);
  });
}

async function fetchBlobAsDataUrl(srcUrl: string): Promise<FetchBlobResponse> {
  // data: URLs need no fetch — they are already the payload.
  if (srcUrl.startsWith('data:image/')) {
    return { ok: true, dataUrl: srcUrl, name: fileNameForBlobUrl(srcUrl, '') };
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(srcUrl, { signal: controller.signal });
    if (!response.ok) {
      return { ok: false, error: 'fetch-failed' };
    }
    const blob = await response.blob();
    if (blob.size === 0) {
      return { ok: false, error: 'empty-body' };
    }
    const dataUrl = await blobToDataUrl(blob);
    return { ok: true, dataUrl, name: fileNameForBlobUrl(srcUrl, blob.type) };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof DOMException && error.name === 'AbortError' ? 'timeout' : 'fetch-failed',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export default defineContentScript({
  allFrames: false,
  matches: ['<all_urls>'],
  registration: 'manifest',
  runAt: 'document_idle',

  main() {
    let lastRightClickedSrc = '';

    // Capture phase: record the image under the cursor before the
    // context menu opens. currentSrc respects <picture>/<source>
    // selection; fall back to the raw src attribute.
    document.addEventListener(
      'contextmenu',
      (event) => {
        const target = event.target as Element | null;
        const img = target?.closest?.('img') as HTMLImageElement | null;
        if (!img) {
          return;
        }
        const raw = img.currentSrc || img.getAttribute('src') || '';
        if (!raw) {
          return;
        }
        try {
          lastRightClickedSrc = new URL(raw, window.location.href).href;
        } catch {
          lastRightClickedSrc = raw;
        }
      },
      true,
    );

    chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
      if (typeof message !== 'object' || message === null) {
        return;
      }
      const typed = message as { type?: unknown };

      if (typed.type === 'SHRINKIT_GET_LAST_IMAGE') {
        sendResponse({ ok: true, srcUrl: lastRightClickedSrc });
        return;
      }

      if (typed.type === 'SHRINKIT_FETCH_BLOB') {
        const fetchMessage = message as FetchBlobMessage;
        if (typeof fetchMessage.srcUrl !== 'string' || fetchMessage.srcUrl.length === 0) {
          sendResponse({ ok: false, error: 'fetch-failed' });
          return;
        }
        // Async response: keep the message channel open.
        void fetchBlobAsDataUrl(fetchMessage.srcUrl).then((result) => {
          sendResponse(result);
        });
        return true;
      }
    });
  },
});
