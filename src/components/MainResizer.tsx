import { useCallback, useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import { t } from '../lib/i18n/index';
import type { Locale } from '../lib/i18n/index';
import { ImageProcessor, type ProcessedImage, type ProcessSettings } from '../lib/image/process';
import { FORMAT_MIME, isSupportedInputFile } from '../lib/image/filenames';
import { MAX_BATCH, UNIT_LIMITS, DPI_LIMITS, QUALITY_LIMITS } from '../lib/image/limits';
import { getDefaultDimensionsForUnit } from '../lib/image/units';
import Dropzone from './Dropzone';
import SettingsPanel, { type SettingsState } from './SettingsPanel';
import ResultPanel, { type QueueItem } from './ResultPanel';

export interface MainResizerProps {
  locale: Locale;
  /** Files preloaded by the Editor (e.g. from a right-clicked image). Consumed once. */
  initialFiles?: File[] | null;
  onInitialFilesConsumed?: () => void;
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `img-${Date.now().toString(36)}-${idCounter}`;
}

/** Save a blob URL via chrome.downloads (extension pages) with anchor fallback. */
async function downloadBlobUrl(url: string, fileName: string): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome.downloads) {
      await chrome.downloads.download({ url, filename: fileName, saveAs: false });
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      return;
    }
  } catch {
    // Fall through to the anchor download below.
  }
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Read dimensions without fully processing — for the thumbnail strip. */
async function probeDims(file: File): Promise<{ width: number; height: number } | null> {
  try {
    if (typeof createImageBitmap === 'function') {
      const bmp = await createImageBitmap(file);
      const dims = { width: bmp.width, height: bmp.height };
      bmp.close();
      return dims;
    }
  } catch {
    // Fall back to the Image element.
  }
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const dims = { width: img.naturalWidth, height: img.naturalHeight };
        URL.revokeObjectURL(url);
        resolve(dims);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

function errorMessageFor(locale: Locale, err: unknown, fileName: string): string {
  const code = (err as { code?: unknown } | null)?.code;
  if (typeof code === 'string') {
    switch (code) {
      case 'decode-failed':
        return t(locale, 'errors.corrupt');
      case 'too-large':
        return t(locale, 'errors.too_large');
      case 'invalid-size':
        return t(locale, 'errors.invalid_size');
      case 'aborted':
        return t(locale, 'errors.aborted');
      default:
        return t(locale, 'errors.generic');
    }
  }
  if (err instanceof Error && /not a supported/i.test(err.message)) {
    return t(locale, 'errors.unsupported', { name: fileName });
  }
  return t(locale, 'errors.generic');
}

export default function MainResizer({
  locale,
  initialFiles,
  onInitialFilesConsumed,
}: MainResizerProps) {
  const [settings, setSettings] = useState<SettingsState>({
    width: '70',
    height: '70',
    unit: 'percent',
    locked: true,
    mode: 'stretch',
    format: 'jpeg',
    quality: '90',
    dpi: '72',
    background: 'white',
    preserveExif: false,
  });
  const [items, setItems] = useState<QueueItem[]>([]);
  const [running, setRunning] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [failedFiles, setFailedFiles] = useState<string[]>([]);
  const [browserSupported, setBrowserSupported] = useState(true);

  const processorRef = useRef<ImageProcessor | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const itemsRef = useRef<QueueItem[]>([]);
  itemsRef.current = items;
  const resultRef = useRef<HTMLDivElement>(null);
  const consumedInitialRef = useRef<File[] | null>(null);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const canvasOk = !!(canvas.getContext && canvas.getContext('2d'));
      const fileOk = typeof window !== 'undefined' && typeof window.FileReader !== 'undefined';
      if (!canvasOk || !fileOk) setBrowserSupported(false);
    } catch {
      setBrowserSupported(false);
    }
  }, []);

  const patchSettings = useCallback((patch: Partial<SettingsState>) => {
    setSettings((s) => ({ ...s, ...patch }));
    setFormError(null);
    // If items were previously 'done', mark them 'queued' so re-resize is immediately available.
    setItems((prev) =>
      prev.map((i) => (i.status === 'done' ? { ...i, status: 'queued' as const } : i)),
    );
  }, []);

  const addFiles = useCallback(
    (files: File[]) => {
      setFormError(null);
      setFailedFiles([]);
      // Single validation gate for EVERY add path (browse, drag-drop,
      // paste, right-click preload): extension + MIME via isSupportedInputFile.
      // Never filter by MIME alone — SVG (image/svg+xml) must be rejected.
      const alreadyQueued = new Set(itemsRef.current.map((i) => i.file));
      const accepted: File[] = [];
      const rejectedNames: string[] = [];
      for (const f of files) {
        if (!isSupportedInputFile(f)) {
          rejectedNames.push(f.name);
          continue;
        }
        // Same File object already queued (e.g. right-click preload
        // re-delivered after a remount): skip instead of duplicating.
        if (alreadyQueued.has(f)) continue;
        alreadyQueued.add(f);
        accepted.push(f);
      }
      if (rejectedNames.length > 0) {
        setFailedFiles(rejectedNames);
        setFormError(
          rejectedNames.length === 1
            ? t(locale, 'errors.unsupported', { name: rejectedNames[0] })
            : t(locale, 'errors.unsupported_many'),
        );
      }
      const room = MAX_BATCH - itemsRef.current.length;
      const take = accepted.slice(0, Math.max(0, room));
      if (accepted.length > take.length) {
        setFormError(t(locale, 'errors.too_many', { max: MAX_BATCH }));
      }
      const fresh: QueueItem[] = take.map((file) => ({
        id: nextId(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'queued' as const,
        background: 'white' as const,
      }));
      setItems((prev) => [...prev, ...fresh]);

      // Fill in dimensions asynchronously for the thumbnail strip and calculations.
      for (let idx = 0; idx < fresh.length; idx++) {
        const item = fresh[idx];
        const isFirst = itemsRef.current.length === 0 && idx === 0;
        void probeDims(item.file).then((dims) => {
          if (dims) {
            setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, dims } : i)));
            if (isFirst) {
              setSettings((prev) => {
                if (prev.unit !== 'percent') {
                  const def = getDefaultDimensionsForUnit(prev.unit, dims, Number(prev.dpi) || 72);
                  return { ...prev, width: def.width, height: def.height };
                }
                return prev;
              });
            }
          }
        });
      }
    },
    [locale],
  );

  // Consume preloaded files (right-click handoff) exactly once per array identity.
  // addFiles dedupes by File object identity, so a re-delivery of the same
  // files after a remount (e.g. tab switch) never duplicates the queue —
  // the preloaded file stays visible exactly once, with thumbnail + dims.
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0 && consumedInitialRef.current !== initialFiles) {
      consumedInitialRef.current = initialFiles;
      addFiles(initialFiles);
      onInitialFilesConsumed?.();
    }
  }, [initialFiles, addFiles, onInitialFilesConsumed]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      // Don't intercept paste if the user is typing in an input or textarea.
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      const files: File[] = [];
      // No MIME pre-filter here: pass every pasted file to addFiles, whose
      // isSupportedInputFile gate rejects unsupported types (e.g. SVG)
      // with the localized errors.unsupported message.
      if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
        for (const file of Array.from(e.clipboardData.files)) {
          files.push(file);
        }
      }
      if (files.length === 0 && e.clipboardData?.items) {
        for (const item of Array.from(e.clipboardData.items)) {
          if (item.type.startsWith('image/')) {
            const blob = item.getAsFile();
            if (blob) {
              const ext = blob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
              const namedFile = new File([blob], `pasted-image-${Date.now()}.${ext}`, {
                type: blob.type,
              });
              files.push(namedFile);
            }
          }
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        addFiles(files);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('paste', onPaste);
    };
  }, [addFiles]);

  // Revoke object URLs + terminate the processor ONLY on unmount.
  // (Previously this ran in the paste-listener cleanup, so a locale change
  // — which recreates addFiles — revoked every live thumbnail/result URL.)
  useEffect(
    () => () => {
      processorRef.current?.terminate();
      for (const item of itemsRef.current) {
        URL.revokeObjectURL(item.previewUrl);
        if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
      }
    },
    [],
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        if (target.resultUrl) URL.revokeObjectURL(target.resultUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    abortRef.current?.abort();
    setItems((prev) => {
      for (const item of prev) {
        URL.revokeObjectURL(item.previewUrl);
        if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
      }
      return [];
    });
    setRunning(false);
    setFormError(null);
    setFailedFiles([]);
  }, []);

  const toProcessSettings = useCallback((): ProcessSettings => {
    const width = Number(settings.width);
    const height = Number(settings.height);
    const dpi = Number(settings.dpi);
    const qualityApplies = settings.format === 'jpeg' || settings.format === 'webp';
    const quality = qualityApplies
      ? Math.min(100, Math.max(1, Math.round(Number(settings.quality) || 0)))
      : 100;

    const unitLimit = UNIT_LIMITS[settings.unit];
    if (!Number.isFinite(width) || width < unitLimit.min || width > unitLimit.max) {
      throw new Error(
        t(locale, 'errors.width_limit', {
          min: `${unitLimit.min}${unitLimit.suffix}`,
          max: `${unitLimit.max.toLocaleString()}${unitLimit.suffix}`,
        }),
      );
    }
    if (!Number.isFinite(height) || height < unitLimit.min || height > unitLimit.max) {
      throw new Error(
        t(locale, 'errors.height_limit', {
          min: `${unitLimit.min}${unitLimit.suffix}`,
          max: `${unitLimit.max.toLocaleString()}${unitLimit.suffix}`,
        }),
      );
    }
    if (
      settings.format !== 'gif' &&
      (!Number.isFinite(dpi) || dpi < DPI_LIMITS.min || dpi > DPI_LIMITS.max)
    ) {
      throw new Error(t(locale, 'errors.dpi_limit'));
    }
    if (qualityApplies) {
      const qNum = Number(settings.quality);
      if (!Number.isFinite(qNum) || qNum < QUALITY_LIMITS.min || qNum > QUALITY_LIMITS.max) {
        throw new Error(t(locale, 'errors.quality_limit'));
      }
    }

    return {
      width,
      height,
      unit: settings.unit,
      dpi,
      format: settings.format,
      quality,
      background: settings.background,
      preserveExif: settings.preserveExif,
      mode: settings.mode,
    };
  }, [locale, settings]);

  const runAll = useCallback(async () => {
    let queue = itemsRef.current.filter((i) => i.status === 'queued');
    // If all items are 'done' (or none are queued), re-queue all so re-resize works.
    if (queue.length === 0 && itemsRef.current.length > 0) {
      setItems((prev) => prev.map((i) => ({ ...i, status: 'queued' as const, error: undefined })));
      queue = itemsRef.current.map((i) => ({ ...i, status: 'queued' as const, error: undefined }));
    }
    if (queue.length === 0 || running) return;
    let procSettings: ProcessSettings;
    try {
      procSettings = toProcessSettings();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t(locale, 'errors.invalid_size'));
      return;
    }
    const processor = (processorRef.current ??= new ImageProcessor());
    const abort = new AbortController();
    abortRef.current = abort;
    setRunning(true);
    setFormError(null);
    try {
      for (const item of queue) {
        if (abort.signal.aborted) break;
        if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: 'processing' as const, background: procSettings.background }
              : i,
          ),
        );
        try {
          const result: ProcessedImage = await processor.process(
            item.file,
            procSettings,
            abort.signal,
          );
          const blob = new Blob([result.data.buffer as ArrayBuffer], {
            type: FORMAT_MIME[result.format],
          });
          const resultUrl = URL.createObjectURL(blob);
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...i, status: 'done' as const, result, resultUrl } : i,
            ),
          );
        } catch (err) {
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? {
                    ...i,
                    status: 'error' as const,
                    error: errorMessageFor(locale, err, item.file.name),
                  }
                : i,
            ),
          );
        }
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
      window.requestAnimationFrame(() => {
        window.setTimeout(() => {
          if (resultRef.current) {
            const prefersReduced =
              typeof window !== 'undefined' &&
              window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const top = resultRef.current.getBoundingClientRect().top + window.scrollY - 30;
            window.scrollTo({ top, behavior: prefersReduced ? 'auto' : 'smooth' });
          }
        }, 120);
      });
    }
  }, [locale, running, toProcessSettings]);

  const downloadItem = useCallback((item: QueueItem) => {
    if (!item.resultUrl || !item.result) return;
    const blob = new Blob([item.result.data.buffer as ArrayBuffer], {
      type: FORMAT_MIME[item.result.format],
    });
    void downloadBlobUrl(URL.createObjectURL(blob), item.result.fileName);
  }, []);

  const downloadZip = useCallback(async () => {
    const done = itemsRef.current.filter((i) => i.status === 'done' && i.result);
    if (done.length === 0) return;
    const zip = new JSZip();
    for (const item of done) {
      zip.file(item.result?.fileName ?? item.file.name, item.result?.data ?? new Uint8Array());
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    await downloadBlobUrl(URL.createObjectURL(blob), 'shrinkit-images.zip');
  }, []);

  const queuedCount = items.filter((i) => i.status === 'queued').length;
  const doneCount = items.filter((i) => i.status === 'done').length;

  return (
    <div className="mx-auto box-border w-full min-w-0 max-w-[960px] px-4">
      {!browserSupported && (
        <div
          id="unsupported_browser_message"
          role="alert"
          className="mx-auto mb-6 box-border w-full min-w-0 max-w-full rounded-[6px] border border-[var(--ed-line)] bg-[var(--ed-error-soft)] p-4 text-center text-sm font-medium break-words text-[var(--ed-error)]"
        >
          {t(locale, 'errors.browser_unsupported')}{' '}
          <a
            href="https://www.google.com/chrome"
            className="font-bold underline transition hover:text-[var(--ed-accent)]"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Chrome
          </a>{' '}
          {t(locale, 'errors.browser_unsupported_or')}{' '}
          <a
            href="http://mozilla.org/firefox/new"
            className="font-bold underline transition hover:text-[var(--ed-accent)]"
            target="_blank"
            rel="noopener noreferrer"
          >
            Firefox
          </a>
          .
        </div>
      )}

      {/* Dropzone is owned by another worker — this wrapper caps it at the
          web app's 940px dropzone width inside the 960px container. */}
      <div className="mx-auto box-border w-full min-w-0 max-w-[940px]">
        <Dropzone
          files={items}
          onFiles={addFiles}
          maxFiles={MAX_BATCH}
          locale={locale}
          disabled={running}
          onRemove={removeItem}
          processing={running}
          error={formError}
          failedFiles={failedFiles}
          onDismissError={() => {
            setFormError(null);
            setFailedFiles([]);
          }}
        />
      </div>

      {items.length > 0 && (
        <>
          <SettingsPanel
            settings={settings}
            onChange={patchSettings}
            locale={locale}
            originalSize={items[0]?.dims}
            disabled={running}
            onProcess={() => void runAll()}
            processing={running}
            queuedCount={queuedCount}
            itemCount={items.length}
            onClear={clearAll}
            onAbort={() => abortRef.current?.abort()}
          />

          <div
            ref={resultRef}
            className="mx-auto box-border w-full min-w-0 max-w-[960px] scroll-mt-8"
          >
            <ResultPanel
              items={items}
              onDownload={downloadItem}
              onDownloadAll={downloadZip}
              onClear={clearAll}
              onRemove={removeItem}
              locale={locale}
            />
          </div>

          {doneCount === items.length && doneCount > 0 && !running && (
            <div className="mt-6 min-w-0 text-center">
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex max-w-full items-center gap-2 rounded-[6px] border border-[var(--ed-accent)] px-6 py-2.5 text-sm font-medium break-words text-[var(--ed-accent)] transition hover:bg-[var(--ed-accent)] hover:text-white"
              >
                {t(locale, 'result.new_image')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
