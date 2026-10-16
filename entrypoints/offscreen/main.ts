// ShrinkIt offscreen document script.
//
// Runs in an invisible page (entrypoints/offscreen/index.html) created
// by the background worker. Single job: fetch the bytes of an image
// the user right-clicked and return them as a data URL. The bytes are
// handed back to the background worker, which stores them in
// chrome.storage.session for the Editor. Nothing is uploaded anywhere.
//
// No user-facing strings here: failures are reported as machine codes
// ('timeout' | 'fetch-failed' | 'empty-body' | 'read-failed') and the
// background maps them to an Editor reason code, which the Editor
// renders with a localized string from src/i18n/messages/*.json.

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

type FetchRequestMessage = {
  type: 'SHRINKIT_OFFSCREEN_FETCH';
  requestId?: unknown;
  srcUrl?: unknown;
};

type FetchResultMessage = {
  type: 'SHRINKIT_OFFSCREEN_RESULT';
  requestId: string;
  ok: boolean;
  dataUrl?: string;
  name?: string;
  error?: string;
};

function fileNameForUrl(srcUrl: string, mimeType: string): string {
  let base = 'image';
  try {
    const path = new URL(srcUrl).pathname;
    const lastSegment = path.split('/').filter(Boolean).pop() ?? '';
    const decoded = decodeURIComponent(lastSegment).replace(/[^A-Za-z0-9._-]+/g, '_');
    if (decoded.length > 0) {
      base = decoded;
    }
  } catch {
    // Malformed URL: keep the generic base name.
  }
  // If the base already has an extension, keep it as-is.
  if (/\.[A-Za-z0-9]{2,5}$/.test(base)) {
    return base;
  }
  const ext = EXT_BY_MIME[mimeType] ?? 'png';
  return `${base}.${ext}`;
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

async function handleFetch(requestId: string, srcUrl: string): Promise<void> {
  const result: FetchResultMessage = {
    type: 'SHRINKIT_OFFSCREEN_RESULT',
    requestId,
    ok: false,
  };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(srcUrl, { signal: controller.signal });
    if (!response.ok) {
      result.error = 'fetch-failed';
      await chrome.runtime.sendMessage(result);
      return;
    }
    const blob = await response.blob();
    if (blob.size === 0) {
      result.error = 'empty-body';
      await chrome.runtime.sendMessage(result);
      return;
    }
    const dataUrl = await blobToDataUrl(blob);
    result.ok = true;
    result.dataUrl = dataUrl;
    result.name = fileNameForUrl(srcUrl, blob.type);
    await chrome.runtime.sendMessage(result);
  } catch (error) {
    result.error =
      error instanceof DOMException && error.name === 'AbortError' ? 'timeout' : 'fetch-failed';
    try {
      await chrome.runtime.sendMessage(result);
    } catch (sendError) {
      // Background worker gone (e.g. extension reloaded mid-fetch):
      // nothing left to report to.
      console.warn('ShrinkIt offscreen: could not return fetch result', sendError);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (typeof message !== 'object' || message === null) {
    return;
  }
  const typed = message as FetchRequestMessage;
  if (typed.type !== 'SHRINKIT_OFFSCREEN_FETCH') {
    return;
  }
  if (typeof typed.requestId !== 'string' || typeof typed.srcUrl !== 'string') {
    return;
  }
  // Fire-and-forget: the result is delivered via a separate
  // SHRINKIT_OFFSCREEN_RESULT message once the fetch completes.
  void handleFetch(typed.requestId, typed.srcUrl);
});
