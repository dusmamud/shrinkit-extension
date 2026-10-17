/**
 * Social media resizer tool: resize a photo to an exact platform preset.
 * Owns its dropzone, preview, settings, processing and download — the
 * editor does not provide a Dropzone for it. Ported from the web app's
 * SocialResizerApp (preset chips, crop-fill vs fit-pad mode switcher,
 * spec card). All UI strings go through t(); preset names are resolved by
 * preset id, never from the contracted English preset labels.
 */
import { useEffect, useRef, useState } from 'react';
import { SOCIAL_PRESETS, resizeToPreset, type SocialFitMode } from './socialEngine';
import { t, type Locale } from '../../lib/i18n/index';
import { isSupportedInputFile } from '../../lib/image/filenames';

export interface SocialToolProps {
  locale: Locale;
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif';

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const rest = x % y;
    x = y;
    y = rest;
  }
  return x || 1;
}

function aspectLabel(width: number, height: number): string {
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

function presetName(locale: Locale, id: string): string {
  switch (id) {
    case 'ig-square':
      return t(locale, 'tools.social.presetIgSquare');
    case 'ig-story':
      return t(locale, 'tools.social.presetIgStory');
    case 'yt-thumb':
      return t(locale, 'tools.social.presetYtThumb');
    case 'li-banner':
      return t(locale, 'tools.social.presetLiBanner');
    case 'fb-post':
      return t(locale, 'tools.social.presetFbPost');
    case 'x-post':
      return t(locale, 'tools.social.presetXPost');
    default:
      return id;
  }
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
    return t(locale, 'tools.social.errorDecode');
  }
  return t(locale, 'tools.social.errorGeneric');
}

