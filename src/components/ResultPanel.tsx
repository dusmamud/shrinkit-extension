import { useCallback, useEffect, useState } from 'react';
import { t } from '../lib/i18n/index';
import type { Locale } from '../lib/i18n/index';
import { formatBytes, percentSaved } from '../lib/image/filenames';
import type { ProcessedImage } from '../lib/image/process';

export type ItemStatus = 'queued' | 'processing' | 'done' | 'error';

export interface QueueItem {
  id: string;
  file: File;
  previewUrl: string;
  status: ItemStatus;
  error?: string;
  result?: ProcessedImage;
  resultUrl?: string;
  /** Background colour the item was processed with (for the flatten note). */
  background: 'white' | 'black';
  /** Decoded dimensions, filled in asynchronously after the file is added. */
  dims?: { width: number; height: number };
}

export interface ResultPanelProps {
  items: QueueItem[];
  onDownload: (item: QueueItem) => void;
  onDownloadAll: () => Promise<void> | void;
  onClear: () => void;
  onRemove: (id: string) => void;
  locale: Locale;
}

function DownloadIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M5 15V5a2 2 0 0 1 2-2h10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m5 13 4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WarningIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2 1 21h22L12 2Zm0 6.5a1.25 1.25 0 0 1 1.25 1.25v4.5A1.25 1.25 0 0 1 12 15.5a1.25 1.25 0 0 1-1.25-1.25v-4.5A1.25 1.25 0 0 1 12 8.5Zm0 9.25a1.5 1.5 0 1 1 0-.01Z" />
    </svg>
  );
}

function CaretDownIcon({ size = 16, rotated }: { size?: number; rotated?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`transition-transform duration-200 ${rotated ? 'rotate-180' : ''}`}
    >
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FileImageIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="9" r="1.5" fill="currentColor" />
      <path
        d="m21 15-4.5-4.5L5 22"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Copy an image blob to the clipboard using the Async Clipboard API.
 * Converts to PNG when the source format is not clipboard-friendly.
 */
async function copyImageToClipboard(blob: Blob): Promise<boolean> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.clipboard ||
    !('write' in navigator.clipboard)
  ) {
    return false;
  }
  try {
    if (blob.type === 'image/png') {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return true;
    }
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png'),
    );
    if (!pngBlob) return false;
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
    return true;
  } catch {
    return false;
  }
}

function SizeLine({ locale, item }: { locale: Locale; item: QueueItem }) {
  const r = item.result;
  if (!r) return null;
  const saved = percentSaved(r.originalBytes, r.outputBytes);
  return (
    <p className="text-xs font-light text-[var(--ed-muted)]">
      {r.width}×{r.height} · {formatBytes(r.originalBytes)} → {formatBytes(r.outputBytes)}{' '}
      <span className={saved >= 0 ? 'text-[var(--ed-success)]' : 'text-[var(--ed-warning)]'}>
        {saved >= 0
          ? `${saved}% ${t(locale, 'result.saved')}`
          : `+${Math.abs(saved)}% ${t(locale, 'result.larger')}`}
      </span>
    </p>
  );
}

function CardSizeLine({ locale, item }: { locale: Locale; item: QueueItem }) {
  const r = item.result;
  if (!r) return null;
  const saved = percentSaved(r.originalBytes, r.outputBytes);
  return (
    <>
      <p className="mt-0.5 text-[11px] font-light text-[var(--ed-muted)]">
        {formatBytes(r.originalBytes)} → {formatBytes(r.outputBytes)}
      </p>
      <p
        className={`text-[11px] font-medium ${
          saved >= 0 ? 'text-[var(--ed-success)]' : 'text-[var(--ed-warning)]'
        }`}
      >
        {saved >= 0
          ? `${saved}% ${t(locale, 'result.saved')}`
          : `+${Math.abs(saved)}% ${t(locale, 'result.larger')}`}
      </p>
    </>
  );
}

