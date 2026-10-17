/**
 * Target-size tool: compress an image to at most a chosen KB ceiling.
 * Owns its dropzone, preview, settings, processing and download — the
 * editor does not provide a Dropzone for it. Ported from the web app's
 * TargetSizeApp (preset chips, custom KB input, auto-compress on upload,
 * original vs output metrics). All UI strings go through t().
 */
import { useEffect, useRef, useState } from 'react';
import { compressToTargetKb, type TargetFormat } from './targetCompressor';
import { t, type Locale } from '../../lib/i18n/index';
import { isSupportedInputFile } from '../../lib/image/filenames';

export interface TargetSizeToolProps {
  targetKb: number;
  locale: Locale;
}

interface TargetResult {
  bytes: number;
  quality: number;
  width: number;
  height: number;
}

const TARGET_PRESETS = [20, 50, 100, 200, 500];
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

function extensionFor(format: TargetFormat): string {
  return format === 'jpeg' ? 'jpg' : format;
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

function mapError(err: unknown, locale: Locale, targetKb: number): string {
  const code = err instanceof Error ? err.message : '';
  if (code === 'target-unreachable') {
    return t(locale, 'tools.targetSize.errorUnreachable', { kb: targetKb });
  }
  if (code === 'decode-failed') {
    return t(locale, 'tools.targetSize.errorDecode');
  }
  if (code === 'invalid-target') {
    return t(locale, 'tools.targetSize.errorInvalidTarget');
  }
  return t(locale, 'tools.targetSize.errorGeneric');
}

export default function TargetSizeTool({ targetKb: targetKbProp, locale }: TargetSizeToolProps) {
  const [targetKb, setTargetKb] = useState(targetKbProp);
  const [format, setFormat] = useState<TargetFormat>('jpeg');
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [result, setResult] = useState<TargetResult | null>(null);
  const [originalBytes, setOriginalBytes] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultBlobRef = useRef<Blob | null>(null);
  const runRef = useRef(0);

  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
    };
  }, [originalUrl]);
  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);
  useEffect(() => {
    setTargetKb(targetKbProp);
  }, [targetKbProp]);

  useEffect(() => {
    if (!file) return;
    const run = ++runRef.current;
    setProcessing(true);
    setError(null);
    compressToTargetKb(file, targetKb, { format })
      .then((res) => {
        if (runRef.current !== run) return;
        resultBlobRef.current = res.blob;
        setResult({ bytes: res.bytes, quality: res.quality, width: res.width, height: res.height });
        setResultUrl(URL.createObjectURL(res.blob));
      })
      .catch((err: unknown) => {
        if (runRef.current !== run) return;
        resultBlobRef.current = null;
        setResult(null);
        setResultUrl(null);
        setError(mapError(err, locale, targetKb));
      })
      .finally(() => {
        if (runRef.current === run) setProcessing(false);
      });
  }, [file, targetKb, format, locale]);

  const handleFile = (next: File | undefined | null) => {
    if (!next) return;
    if (!isSupportedInputFile(next)) {
      setError(t(locale, 'tools.targetSize.errorNotImage'));
      return;
    }
    setError(null);
    setResult(null);
    setResultUrl(null);
    resultBlobRef.current = null;
    setFile(next);
    setOriginalBytes(next.size);
    setOriginalUrl(URL.createObjectURL(next));
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setResultUrl(null);
    setOriginalUrl(null);
    setError(null);
    resultBlobRef.current = null;
  };

  const handleDownload = () => {
    const blob = resultBlobRef.current;
    if (!blob || !file) return;
    void downloadBlob(
      blob,
      `shrinkit-${targetKb}kb-${baseName(file.name)}.${extensionFor(format)}`,
    );
  };

  const previewUrl = resultUrl ?? originalUrl;
  const savedPercent =
    result && originalBytes > 0 ? Math.round((1 - result.bytes / originalBytes) * 100) : 0;

  return (
    <div className="mx-auto box-border w-full min-w-0 max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 text-center">
        <span className="mb-3 inline-flex items-center rounded-full border border-taccent/20 bg-taccent/10 px-3 py-1 text-xs font-medium text-taccent">
          {t(locale, 'tools.targetSize.badge')}
        </span>
        <h2 className="mb-2 text-2xl font-bold tracking-tight text-tink sm:text-3xl">
          {t(locale, 'tools.targetSize.title')}
        </h2>
        <p className="mx-auto max-w-2xl text-sm text-tmuted sm:text-base">
          {t(locale, 'tools.targetSize.subtitle')}
        </p>
      </div>

      <div className="mb-6 flex min-w-0 flex-col items-center justify-center gap-3">
        <label className="text-sm font-medium break-words text-tink">
          {t(locale, 'tools.targetSize.chooseTarget')}
        </label>
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-2">
          {TARGET_PRESETS.map((kb) => (
            <button
              key={kb}
              type="button"
              onClick={() => setTargetKb(kb)}
              className={`min-w-0 max-w-full cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium break-words transition ${
                targetKb === kb
                  ? 'scale-105 bg-taccent text-white shadow-sm'
                  : 'border border-tline bg-tsurface text-tink hover:border-taccent'
              }`}
            >
              &lt; {kb} KB
            </button>
          ))}
          <div className="flex min-w-0 flex-wrap items-center gap-1 sm:ml-2">
            <span className="text-xs break-words text-tmuted">
              {t(locale, 'tools.targetSize.custom')}
            </span>
            <input
              type="number"
              min="1"
              max="50000"
              value={targetKb}
              onChange={(e) => setTargetKb(Math.max(1, Number(e.target.value) || 1))}
              className="h-9 w-20 min-w-0 max-w-full rounded-md border border-tline bg-tsurface px-2 text-center text-sm font-medium text-tink outline-none focus:border-taccent"
            />
            <span className="text-xs font-semibold text-tink">KB</span>
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-medium break-words text-tmuted">
            {t(locale, 'tools.targetSize.formatLabel')}
          </span>
          <div className="inline-flex min-w-0 max-w-full rounded-lg border border-tline bg-tsurface p-1">
            {(['jpeg', 'png', 'webp'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormat(fmt)}
                className={`cursor-pointer rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap transition ${
                  format === fmt ? 'bg-taccent text-white shadow-sm' : 'text-tmuted hover:text-tink'
                }`}
              >
                {fmt === 'jpeg'
                  ? t(locale, 'tools.targetSize.formatJpeg')
                  : fmt === 'png'
                    ? t(locale, 'tools.targetSize.formatPng')
                    : t(locale, 'tools.targetSize.formatWebp')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!file ? (
        <div
          role="button"
          tabIndex={0}
          aria-label={t(locale, 'tools.targetSize.dropTitle')}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              // Space would otherwise scroll the page behind the dropzone.
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`relative flex min-w-0 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-tsurface p-6 text-center break-words shadow-sm transition sm:p-10 ${
            dragging ? 'border-taccent bg-taccent/5' : 'border-tline hover:border-taccent'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <p className="mb-1 break-words text-lg font-semibold text-tink">
            {t(locale, 'tools.targetSize.dropTitle')}
          </p>
          <p className="break-words text-xs text-tmuted">
            {t(locale, 'tools.targetSize.dropHint', { kb: targetKb })}
          </p>
        </div>
      ) : (
        <div className="box-border min-w-0 rounded-2xl border border-tline bg-tsurface p-4 shadow-sm sm:p-6 lg:p-8">
          <div className="flex min-w-0 flex-col items-center gap-8 md:flex-row">
            <div className="relative flex aspect-square w-full min-w-0 max-w-70 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-tline bg-tsurface2 shadow-inner">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={file?.name ?? ''}
                  className="h-full w-full object-contain"
                />
              ) : null}
              {processing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-medium text-white backdrop-blur-sm">
                  {t(locale, 'tools.targetSize.processing', { kb: targetKb })}
                </div>
              )}
            </div>

            <div className="w-full min-w-0 flex-1 space-y-4">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-tline pb-3">
                <span className="min-w-0 max-w-full truncate text-sm font-semibold break-words text-tink sm:max-w-50">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="shrink-0 cursor-pointer text-xs text-tmuted transition hover:text-red-600"
                >
                  {t(locale, 'tools.targetSize.remove')}
                </button>
              </div>

              {result && (
                <div className="grid min-w-0 grid-cols-2 gap-3 rounded-xl border border-tline bg-tsurface2 p-4">
                  <div className="min-w-0 break-words">
                    <span className="block text-xs break-words text-tmuted">
                      {t(locale, 'tools.targetSize.originalFile')}
                    </span>
                    <span className="break-words text-base font-semibold text-tink">
                      {formatBytes(originalBytes)}
                    </span>
                  </div>
                  <div className="min-w-0 break-words">
                    <span className="block text-xs break-words text-tmuted">
                      {t(locale, 'tools.targetSize.targetOutput')}
                    </span>
                    <span className="break-words text-base font-bold text-taccent">
                      {formatBytes(result.bytes)}
                    </span>
                    <span className="ml-1.5 break-words text-xs font-semibold text-emerald-600">
                      ({savedPercent >= 0 ? '-' : '+'}
                      {Math.abs(savedPercent)}%)
                    </span>
                  </div>
                  <div className="col-span-2 flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-xs break-words text-tmuted">
                    <span>
                      {t(locale, 'tools.targetSize.dimensions', {
                        width: result.width,
                        height: result.height,
                      })}
                    </span>
                    <span>
                      {t(locale, 'tools.targetSize.quality', { quality: result.quality })}
                    </span>
                  </div>
                </div>
              )}

              {result && (
                <p className="min-w-0 break-words text-xs font-medium text-emerald-600">
                  {t(locale, 'tools.targetSize.underTarget', { kb: targetKb, bytes: result.bytes })}
                </p>
              )}
              {error && (
                <p className="min-w-0 break-words text-xs font-medium text-red-600">{error}</p>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {result && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-taccent px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#016df0] sm:w-auto"
                  >
                    {t(locale, 'tools.targetSize.download')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-tline px-4 py-3 text-sm font-medium text-tink transition hover:bg-tsurface2 sm:w-auto"
                >
                  {t(locale, 'tools.targetSize.changePhoto')}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    handleFile(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
