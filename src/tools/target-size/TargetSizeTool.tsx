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
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-6 text-center">
        <span className="mb-3 inline-flex items-center rounded-full border border-[#007bff]/20 bg-[#007bff]/10 px-3 py-1 text-xs font-medium text-[#007bff]">
          {t(locale, 'tools.targetSize.badge')}
        </span>
        <h2 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {t(locale, 'tools.targetSize.title')}
        </h2>
        <p className="mx-auto max-w-2xl text-sm text-slate-500 sm:text-base">
          {t(locale, 'tools.targetSize.subtitle')}
        </p>
      </div>

      <div className="mb-6 flex flex-col items-center justify-center gap-3">
        <label className="text-sm font-medium text-slate-900">
          {t(locale, 'tools.targetSize.chooseTarget')}
        </label>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {TARGET_PRESETS.map((kb) => (
            <button
              key={kb}
              type="button"
              onClick={() => setTargetKb(kb)}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition ${
                targetKb === kb
                  ? 'scale-105 bg-[#007bff] text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-900 hover:border-[#007bff]'
              }`}
            >
              &lt; {kb} KB
            </button>
          ))}
          <div className="ml-2 flex items-center gap-1">
            <span className="text-xs text-slate-500">{t(locale, 'tools.targetSize.custom')}</span>
            <input
              type="number"
              min="1"
              max="50000"
              value={targetKb}
              onChange={(e) => setTargetKb(Math.max(1, Number(e.target.value) || 1))}
              className="h-9 w-20 rounded-md border border-slate-200 bg-white px-2 text-center text-sm font-medium text-slate-900 outline-none focus:border-[#007bff]"
            />
            <span className="text-xs font-semibold text-slate-900">KB</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-medium text-slate-500">
            {t(locale, 'tools.targetSize.formatLabel')}
          </span>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
            {(['jpeg', 'png', 'webp'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormat(fmt)}
                className={`cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition ${
                  format === fmt
                    ? 'bg-[#007bff] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
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
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
          }}
          className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white p-10 text-center shadow-sm transition ${
            dragging ? 'border-[#007bff] bg-[#007bff]/5' : 'border-slate-200 hover:border-[#007bff]'
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
          <p className="mb-1 text-lg font-semibold text-slate-900">
            {t(locale, 'tools.targetSize.dropTitle')}
          </p>
          <p className="text-xs text-slate-500">
            {t(locale, 'tools.targetSize.dropHint', { kb: targetKb })}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col items-center gap-8 md:flex-row">
            <div className="relative flex aspect-square w-full max-w-70 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-inner">
              {previewUrl ? (
                <img src={previewUrl} alt="" className="h-full w-full object-contain" />
              ) : null}
              {processing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-medium text-white backdrop-blur-sm">
                  {t(locale, 'tools.targetSize.processing', { kb: targetKb })}
                </div>
              )}
            </div>

            <div className="w-full flex-1 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <span className="max-w-50 truncate text-sm font-semibold text-slate-900">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="cursor-pointer text-xs text-slate-500 transition hover:text-red-600"
                >
                  {t(locale, 'tools.targetSize.remove')}
                </button>
              </div>

              {result && (
                <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <span className="block text-xs text-slate-500">
                      {t(locale, 'tools.targetSize.originalFile')}
                    </span>
                    <span className="text-base font-semibold text-slate-900">
                      {formatBytes(originalBytes)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500">
                      {t(locale, 'tools.targetSize.targetOutput')}
                    </span>
                    <span className="text-base font-bold text-[#007bff]">
                      {formatBytes(result.bytes)}
                    </span>
                    <span className="ml-1.5 text-xs font-semibold text-emerald-600">
                      ({savedPercent >= 0 ? '-' : '+'}
                      {Math.abs(savedPercent)}%)
                    </span>
                  </div>
                  <div className="col-span-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
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
                <p className="text-xs font-medium text-emerald-600">
                  {t(locale, 'tools.targetSize.underTarget', { kb: targetKb, bytes: result.bytes })}
                </p>
              )}
              {error && <p className="text-xs font-medium text-red-600">{error}</p>}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {result && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#007bff] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#016df0]"
                  >
                    {t(locale, 'tools.targetSize.download')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
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