export default function ResultPanel({
  items,
  onDownload,
  onDownloadAll,
  onClear,
  onRemove,
  locale,
}: ResultPanelProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);

  useEffect(() => {
    if (!menuOpenId) return;
    const close = () => setMenuOpenId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menuOpenId]);

  const handleCopy = useCallback(async (item: QueueItem) => {
    if (!item.result) return;
    const blob = new Blob([item.result.data.buffer as ArrayBuffer], {
      type: item.result.format === 'png' ? 'image/png' : 'image/jpeg',
    });
    const success = await copyImageToClipboard(blob);
    if (success) {
      setCopiedId(item.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    }
  }, []);

  const handleDownloadAll = useCallback(async () => {
    if (zipping) return;
    setZipping(true);
    try {
      await onDownloadAll();
    } finally {
      setZipping(false);
    }
  }, [onDownloadAll, zipping]);

  const done = items.filter((i) => i.status === 'done' && i.result);
  const errored = items.filter((i) => i.status === 'error');
  if (done.length === 0 && errored.length === 0) return null;
  const multi = done.length > 1;

  return (
    <section
      data-testid="result-panel"
      className="mx-auto mt-10 w-full max-w-[850px] px-3 text-center sm:px-4"
      aria-live="polite"
    >
      <h3 className="mb-6 text-center text-[1.625rem] font-medium text-[var(--ed-ink)] sm:text-[2rem]">
        {t(locale, 'result.title')}
      </h3>

      {!multi && (
        <div className="flex flex-col items-center">
          {done.map((item) => (
            <div
              key={item.id}
              data-testid={`result-row-${item.id}`}
              className="flex w-full max-w-[540px] flex-col items-center"
            >
              {item.resultUrl ? (
                <div className="checkerboard group relative max-w-full overflow-hidden rounded-[12px] border border-[var(--ed-line)] bg-[var(--ed-thumb-bg)] p-2 shadow-sm transition hover:shadow-md">
                  <img
                    src={item.resultUrl}
                    alt={item.result?.fileName ?? item.file.name}
                    className="mx-auto max-h-[280px] w-auto max-w-full rounded-[8px] object-contain sm:max-h-[360px]"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="flex h-36 w-36 items-center justify-center rounded-[12px] border border-[var(--ed-line)] bg-[var(--ed-thumb-bg)]">
                  <span className="text-[var(--ed-accent)]">
                    <FileImageIcon size={48} />
                  </span>
                </div>
              )}

              <div className="mt-4 max-w-full px-2 text-center">
                <p
                  className="truncate text-base font-semibold text-[var(--ed-ink)] sm:text-lg"
                  title={item.result?.fileName ?? item.file.name}
                >
                  {item.result?.fileName ?? item.file.name}
                </p>
                <div className="mt-1 flex items-center justify-center">
                  <SizeLine locale={locale} item={item} />
                </div>
              </div>

              <div className="mt-5 flex w-full max-w-[340px] items-center justify-center gap-3">
                <div className="relative flex flex-1 items-stretch rounded-[8px] shadow-sm">
                  <button
                    type="button"
                    data-testid={`download-${item.id}`}
                    onClick={() => onDownload(item)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-l-[8px] bg-[var(--ed-accent)] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#0257bf] active:scale-[0.99] sm:text-base"
                  >
                    <DownloadIcon size={18} />
                    <span>{t(locale, 'result.download')}</span>
                  </button>
                  <div className="w-[1px] bg-white/25" />
                  <button
                    type="button"
                    data-testid={`split-dropdown-${item.id}`}
                    aria-label={t(locale, 'result.copy')}
                    aria-expanded={menuOpenId === item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(menuOpenId === item.id ? null : item.id);
                    }}
                    className="inline-flex items-center justify-center rounded-r-[8px] bg-[var(--ed-accent)] px-3.5 py-3.5 text-white transition hover:bg-[#0257bf] active:scale-[0.99]"
                  >
                    <CaretDownIcon size={16} rotated={menuOpenId === item.id} />
                  </button>
                  {menuOpenId === item.id && (
                    <div
                      className="ed-menu-in absolute right-0 top-full z-30 mt-2 w-52 rounded-[8px] border border-[var(--ed-line)] bg-[var(--ed-surface)] p-1.5 shadow-xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        data-testid={`copy-${item.id}`}
                        onClick={() => {
                          void handleCopy(item);
                          window.setTimeout(() => setMenuOpenId(null), 1200);
                        }}
                        className={`flex w-full items-center gap-2.5 rounded-[6px] px-3.5 py-2.5 text-sm font-medium transition ${
                          copiedId === item.id
                            ? 'bg-[var(--ed-success-bg)] font-semibold text-[var(--ed-success)]'
                            : 'text-[var(--ed-ink)] hover:bg-[var(--ed-surface-2)]'
                        }`}
                      >
                        {copiedId === item.id ? (
                          <>
                            <CheckIcon size={18} />
                            <span>{t(locale, 'result.copied')}</span>
                          </>
                        ) : (
                          <>
                            <CopyIcon size={18} />
                            <span>{t(locale, 'result.copy')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  aria-label={`${t(locale, 'result.remove')}: ${item.file.name}`}
                  className="shrink-0 rounded-full p-2.5 text-[var(--ed-muted)] transition hover:bg-[var(--ed-error-soft)] hover:text-[var(--ed-error)]"
                  title={t(locale, 'result.remove')}
                >
                  <TrashIcon size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {multi && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {done.map((item) => (
              <div
                key={item.id}
                data-testid={`result-card-${item.id}`}
                className="relative flex flex-col justify-between overflow-hidden rounded-[8px] border border-[var(--ed-line)] bg-[var(--ed-surface)] p-2.5 text-center shadow-xs sm:p-3"
              >
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  aria-label={`${t(locale, 'result.remove')}: ${item.file.name}`}
                  className="absolute right-1 top-1 z-10 rounded-full bg-[var(--ed-surface)]/90 p-1.5 text-[var(--ed-muted)] shadow-sm transition hover:bg-[var(--ed-error-soft)] hover:text-[var(--ed-error)]"
                >
                  <TrashIcon size={14} />
                </button>
                <div>
                  {item.resultUrl ? (
                    <div className="checkerboard overflow-hidden rounded-[6px] bg-[var(--ed-thumb-bg)]">
                      <img
                        src={item.resultUrl}
                        alt={item.result?.fileName ?? item.file.name}
                        className="mx-auto max-h-[120px] w-auto max-w-full object-contain sm:max-h-[155px]"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="mx-auto flex h-[120px] items-center justify-center rounded-[6px] bg-[var(--ed-thumb-bg)]">
                      <span className="text-[var(--ed-accent)]">
                        <FileImageIcon size={36} />
                      </span>
                    </div>
                  )}
                  <p
                    className="clamp-2 mt-2 break-words text-xs font-medium text-[var(--ed-ink)]"
                    title={item.result?.fileName ?? item.file.name}
                  >
                    {item.result?.fileName ?? item.file.name}
                  </p>
                  <CardSizeLine locale={locale} item={item} />
                </div>
                <div className="mt-3 flex w-full min-w-0 items-stretch gap-1.5">
                  <button
                    type="button"
                    data-testid={`download-${item.id}`}
                    onClick={() => onDownload(item)}
                    className="inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-[6px] bg-[var(--ed-accent)] px-2 py-2 text-xs font-semibold text-white transition hover:bg-[#0257bf] active:scale-95"
                    title={t(locale, 'result.download')}
                  >
                    <DownloadIcon size={14} />
                    <span className="truncate">{t(locale, 'result.download')}</span>
                  </button>
                  <button
                    type="button"
                    data-testid={`copy-${item.id}`}
                    onClick={() => void handleCopy(item)}
                    title={
                      copiedId === item.id ? t(locale, 'result.copied') : t(locale, 'result.copy')
                    }
                    className={`inline-flex shrink-0 items-center justify-center rounded-[6px] border px-2 py-2 text-xs font-medium transition active:scale-95 ${
                      copiedId === item.id
                        ? 'border-[var(--ed-success)] bg-[var(--ed-success-bg)] text-[var(--ed-success)]'
                        : 'border-[var(--ed-line)] bg-[var(--ed-surface)] text-[var(--ed-ink-2)] hover:bg-[var(--ed-surface-2)] hover:text-[var(--ed-accent)]'
                    }`}
                  >
                    {copiedId === item.id ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            data-testid="download-zip"
            onClick={() => void handleDownloadAll()}
            disabled={zipping}
            className="mt-6 w-full rounded-[6px] bg-[var(--ed-btn-b,#007bff)] py-4 text-base font-bold text-white transition hover:bg-[#0257bf] disabled:opacity-50"
          >
            <span className="mr-2 inline-block align-middle">
              <DownloadIcon size={17} />
            </span>
            {t(locale, 'result.download_all')}
          </button>
        </>
      )}

      {errored.length > 0 && (
        <div className="mt-5 space-y-2">
          {errored.map((item) => (
            <p
              key={item.id}
              role="alert"
              className="flex min-w-0 items-center gap-2 rounded-[4px] bg-[var(--ed-error-soft)] px-4 py-2.5 text-left text-sm font-normal text-[var(--ed-error)]"
            >
              <span className="shrink-0">
                <WarningIcon size={17} />
              </span>
              <span className="min-w-0 shrink-0 truncate font-medium">{item.file.name}:</span>{' '}
              <span className="min-w-0 break-words">{item.error}</span>
            </p>
          ))}
        </div>
      )}

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-2 rounded-[6px] border border-[var(--ed-input-line)] px-6 py-2.5 text-sm font-medium text-[var(--ed-ink-2)] transition hover:border-[var(--ed-error)] hover:text-[var(--ed-error)]"
        >
          <TrashIcon size={16} />
          {t(locale, 'result.clear')}
        </button>
      </div>
    </section>
  );
}
