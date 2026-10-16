/**
 * Before/after comparison tool: drag a divider (0–100) over the image to
 * compare the original against a compressed version.
 *
 * Two modes:
 * - "generate": upload one file, move the quality slider (10–95) to
 *   regenerate the compressed side through the shared ImageProcessor
 *   pipeline (canvas JPEG fallback if the processor fails at runtime).
 * - "two files": upload an original and a separately compressed file and
 *   compare the two files directly.
 *
 * Owns its file inputs, preview, settings, processing and download — the
 * editor does not provide a Dropzone for it. Ported from the web app's
 * ComparisonSliderApp (drag divider, size badges, quality slider). All UI
 * strings go through t().
 */
import { useEffect, useRef, useState } from 'react';
import { ImageProcessor, type ProcessedImage, type ProcessSettings } from '../../lib/image/process';
import { FORMAT_MIME } from '../../lib/image/filenames';
import { t, type Locale } from '../../lib/i18n/index';

export interface CompareToolProps {
  locale: Locale;
}

type CompareMode = 'generate' | 'twoFiles';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function baseName(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  const raw = dot > 0 ? fileName.slice(0, dot) : fileName;
  const base = raw.trim();
  return base.length > 0 ? base : 'image';
}

async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  try {
    if (typeof chrome !== 'undefined' && chrome.downloads?.download) {
      await chrome.downloads.download({ url, filename, saveAs: false });
    } else {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }
  } catch {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

/**
 * Compress `file` to JPEG at `quality` (0–100) at its original dimensions.
 * Shared pipeline first; plain canvas encode if it fails at runtime.
 */
async function generateCompressedBlob(file: File, quality: number): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('decode-failed');
  }
  try {
    try {
      const processor = new ImageProcessor();
      try {
        const settings: ProcessSettings = {
          width: bitmap.width,
          height: bitmap.height,
          unit: 'pixels',
          dpi: 300,
          format: 'jpeg',
          quality,
          background: 'white',
          preserveExif: false,
          mode: 'stretch',
        };
        const processed: ProcessedImage = await processor.process(file, settings);
        return new Blob([new Uint8Array(processed.data)], { type: FORMAT_MIME.jpeg });
      } finally {
        processor.terminate();
      }
    } catch {
      // Fall through to the canvas encode below.
    }
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('encode-failed');
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality / 100);
    });
    if (!blob) {
      throw new Error('encode-failed');
    }
    return blob;
  } finally {
    bitmap.close();
  }
}