export default function SocialTool({ locale }: SocialToolProps) {
  const [presetId, setPresetId] = useState<string>(SOCIAL_PRESETS[0].id);
  const [fitMode, setFitMode] = useState<SocialFitMode>('crop-fill');
  const [file, setFile] = useState<File | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultBlobRef = useRef<Blob | null>(null);
  const runRef = useRef(0);

  const preset = SOCIAL_PRESETS.find((p) => p.id === presetId) ?? SOCIAL_PRESETS[0];

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
    resizeToPreset(file, preset, fitMode)
      .then((blob) => {
        if (runRef.current !== run) return;
        resultBlobRef.current = blob;
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
    // Re-run when the file, preset, fit mode, or locale changes.
  }, [file, presetId, fitMode, locale]);

  const handleFile = (next: File | undefined | null) => {
    if (!next) return;
    if (!isSupportedInputFile(next)) {
      setError(t(locale, 'tools.social.errorNotImage'));
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
    if (!blob || !file) return;
    const dot = file.name.lastIndexOf('.');
    const base = dot > 0 ? file.name.slice(0, dot).trim() : file.name;
    void downloadBlob(blob, `social-${preset.id}-${base || 'image'}.jpg`);
  };

  return (
    <div className="mx-auto box-border w-full min-w-0 max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 text-center">
        <span className="mb-3 inline-flex items-center rounded-full border border-[#007bff]/20 bg-[#007bff]/10 px-3 py-1 text-xs font-medium text-[#007bff]">
          {t(locale, 'tools.social.badge')}
        </span>
        <h2 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {t(locale, 'tools.social.title')}
        </h2>
        <p className="mx-auto max-w-2xl text-sm text-slate-500 sm:text-base">
          {t(locale, 'tools.social.subtitle')}
        </p>
      </div>

      <div className="mb-6 flex min-w-0 flex-col items-center justify-center gap-3">
        <label className="text-sm font-medium break-words text-slate-900">
          {t(locale, 'tools.social.choosePreset')}
        </label>
        <div className="grid box-border w-full min-w-0 max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">
          {SOCIAL_PRESETS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPresetId(item.id)}
              className={`flex w-full min-w-0 max-w-full cursor-pointer flex-col items-center rounded-xl border px-3.5 py-2 text-center text-xs font-medium break-words transition ${
                presetId === item.id
                  ? 'border-[#007bff] bg-[#007bff]/10 font-semibold text-[#007bff] shadow-sm ring-1 ring-[#007bff]'
                  : 'border-slate-200 bg-white text-slate-900 hover:border-[#007bff]/50 hover:bg-slate-50'
              }`}
            >
              <span className="min-w-0 break-words">{presetName(locale, item.id)}</span>
              <span className="mt-0.5 min-w-0 break-words text-[11px] text-slate-500">
                {item.width} × {item.height} ({aspectLabel(item.width, item.height)})
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 flex min-w-0 flex-wrap items-center justify-center gap-2 sm:gap-3">
        <span className="text-xs font-medium break-words text-slate-500">
          {t(locale, 'tools.social.modeLabel')}
        </span>
        <div className="inline-flex min-w-0 max-w-full rounded-lg border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setFitMode('crop-fill')}
            className={`cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition ${
              fitMode === 'crop-fill'
                ? 'bg-[#007bff] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {t(locale, 'tools.social.modeCrop')}
          </button>
          <button
            type="button"
            onClick={() => setFitMode('fit-pad')}
            className={`cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition ${
              fitMode === 'fit-pad'
                ? 'bg-[#007bff] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {t(locale, 'tools.social.modeFit')}
          </button>
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
          className={`relative flex min-w-0 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white p-6 text-center break-words shadow-sm transition sm:p-10 ${
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
          <p className="mb-1 break-words text-lg font-semibold text-slate-900">
            {t(locale, 'tools.social.dropTitle')}
          </p>
          <p className="break-words text-xs text-slate-500">
            {t(locale, 'tools.social.dropHint', {
              width: preset.width,
              height: preset.height,
              aspect: aspectLabel(preset.width, preset.height),
            })}
          </p>
        </div>
      ) : (
        <div className="box-border min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
          <div className="flex min-w-0 flex-col items-center gap-8 md:flex-row">
            <div className="relative flex max-h-80 w-full min-w-0 max-w-80 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-inner">
              {resultUrl ? (
                <img src={resultUrl} alt="" className="h-auto max-h-80 w-full object-contain" />
              ) : null}
              {processing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-semibold text-white">
                  {t(locale, 'tools.social.processing', { name: presetName(locale, preset.id) })}
                </div>
              )}
            </div>

            <div className="w-full min-w-0 flex-1 space-y-4">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <span className="min-w-0 max-w-full truncate text-sm font-semibold break-words text-slate-900 sm:max-w-55">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="shrink-0 cursor-pointer text-xs text-slate-500 transition hover:text-red-600"
                >
                  {t(locale, 'tools.social.remove')}
                </button>
              </div>

              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
                <div className="flex min-w-0 flex-wrap justify-between gap-x-3 gap-y-1">
                  <span className="text-slate-500">{t(locale, 'tools.social.platform')}</span>
                  <span className="font-semibold break-words text-right text-slate-900">
                    {presetName(locale, preset.id)}
                  </span>
                </div>
                <div className="flex min-w-0 flex-wrap justify-between gap-x-3 gap-y-1">
                  <span className="text-slate-500">{t(locale, 'tools.social.aspectRatio')}</span>
                  <span className="font-semibold break-words text-right text-slate-900">
                    {aspectLabel(preset.width, preset.height)}
                  </span>
                </div>
                <div className="flex min-w-0 flex-wrap justify-between gap-x-3 gap-y-1">
                  <span className="text-slate-500">{t(locale, 'tools.social.dimensions')}</span>
                  <span className="font-semibold break-words text-right text-slate-900">
                    {preset.width} × {preset.height} px
                  </span>
                </div>
              </div>

              {error && <p className="break-words text-xs font-medium text-red-600">{error}</p>}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {resultUrl && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#007bff] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#016df0] sm:w-auto"
                  >
                    {t(locale, 'tools.social.download')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 sm:w-auto"
                >
                  {t(locale, 'tools.social.changePhoto')}
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
