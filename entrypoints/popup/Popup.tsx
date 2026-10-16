import { useCallback, useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import { ImageProcessor, type ProcessSettings } from '../../src/lib/image/process';
import { FORMAT_MIME } from '../../src/lib/image/filenames';
import { t, type Locale } from '../../src/lib/i18n/index';
import { getSettings, saveSettings, type Settings } from '../../src/lib/settings/index';
import { LanguageSwitcher } from '../../src/components/LanguageSwitcher';
import { ThemeSwitcher } from '../../src/components/ThemeSwitcher';
import '../../src/styles/global.css';

const MAX_FILES = 5;
type Unit = 'percent' | 'pixels' | 'cm' | 'inches';
type OutputFormat = 'jpeg' | 'png' | 'webp' | 'gif';

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
  blob: Blob;
  blobUrl: string;
  fileName: string;
}
interface BannerError {
  id: number;
  message: string;
}

const UNIT_KEYS: Record<Unit, string> = {
  percent: 'popup.unit_percent',
  pixels: 'popup.unit_px',
  cm: 'popup.unit_cm',
  inches: 'popup.unit_inch',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function applyTheme(theme: string): void {
  const root = document.documentElement;
  if (theme === 'dark' || theme === 'light') {
    root.dataset.theme = theme;
    return;
  }
  root.dataset.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
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
  const [format, setFormat] = useState<OutputFormat>('jpeg');
  const [quality, setQuality] = useState(90);
  const [aspectLocked, setAspectLocked] = useState(true);
  const [activePreset, setActivePreset] = useState<string | null>('preset-50');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorIdRef = useRef(0);
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
      const picked = Array.from(incoming);
      if (picked.length === 0) return;
      const images = picked.filter((f) => f.type.startsWith('image/'));
      if (images.length < picked.length) pushError(t(locale, 'popup.error_not_image'));
      const room = MAX_FILES - filesRef.current.length;
      if (room <= 0) {
        pushError(t(locale, 'popup.error_too_many', { max: MAX_FILES }));
        return;
      }
      const accepted = images.slice(0, room);
      if (accepted.length < images.length)
        pushError(t(locale, 'popup.error_too_many', { max: MAX_FILES }));
      if (accepted.length === 0) return;
      clearResults();
      const queued: QueuedFile[] = accepted.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        naturalWidth: null,
        naturalHeight: null,
      }));
      setFiles((prev) => [...prev, ...queued]);
      for (const entry of queued) {
        const probe = new Image();
        probe.onload = () => {
          setFiles((prev) =>
            prev.map((it) =>
              it.id === entry.id
                ? { ...it, naturalWidth: probe.naturalWidth, naturalHeight: probe.naturalHeight }
                : it,
            ),
          );
        };
        probe.src = entry.previewUrl;
      }
    },
    [clearResults, locale, pushError],
  );

  useEffect(() => {
    const onPaste = (event: ClipboardEvent): void => {
      const pasted = event.clipboardData?.files;
      if (pasted && pasted.length > 0) addFiles(pasted);
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

  const resolveDims = (q: QueuedFile): { width: number; height: number } | null => {
    const w = width.trim() === '' ? null : Number(width);
    const h = height.trim() === '' ? null : Number(height);
    const nw = q.naturalWidth ?? 0;
    const nh = q.naturalHeight ?? 0;
    if (w !== null && h !== null && w > 0 && h > 0) return { width: w, height: h };
    if (nw <= 0 || nh <= 0) return null;
    if (w !== null && w > 0 && aspectLocked) {
      if (unit === 'percent') return { width: w, height: w };
      return { width: w, height: Math.max(1, Math.round((nh * w) / nw)) };
    }
    if (h !== null && h > 0 && aspectLocked) {
      if (unit === 'percent') return { width: h, height: h };
      return { width: Math.max(1, Math.round((nw * h) / nh)), height: h };
    }
    if (w !== null && w > 0) return { width: w, height: unit === 'percent' ? w : nh };
    if (h !== null && h > 0) return { width: unit === 'percent' ? h : nw, height: h };
    return { width: nw, height: nh };
  };

  const handleResize = async (): Promise<void> => {
    if (filesRef.current.length === 0) {
      pushError(t(locale, 'popup.error_no_files'));
      return;
    }
    setProcessing(true);
    clearResults();
    const outputs: ProcessedFile[] = [];
    const processor = new ImageProcessor();
    for (const q of filesRef.current) {
      const dims = resolveDims(q);
      if (!dims) {
        pushError(t(locale, 'popup.error_process_failed', { name: q.file.name }));
        continue;
      }
      const ps: ProcessSettings = {
        width: dims.width,
        height: dims.height,
        unit,
        dpi: 72,
        format,
        quality,
        background: settings?.background ?? 'white',
        preserveExif: false,
        mode: 'stretch',
      };
      try {
        const out = await processor.process(q.file, ps);
        const blob = new Blob([out.data as BlobPart], { type: FORMAT_MIME[format] });
        outputs.push({
          id: q.id,
          name: q.file.name,
          originalSize: q.file.size,
          outputSize: blob.size,
          blob,
          blobUrl: URL.createObjectURL(blob),
          fileName: out.fileName,
        });
      } catch {
        pushError(t(locale, 'popup.error_process_failed', { name: q.file.name }));
      }
    }
    setResults(outputs);
    setProcessing(false);
    try {
      await saveSettings({
        lastWidth: width,
        lastHeight: height,
        lastUnit: unit,
        lastFormat: format,
        lastQuality: String(quality),
      });
    } catch {
      pushError(t(locale, 'popup.error_save_settings'));
    }
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

  const openEditor = async (): Promise<void> => {
    const url = chrome.runtime.getURL('editor.html');
    try {
      await chrome.tabs.create({ url });
    } catch {
      window.open(url, '_blank');
    }
  };
  const openSettings = async (): Promise<void> => {
    try {
      await chrome.runtime.openOptionsPage();
    } catch {
      const url = chrome.runtime.getURL('options.html');
      await chrome.tabs.create({ url });
    }
  };

  const applyPreset = (preset: string): void => {
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
    }
  };

  return (
    <div className="popup-root">
      <header className="popup-header">
        <img src="/icons/icon-48.png" alt={t(locale, 'popup.logo_alt')} width={32} height={32} />
        <strong>ShrinkIt</strong>
        <span className="popup-header-spacer" />
        <LanguageSwitcher
          locale={locale}
          onChange={(next) => {
            setLocale(next);
            void saveSettings({ language: next });
          }}
        />
        <ThemeSwitcher
          theme={settings?.theme ?? 'system'}
          locale={locale}
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
        onDragOver={(ev) => {
          ev.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(ev) => {
          ev.preventDefault();
          setDragging(false);
          addFiles(ev.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label={t(locale, 'popup.dropzone_label')}
        onKeyDown={(ev) => {
          if (ev.key === 'Enter') fileInputRef.current?.click();
        }}
      >
        <p>{t(locale, 'popup.dropzone_title')}</p>
        <p className="popup-muted">{t(locale, 'popup.dropzone_hint', { max: MAX_FILES })}</p>
        <p className="popup-muted">
          {t(locale, 'popup.browse')} · {t(locale, 'popup.paste_hint')}
        </p>
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

      {files.length > 0 && (
        <p className="popup-count">
          {t(locale, 'popup.files_selected', { count: files.length, max: MAX_FILES })}
        </p>
      )}
      <div className="popup-thumbs">
        {files.map((item) => (
          <div key={item.id} className="popup-thumb">
            <img src={item.previewUrl} alt="" />
            <button
              type="button"
              onClick={() => removeFile(item.id)}
              aria-label={t(locale, 'popup.remove', { name: item.file.name })}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <p className="popup-label">{t(locale, 'popup.presets_label')}</p>
      <div className="popup-presets">
        {(['preset-50', 'preset-800', 'preset-20kb', 'preset-last-used'] as const).map((p) => (
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

      <div className="popup-grid">
        <label>
          {t(locale, 'popup.width')}
          <input
            type="number"
            min={1}
            value={width}
            placeholder={t(locale, 'popup.auto')}
            onChange={(e) => {
              setWidth(e.target.value);
              setActivePreset(null);
            }}
          />
        </label>
        <label>
          {t(locale, 'popup.height')}
          <input
            type="number"
            min={1}
            value={height}
            placeholder={t(locale, 'popup.auto')}
            onChange={(e) => {
              setHeight(e.target.value);
              setActivePreset(null);
            }}
          />
        </label>
        <label>
          {t(locale, 'popup.unit')}
          <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
            {(Object.keys(UNIT_KEYS) as Unit[]).map((u) => (
              <option key={u} value={u}>
                {t(locale, UNIT_KEYS[u])}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t(locale, 'popup.format')}
          <select value={format} onChange={(e) => setFormat(e.target.value as OutputFormat)}>
            {(['jpeg', 'png', 'webp', 'gif'] as const).map((f) => (
              <option key={f} value={f}>
                {f.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="popup-quality">
        {t(locale, 'popup.quality')}: {quality}%
        <input
          type="range"
          min={1}
          max={100}
          value={quality}
          disabled={format === 'png' || format === 'gif'}
          onChange={(e) => setQuality(Number(e.target.value))}
        />
      </label>
      <label className="popup-check">
        <input
          type="checkbox"
          checked={aspectLocked}
          onChange={(e) => setAspectLocked(e.target.checked)}
        />
        {t(locale, 'popup.aspect_lock')}
      </label>

      <button
        type="button"
        className="popup-primary"
        disabled={processing || files.length === 0}
        onClick={() => void handleResize()}
      >
        {processing ? t(locale, 'popup.processing') : t(locale, 'popup.resize')}
      </button>

      {results.length > 0 && (
        <div className="popup-results">
          <p className="popup-label">{t(locale, 'popup.results_label')}</p>
          {results.map((r) => (
            <div key={r.id} className="popup-result">
              <span title={r.name}>{r.name}</span>
              <span className="popup-muted">
                {formatBytes(r.originalSize)} → {formatBytes(r.outputSize)}
              </span>
              <button type="button" onClick={() => void downloadBlobUrl(r.blobUrl, r.fileName)}>
                {t(locale, 'popup.download')}
              </button>
            </div>
          ))}
          {results.length > 1 && (
            <button
              type="button"
              className="popup-secondary"
              disabled={zipping}
              onClick={() => void handleDownloadAll()}
            >
              {t(locale, 'popup.download_all')}
            </button>
          )}
        </div>
      )}

      <div className="popup-footer">
        <button type="button" className="popup-secondary" onClick={() => void openEditor()}>
          {t(locale, 'popup.open_editor')}
        </button>
        <button type="button" className="popup-secondary" onClick={() => void openSettings()}>
          {t(locale, 'popup.settings')}
        </button>
      </div>
    </div>
  );
}