export default function CompareTool({ locale }: CompareToolProps) {
  const [mode, setMode] = useState<CompareMode>('generate');
  const [sliderPos, setSliderPos] = useState(50);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedUrl, setCompressedUrl] = useState<string | null>(null);
  const [compressedSize, setCompressedSize] = useState(0);
  const [quality, setQuality] = useState(65);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [draggingSecond, setDraggingSecond] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const originalInputRef = useRef<HTMLInputElement>(null);
  const compressedInputRef = useRef<HTMLInputElement>(null);
  const compressedBlobRef = useRef<Blob | null>(null);
  const runRef = useRef(0);

  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
    };
  }, [originalUrl]);
  useEffect(() => {
    return () => {
      if (compressedUrl) URL.revokeObjectURL(compressedUrl);
    };
  }, [compressedUrl]);

  // Generate mode: (re)compress whenever the file, quality, or locale changes.
  useEffect(() => {
    if (mode !== 'generate' || !originalFile) return;
    const run = ++runRef.current;
    setProcessing(true);
    setError(null);
    generateCompressedBlob(originalFile, quality)
      .then((blob) => {
        if (runRef.current !== run) return;
        compressedBlobRef.current = blob;
        setCompressedSize(blob.size);
        setCompressedUrl(URL.createObjectURL(blob));
      })
      .catch((err: unknown) => {
        if (runRef.current !== run) return;
        compressedBlobRef.current = null;
        setCompressedUrl(null);
        setCompressedSize(0);
        const code = err instanceof Error ? err.message : '';
        setError(
          code === 'decode-failed'
            ? t(locale, 'tools.compare.errorDecode')
            : t(locale, 'tools.compare.errorGeneric'),
        );
      })
      .finally(() => {
        if (runRef.current === run) setProcessing(false);
      });
  }, [mode, originalFile, quality, locale]);

  const handleOriginalFile = (next: File | undefined | null) => {
    if (!next) return;
    if (!next.type.startsWith('image/')) {
      setError(t(locale, 'tools.compare.errorNotImage'));
      return;
    }
    setError(null);
    setOriginalFile(next);
    setOriginalSize(next.size);
    setOriginalUrl(URL.createObjectURL(next));
    if (mode === 'twoFiles') {
      compressedBlobRef.current = null;
      setCompressedUrl(null);
      setCompressedSize(0);
    }
  };

  const handleCompressedFile = (next: File | undefined | null) => {
    if (!next) return;
    if (!next.type.startsWith('image/')) {
      setError(t(locale, 'tools.compare.errorNotImage'));
      return;
    }
    setError(null);
    compressedBlobRef.current = next;
    setCompressedSize(next.size);
    setCompressedUrl(URL.createObjectURL(next));
  };

  const handleReset = () => {
    setOriginalFile(null);
    setOriginalUrl(null);
    setCompressedUrl(null);
    setOriginalSize(0);
    setCompressedSize(0);
    setError(null);
    compressedBlobRef.current = null;
  };

  const handlePointer = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos(Math.round((x / rect.width) * 100));
  };

  const handleDownload = () => {
    const blob = compressedBlobRef.current;
    if (!blob || !originalFile) return;
    void downloadBlob(
      blob,
      `compressed-${mode === 'generate' ? `${quality}q-` : ''}${baseName(originalFile.name)}.jpg`,
    );
  };

  const showComparison = originalFile && (mode === 'generate' || compressedUrl);
  const savedPercent =
    originalSize > 0 && compressedSize > 0
      ? Math.round((1 - compressedSize / originalSize) * 100)
      : 0;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-6 text-center">
        <span className="mb-3 inline-flex items-center rounded-full border border-[#007bff]/20 bg-[#007bff]/10 px-3 py-1 text-xs font-medium text-[#007bff]">
          {t(locale, 'tools.compare.badge')}
        </span>
        <h2 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {t(locale, 'tools.compare.title')}
        </h2>
        <p className="mx-auto max-w-2xl text-sm text-slate-500 sm:text-base">
          {t(locale, 'tools.compare.subtitle')}
        </p>
      </div>

      <div className="mb-6 flex items-center justify-center gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setMode('generate')}
            className={`cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition ${
              mode === 'generate'
                ? 'bg-[#007bff] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {t(locale, 'tools.compare.modeGenerate')}
          </button>
          <button
            type="button"
            onClick={() => setMode('twoFiles')}
            className={`cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition ${
              mode === 'twoFiles'
                ? 'bg-[#007bff] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {t(locale, 'tools.compare.modeTwoFiles')}
          </button>
        </div>
      </div>

      {!originalFile ? (
        <div
          role="button"
          tabIndex={0}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleOriginalFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => originalInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') originalInputRef.current?.click();
          }}
          className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white p-12 text-center shadow-sm transition ${
            dragging ? 'border-[#007bff] bg-[#007bff]/5' : 'border-slate-200 hover:border-[#007bff]'
          }`}
        >
          <input
            ref={originalInputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              handleOriginalFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <p className="mb-1 text-lg font-semibold text-slate-900">
            {t(locale, 'tools.compare.dropTitle')}
          </p>
          <p className="text-xs text-slate-500">{t(locale, 'tools.compare.dropHint')}</p>
        </div>
      ) : mode === 'twoFiles' && !compressedUrl ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="max-w-60 truncate text-sm font-semibold text-slate-900">
              {originalFile.name} — {formatBytes(originalSize)}
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="cursor-pointer text-xs text-slate-500 transition hover:text-red-600"
            >
              {t(locale, 'tools.compare.remove')}
            </button>
          </div>
          <div
            role="button"
            tabIndex={0}
            onDragOver={(e) => {
              e.preventDefault();
              setDraggingSecond(true);
            }}
            onDragLeave={() => setDraggingSecond(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDraggingSecond(false);
              handleCompressedFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => compressedInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') compressedInputRef.current?.click();
            }}
            className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white p-10 text-center transition ${
              draggingSecond
                ? 'border-[#007bff] bg-[#007bff]/5'
                : 'border-slate-200 hover:border-[#007bff]'
            }`}
          >
            <input
              ref={compressedInputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                handleCompressedFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <p className="mb-1 text-lg font-semibold text-slate-900">
              {t(locale, 'tools.compare.dropCompressedTitle')}
            </p>
            <p className="text-xs text-slate-500">
              {t(locale, 'tools.compare.dropCompressedHint')}
            </p>
          </div>
        </div>
      ) : showComparison ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <span className="max-w-50 truncate text-sm font-semibold text-slate-900">
                {originalFile.name}
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="cursor-pointer text-xs text-slate-500 transition hover:text-red-600"
              >
                {t(locale, 'tools.compare.remove')}
              </button>
            </div>
            {mode === 'generate' && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-500">
                  {t(locale, 'tools.compare.qualityLabel')}
                </span>
                <input
                  type="range"
                  min="10"
                  max="95"
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-32 cursor-pointer accent-[#007bff]"
                />
                <span className="w-10 text-right text-sm font-bold text-slate-900">{quality}%</span>
              </div>
            )}
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4 text-center">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="block text-xs text-slate-500">
                {t(locale, 'tools.compare.originalLeft')}
              </span>
              <span className="text-base font-bold text-slate-900">
                {formatBytes(originalSize)}
              </span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="block text-xs text-slate-500">
                {t(locale, 'tools.compare.compressedRight')}
              </span>
              <span className="text-base font-bold text-[#007bff]">
                {formatBytes(compressedSize)}
              </span>
              {compressedSize > 0 && originalSize > 0 && (
                <span className="ml-1 text-xs font-semibold text-emerald-600">
                  ({savedPercent >= 0 ? '-' : '+'}
                  {Math.abs(savedPercent)}%)
                </span>
              )}
            </div>
          </div>

          <div
            ref={containerRef}
            onMouseDown={(e) => {
              isDraggingRef.current = true;
              handlePointer(e.clientX);
            }}
            onMouseUp={() => {
              isDraggingRef.current = false;
            }}
            onMouseLeave={() => {
              isDraggingRef.current = false;
            }}
            onMouseMove={(e) => {
              if (isDraggingRef.current) handlePointer(e.clientX);
            }}
            onTouchStart={(e) => {
              isDraggingRef.current = true;
              handlePointer(e.touches[0].clientX);
            }}
            onTouchEnd={() => {
              isDraggingRef.current = false;
            }}
            onTouchMove={(e) => {
              if (isDraggingRef.current) handlePointer(e.touches[0].clientX);
            }}
            className="relative flex aspect-[16/10] max-h-125 cursor-ew-resize touch-none items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-inner select-none"
          >
            {compressedUrl && (
              <img
                src={compressedUrl}
                alt=""
                className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              />
            )}
            {originalUrl && (
              <div
                className="pointer-events-none absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
              >
                <img
                  src={originalUrl}
                  alt=""
                  className="pointer-events-none h-full w-full object-contain"
                />
              </div>
            )}
            <div
              className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.6)]"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-lg">
                ↔
              </div>
            </div>
            <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
              {t(locale, 'tools.compare.originalLabel', { percent: sliderPos })}
            </div>
            <div className="pointer-events-none absolute right-3 bottom-3 rounded-md bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
              {t(locale, 'tools.compare.compressedLabel', { percent: 100 - sliderPos })}
            </div>
            {processing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-semibold text-white">
                {t(locale, 'tools.compare.processing')}
              </div>
            )}
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={sliderPos}
            onChange={(e) => setSliderPos(Number(e.target.value))}
            aria-label={t(locale, 'tools.compare.sliderLabel')}
            className="mt-4 w-full cursor-pointer accent-[#007bff]"
          />

          {error && <p className="mt-4 text-xs font-medium text-red-600">{error}</p>}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => originalInputRef.current?.click()}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-900 transition hover:bg-slate-50"
            >
              {t(locale, 'tools.compare.changePhoto')}
            </button>
            <input
              ref={originalInputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                handleOriginalFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            {compressedUrl && (
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#007bff] px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#016df0]"
              >
                {t(locale, 'tools.compare.download')}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
