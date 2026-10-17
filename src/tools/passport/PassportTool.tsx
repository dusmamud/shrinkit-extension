/**
 * Passport & visa photo tool: format a portrait to an official preset size.
 * Owns its dropzone, preview, settings, processing and download — the
 * editor does not provide a Dropzone for it. Ported from the web app's
 * PassportPhotoApp (preset selector, white background, spec card,
 * guidelines checklist). All UI strings go through t(); preset names are
 * resolved by preset id, never from the contracted English preset labels.
 */
import { useEffect, useRef, useState } from 'react';
import { PASSPORT_PRESETS, makePassportPhoto, type PassportPreset } from './passportEngine';
import { t, type Locale } from '../../lib/i18n/index';
import { isSupportedInputFile } from '../../lib/image/filenames';

export interface PassportToolProps {
  locale: Locale;
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function presetName(locale: Locale, id: string): string {
  if (id === 'in-35x45') return t(locale, 'tools.passport.presetIn');
  return t(locale, 'tools.passport.presetUs');
}

function mmOf(preset: PassportPreset): { widthMm: number; heightMm: number } {
  return {
    widthMm: Math.round((preset.width / preset.dpi) * 25.4),
    heightMm: Math.round((preset.height / preset.dpi) * 25.4),
  };
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

function mapError(err: unknown, locale: Locale): string {
  const code = err instanceof Error ? err.message : '';
  if (code === 'decode-failed') {
    return t(locale, 'tools.passport.errorDecode');
  }
  return t(locale, 'tools.passport.errorGeneric');
}

export default function PassportTool({ locale }: PassportToolProps) {
  const [presetId, setPresetId] = useState<string>(PASSPORT_PRESETS[0].id);
  const [file, setFile] = useState<File | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultBytes, setResultBytes] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultBlobRef = useRef<Blob | null>(null);
  const runRef = useRef(0);

  const preset = PASSPORT_PRESETS.find((p) => p.id === presetId) ?? PASSPORT_PRESETS[0];
  const { widthMm, heightMm } = mmOf(preset);

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  useEffect(() => {
    if (!file) return;
    const run = ++runRef.current;
    setProcessing(true);
    setError(null);
    makePassportPhoto(file, preset)
      .then((blob) => {
        if (runRef.current !== run) return;
        resultBlobRef.current = blob;
        setResultBytes(blob.size);
        setResultUrl(URL.createObjectURL(blob));
      })
      .catch((err: unknown) => {
        if (runRef.current !== run) return;
        resultBlobRef.current = null;
        setResultUrl(null);
        setError(mapError(err, locale));
      })
      .finally(() => {
        if (runRef.current === run) setProcessing(false);
      });
    // Re-run when the file, preset, or locale changes.
  }, [file, presetId, locale]);

  const handleFile = (next: File | undefined | null) => {
    if (!next) return;
    if (!isSupportedInputFile(next)) {
      setError(t(locale, 'tools.passport.errorNotImage'));
      return;
    }
    setError(null);
    setResultUrl(null);
    resultBlobRef.current = null;
    setFile(next);
  };

  const handleReset = () => {
    setFile(null);
    setResultUrl(null);
    setError(null);
    resultBlobRef.current = null;
  };

  const handleDownload = () => {
    const blob = resultBlobRef.current;
    if (!blob) return;
    void downloadBlob(blob, `passport-photo-${preset.id}.jpg`);
  };

  return (
    <div className="mx-auto box-border w-full min-w-0 max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 text-center">
        <span className="mb-3 inline-flex items-center rounded-full border border-taccent/20 bg-taccent/10 px-3 py-1 text-xs font-medium text-taccent">
          {t(locale, 'tools.passport.badge')}
        </span>
        <h2 className="mb-2 text-2xl font-bold tracking-tight text-tink sm:text-3xl">
          {t(locale, 'tools.passport.title')}
        </h2>
        <p className="mx-auto max-w-2xl text-sm text-tmuted sm:text-base">
          {t(locale, 'tools.passport.subtitle')}
        </p>
      </div>

      <div className="mb-6 flex min-w-0 flex-col items-center justify-center gap-3">
        <label className="text-sm font-medium break-words text-tink">
          {t(locale, 'tools.passport.chooseSpec')}
        </label>
        <div className="grid box-border w-full min-w-0 max-w-2xl grid-cols-2 gap-2.5 sm:grid-cols-4">
          {PASSPORT_PRESETS.map((spec) => {
            const mm = mmOf(spec);
            return (
              <button
                key={spec.id}
                type="button"
                onClick={() => setPresetId(spec.id)}
                className={`min-w-0 max-w-full cursor-pointer rounded-xl border p-3 text-center break-words transition ${
                  presetId === spec.id
                    ? 'border-taccent bg-taccent/10 font-semibold text-taccent shadow-sm ring-1 ring-taccent'
                    : 'border-tline bg-tsurface text-tink hover:border-taccent/50 hover:bg-tsurface2'
                }`}
              >
                <span className="block min-w-0 break-words text-sm font-bold">
                  {presetName(locale, spec.id)}
                </span>
                <span className="mt-0.5 block break-words text-xs text-tmuted">
                  {mm.widthMm} × {mm.heightMm} mm
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {!file ? (
        <div
          role="button"
          tabIndex={0}
          aria-label={t(locale, 'tools.passport.dropTitle')}
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
            {t(locale, 'tools.passport.dropTitle')}
          </p>
          <p className="break-words text-xs text-tmuted">
            {t(locale, 'tools.passport.dropHint', {
              width: preset.width,
              height: preset.height,
              dpi: preset.dpi,
            })}
          </p>
        </div>
      ) : (
        <div className="box-border min-w-0 rounded-2xl border border-tline bg-tsurface p-4 shadow-sm sm:p-6 lg:p-8">
          <div className="flex min-w-0 flex-col items-center gap-8 md:flex-row">
            <div className="relative flex w-full min-w-0 max-w-60 shrink-0 items-center justify-center overflow-hidden rounded-lg border-4 border-white bg-tsurface shadow-lg">
              {resultUrl ? (
                <img
                  src={resultUrl}
                  alt={file?.name ?? ''}
                  className="h-auto w-full object-cover"
                />
              ) : null}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center border border-blue-400/30"
              >
                <div className="-mt-4 h-20 w-16 rounded-full border border-dashed border-blue-400/40" />
              </div>
              {processing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-semibold text-white">
                  {t(locale, 'tools.passport.processing')}
                </div>
              )}
            </div>

            <div className="w-full min-w-0 flex-1 space-y-4">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-tline pb-3">
                <span className="min-w-0 max-w-full truncate text-sm font-semibold break-words text-tink sm:max-w-55">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="shrink-0 cursor-pointer text-xs text-tmuted transition hover:text-red-600"
                >
                  {t(locale, 'tools.passport.remove')}
                </button>
              </div>

              <div className="space-y-2 rounded-xl border border-tline bg-tsurface2 p-4 text-xs">
                <div className="flex min-w-0 flex-wrap justify-between gap-x-3 gap-y-1">
                  <span className="text-tmuted">{t(locale, 'tools.passport.physicalSize')}</span>
                  <span className="font-semibold break-words text-right text-tink">
                    {widthMm} × {heightMm} mm
                  </span>
                </div>
                <div className="flex min-w-0 flex-wrap justify-between gap-x-3 gap-y-1">
                  <span className="text-tmuted">{t(locale, 'tools.passport.resolution')}</span>
                  <span className="font-semibold break-words text-right text-tink">
                    {preset.width} × {preset.height} px ({preset.dpi} DPI)
                  </span>
                </div>
                <div className="flex min-w-0 flex-wrap justify-between gap-x-3 gap-y-1">
                  <span className="text-tmuted">{t(locale, 'tools.passport.background')}</span>
                  <span className="font-semibold break-words text-right text-tink">
                    {t(locale, 'tools.passport.backgroundWhite')}
                  </span>
                </div>
                {resultUrl && (
                  <div className="flex min-w-0 flex-wrap justify-between gap-x-3 gap-y-1">
                    <span className="text-tmuted">{t(locale, 'tools.passport.fileSize')}</span>
                    <span className="font-semibold break-words text-right text-tink">
                      {formatBytes(resultBytes)}
                    </span>
                  </div>
                )}
              </div>

              <p className="break-words text-xs text-emerald-600">
                {t(locale, 'tools.passport.compliant')}
              </p>
              {error && <p className="break-words text-xs font-medium text-red-600">{error}</p>}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {resultUrl && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-taccent px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#016df0] sm:w-auto"
                  >
                    {t(locale, 'tools.passport.download')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-tline px-4 py-3 text-sm font-medium text-tink transition hover:bg-tsurface2 sm:w-auto"
                >
                  {t(locale, 'tools.passport.changePhoto')}
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

      <div className="mt-12 box-border min-w-0 rounded-2xl border border-tline bg-tsurface p-4 sm:p-6 lg:p-8">
        <h3 className="mb-3 break-words text-lg font-bold text-tink">
          {t(locale, 'tools.passport.guidelinesTitle')}
        </h3>
        <ul className="grid min-w-0 list-inside list-disc grid-cols-1 gap-3 break-words text-xs text-tmuted sm:grid-cols-2 sm:text-sm">
          <li>{t(locale, 'tools.passport.guideline1')}</li>
          <li>{t(locale, 'tools.passport.guideline2')}</li>
          <li>{t(locale, 'tools.passport.guideline3')}</li>
          <li>{t(locale, 'tools.passport.guideline4')}</li>
        </ul>
      </div>
    </div>
  );
}
