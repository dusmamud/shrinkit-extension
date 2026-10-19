import { useCallback, useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import { ImageProcessor, ProcessError, type ProcessSettings } from '../../src/lib/image/process';
import {
  FORMAT_MIME,
  formatBytes,
  isSupportedInputFile,
  percentSaved,
  type OutputFormat,
} from '../../src/lib/image/filenames';
import {
  calculateProportionalDimension,
  getDefaultDimensionsForUnit,
  roundToTwoDecimals,
  type SizeUnit,
} from '../../src/lib/image/units';
import { DPI_LIMITS, QUALITY_LIMITS, UNIT_LIMITS } from '../../src/lib/image/limits';
import type { ResizeMode } from '../../src/lib/image/engine';
import { t, type Locale } from '../../src/lib/i18n/index';
import { getSettings, saveSettings, type Settings } from '../../src/lib/settings/index';
import { LanguageSwitcher } from '../../src/components/LanguageSwitcher';
import { ThemeSwitcher } from '../../src/components/ThemeSwitcher';
import '../../src/styles/global.css';

const MAX_FILES = 5;

type Unit = SizeUnit;
type Background = 'white' | 'black';

interface QueuedFile {
  id: string;
  file: File;
  previewUrl: string;
  naturalWidth: number | null;
  naturalHeight: number | null;
}

interface ProcessedFile {
  id: string;
  name: string;
  originalSize: number;
  outputSize: number;
  outputWidth: number;
  outputHeight: number;
  blob: Blob;
  blobUrl: string;
  fileName: string;
}

interface BannerError {
  id: number;
  message: string;
}

/** Fallback original size when no queued file has probed dimensions yet (web-app parity). */
const ORIGINAL_FALLBACK = { width: 1920, height: 1080 };

const UNITS: Unit[] = ['percent', 'pixels', 'cm', 'inches'];
const FORMATS: OutputFormat[] = ['jpeg', 'png', 'webp', 'gif'];
const MODES: ResizeMode[] = ['stretch', 'crop', 'fit'];
const PRESETS = ['preset-50', 'preset-800', 'preset-20kb', 'preset-last-used'] as const;
type Preset = (typeof PRESETS)[number];

/** Web-app upload-arrow mark (web Dropzone.tsx), scaled for the popup icon box. */
function UploadMark(): React.JSX.Element {
  return (
    <svg viewBox="0 0 110 110" fill="none" aria-hidden="true" className="popup-upload-mark">
      <path d="M55 80V32" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <path
        d="M34 53l21-21 21 21"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M24 92h62" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

function applyTheme(theme: string): void {
  const root = document.documentElement;
  if (theme === 'dark' || theme === 'light') {
    root.dataset.theme = theme;
    return;
  }
  root.dataset.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Map an engine error to its localised web-app message (web-app parity). */
function errorMessageFor(locale: Locale, err: unknown): string {
  if (err instanceof ProcessError) {
    switch (err.code) {
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
  return t(locale, 'errors.generic');
}

/** Decode dimensions without processing (web-app parity: createImageBitmap, Image fallback). */
async function probeDims(file: File): Promise<{ width: number; height: number } | null> {
  try {
    if (typeof createImageBitmap === 'function') {
      const bmp = await createImageBitmap(file);
      const dims = { width: bmp.width, height: bmp.height };
      bmp.close();
      return dims;
    }
  } catch {
    // Fall through to the Image-element probe below.
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

function presetFor(
  width: string,
  height: string,
  unit: Unit,
  format: OutputFormat,
  quality: number,
): Preset | null {
  if (width === '800' && height === '' && unit === 'pixels') {
    if (format === 'jpeg' && quality === 60) return 'preset-20kb';
    return 'preset-800';
  }
  if (width === '50' && height === '50' && unit === 'percent') return 'preset-50';
  return null;
}

export default function Popup(): React.JSX.Element {
  const [locale, setLocale] = useState<Locale>('en');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [results, setResults] = useState<ProcessedFile[]>([]);
  const [errors, setErrors] = useState<BannerError[]>([]);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [width, setWidth] = useState('50');
  const [height, setHeight] = useState('50');
  const [unit, setUnit] = useState<Unit>('percent');
  const [dpi, setDpi] = useState('72');
  const [format, setFormat] = useState<OutputFormat>('jpeg');
  const [quality, setQuality] = useState(90);
  const [background, setBackground] = useState<Background>('white');
  const [mode, setMode] = useState<ResizeMode>('stretch');
  const [aspectLocked, setAspectLocked] = useState(true);
  const [activePreset, setActivePreset] = useState<Preset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorIdRef = useRef(0);
  const dragDepthRef = useRef(0);
  const filesRef = useRef<QueuedFile[]>([]);
  filesRef.current = files;
  const resultsRef = useRef<ProcessedFile[]>([]);
  resultsRef.current = results;

  const pushError = useCallback((message: string) => {
    errorIdRef.current += 1;
    const id = errorIdRef.current;
    setErrors((prev) => [...prev, { id, message }]);
  }, []);
  const dismissError = useCallback((id: number) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  }, []);
  const clearResults = useCallback(() => {
    for (const r of resultsRef.current) URL.revokeObjectURL(r.blobUrl);
    setResults([]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const loaded = await getSettings();
        if (cancelled) return;
        setSettings(loaded);
        setLocale(loaded.language);
        document.documentElement.lang = loaded.language;
        applyTheme(loaded.theme);
        setWidth(loaded.lastWidth);
        setHeight(loaded.lastHeight);
        setUnit(loaded.lastUnit);
        setFormat(loaded.lastFormat);
        setQuality(Number(loaded.lastQuality) || 90);
        setDpi(loaded.lastDpi);
        setBackground(loaded.background);
        setActivePreset(
          presetFor(
            loaded.lastWidth,
            loaded.lastHeight,
            loaded.lastUnit,
            loaded.lastFormat,
            Number(loaded.lastQuality) || 90,
          ),
        );
      } catch {
        /* popup stays usable on defaults */
      }
    };
    void load();
    const onChanged = (): void => {
      void load();
    };
    try {
      chrome.storage.onChanged.addListener(onChanged);
    } catch {
      /* non-extension context */
    }
    return () => {
      cancelled = true;
      try {
        chrome.storage.onChanged.removeListener(onChanged);
      } catch {
        /* ignore */
      }
    };
  }, []);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const picked = Array.from(incoming).filter((f) => f.size > 0);
      if (picked.length === 0) return;
      // Format gate: extension/name check, NOT file.type-only (BMP/AVIF with a
      // missing MIME type must still pass; SVG must be rejected explicitly).
      const accepted: File[] = [];
      const rejected: File[] = [];
      for (const f of picked) {
        if (isSupportedInputFile(f)) accepted.push(f);
        else rejected.push(f);
      }
      if (rejected.length === 1) {
        pushError(t(locale, 'errors.unsupported', { name: rejected[0].name }));
      } else if (rejected.length > 1) {
        pushError(t(locale, 'errors.unsupported_many'));
      }
      const room = MAX_FILES - filesRef.current.length;
      if (room <= 0) {
        pushError(t(locale, 'popup.error_too_many', { max: MAX_FILES }));
        return;
      }
      const take = accepted.slice(0, room);
      if (take.length < accepted.length) {
        pushError(t(locale, 'popup.error_too_many', { max: MAX_FILES }));
      }
      if (take.length === 0) return;
      const wasEmpty = filesRef.current.length === 0;
      const unitAtAdd = unit;
      const dpiAtAdd = dpi;
      clearResults();
      const queued: QueuedFile[] = take.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        naturalWidth: null,
        naturalHeight: null,
      }));
      setFiles((prev) => [...prev, ...queued]);
      for (const entry of queued) {
        void probeDims(entry.file).then((dims) => {
          if (!dims) return;
          setFiles((prev) =>
            prev.map((it) =>
              it.id === entry.id
                ? { ...it, naturalWidth: dims.width, naturalHeight: dims.height }
                : it,
            ),
          );
          // Web-app parity: first image + non-percent unit → defaults from its size.
          if (wasEmpty && entry === queued[0] && unitAtAdd !== 'percent') {
            const def = getDefaultDimensionsForUnit(unitAtAdd, dims, Number(dpiAtAdd) || 72);
            setWidth(def.width);
            setHeight(def.height);
            setActivePreset(null);
          }
        });
      }
    },
    [clearResults, dpi, locale, pushError, unit],
  );

  useEffect(() => {
    const onPaste = (event: ClipboardEvent): void => {
      // Don't intercept paste while typing in a field (web-app parity).
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      const candidates: File[] = [];
      const pasted = event.clipboardData?.files;
      if (pasted && pasted.length > 0) {
        candidates.push(...Array.from(pasted));
      } else if (event.clipboardData?.items) {
        // Pasted screenshots / blobs (e.g. from Snipping Tool / PrtScn).
        let index = 0;
        for (const item of Array.from(event.clipboardData.items)) {
          if (!item.type.startsWith('image/')) continue;
          const blob = item.getAsFile();
          if (!blob) continue;
          const sub = blob.type.split('/')[1] ?? 'png';
          const ext = sub === 'jpeg' ? 'jpg' : sub === 'svg+xml' ? 'svg' : sub;
          candidates.push(
            new File([blob], `pasted-image-${Date.now()}-${index}.${ext}`, { type: blob.type }),
          );
          index += 1;
        }
      }
      // Every candidate still passes through addFiles → isSupportedInputFile,
      // so a pasted SVG is rejected with errors.unsupported like any other SVG.
      if (candidates.length > 0) {
        event.preventDefault();
        addFiles(candidates);
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [addFiles]);

  const removeFile = (id: string): void => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  /** Original size of the first queued file (web-app fallback when unknown). */
  const firstOriginal = (): { width: number; height: number } => {
    const first = filesRef.current[0];
    if (first && first.naturalWidth && first.naturalHeight) {
      return { width: first.naturalWidth, height: first.naturalHeight };
    }
    return { ...ORIGINAL_FALLBACK };
  };

  const safeDpi = (): number => {
    const parsed = Number(dpi);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 72;
  };

  const setWidthValue = (value: string): void => {
    setActivePreset(null);
    if (aspectLocked) {
      const next = Number(value);
      if (Number.isFinite(next) && next > 0) {
        setHeight(String(calculateProportionalDimension('width', next, unit, firstOriginal())));
      }
    }
    setWidth(value);
  };

  const setHeightValue = (value: string): void => {
    setActivePreset(null);
    if (aspectLocked) {
      const next = Number(value);
      if (Number.isFinite(next) && next > 0) {
        setWidth(String(calculateProportionalDimension('height', next, unit, firstOriginal())));
      }
    }
    setHeight(value);
  };

  const toggleLock = (): void => {
    const nextLocked = !aspectLocked;
    setAspectLocked(nextLocked);
    setActivePreset(null);
    if (nextLocked) {
      const w = Number(width);
      if (Number.isFinite(w) && w > 0) {
        setHeight(String(calculateProportionalDimension('width', w, unit, firstOriginal())));
      }
    }
  };

  const handleUnitChange = (next: Unit): void => {
    setActivePreset(null);
    const def = getDefaultDimensionsForUnit(next, firstOriginal(), safeDpi());
    setUnit(next);
    setWidth(def.width);
    setHeight(def.height);
  };

  const handleFormatChange = (next: OutputFormat): void => {
    setActivePreset(null);
    setFormat(next);
    // Web-app parity: PNG is lossless (quality 100), GIF resets DPI to 72,
    // and coming back from PNG restores a sane 90 for JPEG.
    if (next === 'jpeg') {
      setQuality((q) => (q === 100 ? 90 : q));
    } else if (next === 'png') {
      setQuality(100);
    } else if (next === 'gif') {
      setDpi('72');
    }
  };

  /** First validation error, or null when the form is usable (web-app rules). */
  const validationError: string | null = (() => {
    const limit = UNIT_LIMITS[unit];
    const wRaw = width.trim();
    if (wRaw !== '') {
      const w = Number(wRaw);
      if (!Number.isFinite(w) || w < limit.min || w > limit.max) {
        return t(locale, 'errors.width_limit', {
          min: `${limit.min}${limit.suffix}`,
          max: `${limit.max.toLocaleString()}${limit.suffix}`,
        });
      }
    }
    const hRaw = height.trim();
    if (hRaw !== '') {
      const h = Number(hRaw);
      if (!Number.isFinite(h) || h < limit.min || h > limit.max) {
        return t(locale, 'errors.height_limit', {
          min: `${limit.min}${limit.suffix}`,
          max: `${limit.max.toLocaleString()}${limit.suffix}`,
        });
      }
    }
    if (format !== 'gif') {
      const d = Number(dpi);
      if (!Number.isFinite(d) || d < DPI_LIMITS.min || d > DPI_LIMITS.max) {
        return t(locale, 'errors.dpi_limit');
      }
    }
    if (format === 'jpeg' || format === 'webp') {
      if (
        !Number.isFinite(quality) ||
        quality < QUALITY_LIMITS.min ||
        quality > QUALITY_LIMITS.max
      ) {
        return t(locale, 'errors.quality_limit');
      }
    }
    return null;
  })();

  /** Resolve the width/height pair (in the current unit) for one queued file. */
  const pairFor = (q: QueuedFile): { width: number; height: number } | null => {
    const nw = q.naturalWidth ?? 0;
    const nh = q.naturalHeight ?? 0;
    if (nw <= 0 || nh <= 0) return null;
    const d = safeDpi();
    const original =
      unit === 'percent'
        ? { width: 100, height: 100 }
        : unit === 'pixels'
          ? { width: nw, height: nh }
          : unit === 'inches'
            ? { width: roundToTwoDecimals(nw / d), height: roundToTwoDecimals(nh / d) }
            : {
                width: roundToTwoDecimals((nw / d) * 2.54),
                height: roundToTwoDecimals((nh / d) * 2.54),
              };
    const wRaw = width.trim();
    const hRaw = height.trim();
    const w = wRaw === '' ? NaN : Number(wRaw);
    const h = hRaw === '' ? NaN : Number(hRaw);
    const wOk = Number.isFinite(w) && w > 0;
    const hOk = Number.isFinite(h) && h > 0;
    if (wOk && hOk) return { width: w, height: h };
    if (wOk) {
      return {
        width: w,
        height: aspectLocked
          ? calculateProportionalDimension('width', w, unit, { width: nw, height: nh })
          : original.height,
      };
    }
    if (hOk) {
      return {
        width: aspectLocked
          ? calculateProportionalDimension('height', h, unit, { width: nw, height: nh })
          : original.width,
        height: h,
      };
    }
    return original;
  };

  const handleResize = async (): Promise<void> => {
    if (filesRef.current.length === 0) {
      pushError(t(locale, 'popup.error_no_files'));
      return;
    }
    if (validationError) {
      pushError(validationError);
      return;
    }
    setProcessing(true);
    clearResults();
    const outputs: ProcessedFile[] = [];
    const processor = new ImageProcessor();
    try {
      for (const q of filesRef.current) {
        const pair = pairFor(q);
        if (!pair) {
          pushError(`${q.file.name}: ${t(locale, 'errors.generic')}`);
          continue;
        }
        const ps: ProcessSettings = {
          width: pair.width,
          height: pair.height,
          unit,
          dpi: format === 'gif' ? 72 : safeDpi(),
          format,
          quality: format === 'jpeg' || format === 'webp' ? quality : 100,
          background,
          preserveExif: settings?.preserveExif ?? false,
          mode,
        };
        try {
          const out = await processor.process(q.file, ps);
          const blob = new Blob([out.data as BlobPart], { type: FORMAT_MIME[format] });
          outputs.push({
            id: q.id,
            name: q.file.name,
            originalSize: q.file.size,
            outputSize: blob.size,
            outputWidth: out.width,
            outputHeight: out.height,
            blob,
            blobUrl: URL.createObjectURL(blob),
            fileName: out.fileName,
          });
        } catch (err) {
          pushError(`${q.file.name}: ${errorMessageFor(locale, err)}`);
        }
      }
    } finally {
      processor.terminate();
      setProcessing(false);
    }
    setResults(outputs);
    void saveSettings({
      lastWidth: width,
      lastHeight: height,
      lastUnit: unit,
      lastFormat: format,
      lastQuality: String(quality),
      lastDpi: dpi,
      background,
    });
  };

  const downloadBlobUrl = async (blobUrl: string, fileName: string): Promise<void> => {
    try {
      if (typeof chrome !== 'undefined' && chrome.downloads) {
        await chrome.downloads.download({ url: blobUrl, filename: fileName, saveAs: false });
        return;
      }
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      pushError(t(locale, 'popup.error_download_failed'));
    }
  };

  const handleDownloadAll = async (): Promise<void> => {
    if (resultsRef.current.length === 0) return;
    setZipping(true);
    try {
      const zip = new JSZip();
      const used = new Set<string>();
      for (const r of resultsRef.current) {
        let name = r.fileName;
        let n = 2;
        while (used.has(name)) {
          const dot = r.fileName.lastIndexOf('.');
          name =
            dot >= 0
              ? `${r.fileName.slice(0, dot)}-${n}${r.fileName.slice(dot)}`
              : `${r.fileName}-${n}`;
          n += 1;
        }
        used.add(name);
        zip.file(name, r.blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      await downloadBlobUrl(URL.createObjectURL(zipBlob), 'shrinkit-resized.zip');
    } catch {
      pushError(t(locale, 'popup.error_zip_failed'));
    } finally {
      setZipping(false);
    }
  };

  const openEditorRoute = async (hash: string): Promise<void> => {
    const url = `${chrome.runtime.getURL('editor.html')}${hash}`;
    try {
      await chrome.tabs.create({ url });
    } catch {
      window.open(url, '_blank');
    }
  };
  const openEditor = async (): Promise<void> => {
    await openEditorRoute('#/');
  };
  const openTools = async (): Promise<void> => {
    await openEditorRoute('#/tools');
  };
  const openSettings = async (): Promise<void> => {
    try {
      await chrome.runtime.openOptionsPage();
    } catch {
      const url = chrome.runtime.getURL('options.html');
      await chrome.tabs.create({ url });
    }
  };

  const applyPreset = (preset: Preset): void => {
    setActivePreset(preset);
    if (preset === 'preset-50') {
      setWidth('50');
      setHeight('50');
      setUnit('percent');
    } else if (preset === 'preset-800') {
      setWidth('800');
      setHeight('');
      setUnit('pixels');
    } else if (preset === 'preset-20kb') {
      setWidth('800');
      setHeight('');
      setUnit('pixels');
      setFormat('jpeg');
      setQuality(60);
    } else if (preset === 'preset-last-used' && settings) {
      setWidth(settings.lastWidth);
      setHeight(settings.lastHeight);
      setUnit(settings.lastUnit);
      setFormat(settings.lastFormat);
      setQuality(Number(settings.lastQuality) || 90);
      setDpi(settings.lastDpi);
      setBackground(settings.background);
    }
  };

  // Same brand logo as the Editor header (icons/logo.svg), pinned to 32px.
  const logoSrc =
    typeof chrome !== 'undefined' && chrome.runtime?.getURL
      ? chrome.runtime.getURL('icons/logo.svg')
      : 'icons/logo.svg';

  return (
    <div className="popup-root">
      <header className="popup-header">
        <img
          src={logoSrc}
          alt={t(locale, 'popup.logo_alt')}
          width={32}
          height={32}
          style={{ maxWidth: 32, maxHeight: 32 }}
        />
        <span className="popup-logo-wrap">
          <strong className="popup-logo-name">{t(locale, 'site.name')}</strong>
          <span className="popup-logo-by">{t(locale, 'header.by_dusrel')}</span>
        </span>
        <span className="popup-header-spacer" />
        <LanguageSwitcher
          locale={locale}
          compact
          onChange={(next) => {
            setLocale(next);
            void saveSettings({ language: next });
          }}
        />
        <ThemeSwitcher
          theme={settings?.theme ?? 'system'}
          locale={locale}
          compact
          onChange={(theme) => {
            void saveSettings({ theme });
            applyTheme(theme);
          }}
        />
      </header>

      {errors.map((e) => (
        <div key={e.id} role="alert" className="popup-error">
          <span>{e.message}</span>
          <button type="button" onClick={() => dismissError(e.id)}>
            {t(locale, 'popup.dismiss')}
          </button>
        </div>
      ))}

      <div
        className={`popup-dropzone${dragging ? ' popup-dropzone-drag' : ''}`}
        onDragEnter={(ev) => {
          ev.preventDefault();
          dragDepthRef.current += 1;
          setDragging(true);
        }}
        onDragLeave={(ev) => {
          ev.preventDefault();
          dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
          if (dragDepthRef.current === 0) setDragging(false);
        }}
        onDragOver={(ev) => {
          ev.preventDefault();
          setDragging(true);
        }}
        onDrop={(ev) => {
          ev.preventDefault();
          dragDepthRef.current = 0;
          setDragging(false);
          addFiles(ev.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label={t(locale, 'popup.dropzone_label')}
        onKeyDown={(ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        {/* Dashed border drawn as an SVG rect (web Dropzone style, scaled). */}
        <svg className="popup-dropzone-border" aria-hidden="true">
          <rect
            x="2"
            y="2"
            rx="14"
            fill="none"
            stroke="var(--t-dash, #52a0ff)"
            strokeWidth={dragging ? 3.5 : 2}
            strokeDasharray="6 10"
            strokeLinecap="round"
            style={{ width: 'calc(100% - 4px)', height: 'calc(100% - 4px)' }}
          />
        </svg>

        {processing && (
          <div className="popup-processing">
            <span className="dots">{t(locale, 'dropzone.processing')}</span>
          </div>
        )}

        <div className="popup-dropzone-inner">
          <div className="popup-dropzone-icon">
            <UploadMark />
          </div>
          <p className="popup-dropzone-title">
            {t(locale, 'dropzone.title_a')}{' '}
            <span className="popup-browse">{t(locale, 'dropzone.browse')}</span>{' '}
            <span className="popup-paste">{t(locale, 'dropzone.paste_hint')}</span>
          </p>
          <span className="popup-select-btn">{t(locale, 'dropzone.select')}</span>
          <p className="popup-muted">{t(locale, 'popup.dropzone_hint', { max: MAX_FILES })}</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(ev) => {
            if (ev.target.files) addFiles(ev.target.files);
            ev.target.value = '';
          }}
        />
      </div>
      <p className="popup-formats">{t(locale, 'popup.formats_hint')}</p>

      {files.length > 0 && (
        <p className="popup-count">
          {t(locale, 'popup.files_selected', { count: files.length, max: MAX_FILES })}
        </p>
      )}
      <div className="popup-thumbs">
        {files.map((item) => (
          <div key={item.id} className="popup-thumb">
            <div className="popup-thumb-img">
              <img src={item.previewUrl} alt={item.file.name} loading="lazy" />
              <button
                type="button"
                onClick={() => removeFile(item.id)}
                aria-label={t(locale, 'popup.remove', { name: item.file.name })}
              >
                ×
              </button>
            </div>
            <div className="popup-thumb-meta">
              <span className="popup-thumb-name" title={item.file.name}>
                {item.file.name}
              </span>
              <span className="popup-thumb-size">
                {item.naturalWidth && item.naturalHeight
                  ? `${item.naturalWidth}×${item.naturalHeight} · `
                  : ''}
                {formatBytes(item.file.size)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="popup-label">{t(locale, 'popup.presets_label')}</p>
      <div className="popup-presets">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            className={activePreset === p ? 'active' : ''}
            onClick={() => applyPreset(p)}
          >
            {t(
              locale,
              p === 'preset-50'
                ? 'popup.preset_50'
                : p === 'preset-800'
                  ? 'popup.preset_800'
                  : p === 'preset-20kb'
                    ? 'popup.preset_20kb'
                    : 'popup.preset_last_used',
            )}
          </button>
        ))}
      </div>

      <section className="popup-settings" aria-label={t(locale, 'settings.title')}>
        <div className="popup-size-row">
          <label className="popup-field">
            <span>{t(locale, 'settings.width')}</span>
            <input
              type="number"
              min={UNIT_LIMITS[unit].min}
              max={UNIT_LIMITS[unit].max}
              step="any"
              value={width}
              placeholder={t(locale, 'popup.auto')}
              onChange={(e) => setWidthValue(e.target.value)}
            />
          </label>
          <button
            type="button"
            className={`popup-lock-btn${aspectLocked ? ' locked' : ''}`}
            aria-pressed={aspectLocked}
            aria-label={t(locale, aspectLocked ? 'settings.unlock_aspect' : 'settings.lock_aspect')}
            title={t(locale, 'settings.lock_tip')}
            onClick={toggleLock}
          >
            {aspectLocked ? (
              <svg width="12" height="14" viewBox="0 0 12 14" fill="none" aria-hidden="true">
                <path
                  d="M2.5 5.5V3.5C2.5 1.567 4.067 0 6 0C7.933 0 9.5 1.567 9.5 3.5V5.5"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <rect y="5.5" width="12" height="8.5" rx="2" fill="white" />
                <circle cx="6" cy="9.75" r="1.2" fill="#007bff" />
              </svg>
            ) : (
              <svg width="12" height="14" viewBox="0 0 12 14" fill="none" aria-hidden="true">
                <path
                  d="M2.5 5.5V3.5C2.5 1.567 4.067 0 6 0C7.933 0 9.5 1.567 9.5 3.5"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <rect y="5.5" width="12" height="8.5" rx="2" fill="white" />
                <circle cx="6" cy="9.75" r="1.2" fill="#8a94a6" />
              </svg>
            )}
          </button>
          <label className="popup-field">
            <span>{t(locale, 'settings.height')}</span>
            <input
              type="number"
              min={UNIT_LIMITS[unit].min}
              max={UNIT_LIMITS[unit].max}
              step="any"
              value={height}
              placeholder={t(locale, 'popup.auto')}
              onChange={(e) => setHeightValue(e.target.value)}
            />
          </label>
          <label className="popup-field">
            <span>{t(locale, 'settings.unit')}</span>
            <select value={unit} onChange={(e) => handleUnitChange(e.target.value as Unit)}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {t(locale, `settings.units.${u}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {format !== 'gif' && (
          <label className="popup-dpi-row">
            <span>{t(locale, 'settings.resolution')}</span>
            <span className="popup-dpi-wrap">
              <input
                type="number"
                min={DPI_LIMITS.min}
                max={DPI_LIMITS.max}
                step="1"
                value={dpi}
                onChange={(e) => {
                  setDpi(e.target.value);
                  setActivePreset(null);
                }}
              />
              <span className="popup-dpi-suffix">DPI</span>
            </span>
          </label>
        )}

        {!aspectLocked && width !== height && (
          <div
            className="popup-mode-row"
            role="radiogroup"
            aria-label={t(locale, 'settings.resize_mode')}
          >
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                className={`popup-mode-btn${mode === m ? ' selected' : ''}`}
                title={t(locale, `settings.mode_${m}_tip`)}
                onClick={() => {
                  setMode(m);
                  setActivePreset(null);
                }}
              >
                {t(locale, `settings.mode_${m}`)}
              </button>
            ))}
          </div>
        )}

        <div className="popup-format-row">
          <label className="popup-field">
            <span>{t(locale, 'settings.format')}</span>
            <select
              value={format}
              onChange={(e) => handleFormatChange(e.target.value as OutputFormat)}
            >
              {FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f === 'jpeg' ? 'JPG' : f.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          {(format === 'jpeg' || format === 'webp') && (
            <label className="popup-field">
              <span>{t(locale, 'settings.quality')}</span>
              <span className="popup-quality-wrap">
                <input
                  type="number"
                  min={QUALITY_LIMITS.min}
                  max={QUALITY_LIMITS.max}
                  step="1"
                  value={quality}
                  onChange={(e) => {
                    setQuality(Number(e.target.value));
                    setActivePreset(null);
                  }}
                />
                <span className="popup-quality-suffix">%</span>
              </span>
            </label>
          )}
          {/* Background — always shown, like the web SettingsPanel. */}
          <div
            className="popup-bg-group"
            role="radiogroup"
            aria-label={t(locale, 'settings.background')}
          >
            <span>{t(locale, 'settings.background')}</span>
            <div className="popup-bg-swatches">
              {(['white', 'black'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={background === c}
                  aria-label={t(locale, c === 'white' ? 'settings.bg_white' : 'settings.bg_black')}
                  title={t(locale, c === 'white' ? 'settings.bg_white' : 'settings.bg_black')}
                  className={`popup-bg-btn ${c}${background === c ? ' selected' : ''}`}
                  onClick={() => {
                    setBackground(c);
                    setActivePreset(null);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <button
        type="button"
        className="popup-primary"
        disabled={processing || files.length === 0 || validationError !== null}
        onClick={() => void handleResize()}
      >
        {processing
          ? t(locale, 'settings.processing')
          : files.length > 1
            ? t(locale, 'settings.process_many')
            : t(locale, 'settings.process_one')}
      </button>
      {validationError && (
        <p role="alert" className="popup-validation">
          {validationError}
        </p>
      )}

      {results.length > 0 && (
        <div className="popup-results">
          <p className="popup-label">{t(locale, 'popup.results_label')}</p>
          {results.map((r) => {
            const saved = percentSaved(r.originalSize, r.outputSize);
            return (
              <div key={r.id} className="popup-result">
                <div className="popup-result-info">
                  <span className="popup-result-name" title={r.fileName}>
                    {r.fileName}
                  </span>
                  <span className="popup-result-meta">
                    {r.outputWidth}×{r.outputHeight} · {formatBytes(r.originalSize)} →{' '}
                    {formatBytes(r.outputSize)}
                  </span>
                </div>
                <span className={saved >= 0 ? 'popup-saved' : 'popup-larger'}>
                  {saved >= 0
                    ? `${saved}% ${t(locale, 'result.saved')}`
                    : `+${Math.abs(saved)}% ${t(locale, 'result.larger')}`}
                </span>
                <button type="button" onClick={() => void downloadBlobUrl(r.blobUrl, r.fileName)}>
                  {t(locale, 'popup.download')}
                </button>
              </div>
            );
          })}
          <button
            type="button"
            className="popup-download-all"
            disabled={zipping}
            onClick={() => void handleDownloadAll()}
          >
            {t(locale, 'popup.download_all')}
          </button>
        </div>
      )}

      <div className="popup-footer">
        <button type="button" className="popup-secondary" onClick={() => void openEditor()}>
          {t(locale, 'popup.open_editor')}
        </button>
        <button type="button" className="popup-secondary" onClick={() => void openTools()}>
          {t(locale, 'popup.open_tools')}
        </button>
        <button type="button" className="popup-secondary" onClick={() => void openSettings()}>
          {t(locale, 'popup.settings')}
        </button>
      </div>
    </div>
  );
}
