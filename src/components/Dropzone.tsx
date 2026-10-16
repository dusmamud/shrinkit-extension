import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '../lib/i18n/index';
import type { Locale } from '../lib/i18n/index';
import { formatBytes, isSupportedInputFile } from '../lib/image/filenames';
import type { QueueItem } from './ResultPanel';

export interface DropzoneProps {
  files: QueueItem[];
  onFiles: (files: File[]) => void;
  maxFiles: number;
  locale: Locale;
  disabled?: boolean;
  onRemove?: (id: string) => void;
  processing?: boolean;
  error?: string | null;
  failedFiles?: string[];
  onDismissError?: () => void;
}

function CloseIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WarningIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2 1 21h22L12 2Zm0 6.5a1.25 1.25 0 0 1 1.25 1.25v4.5A1.25 1.25 0 0 1 12 15.5a1.25 1.25 0 0 1-1.25-1.25v-4.5A1.25 1.25 0 0 1 12 8.5Zm0 9.25a1.5 1.5 0 1 1 0-.01Z" />
    </svg>
  );
}

/** Original upload-arrow mark drawn for ShrinkIt. */
function UploadMark() {
  return (
    <svg
      viewBox="0 0 110 110"
      fill="none"
      aria-hidden="true"
      className="h-16 w-16 sm:h-[110px] sm:w-[110px]"
    >
      <path d="M55 80V32" stroke="var(--ed-accent)" strokeWidth="7" strokeLinecap="round" />
      <path
        d="M34 53l21-21 21 21"
        stroke="var(--ed-accent)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M24 92h62" stroke="var(--ed-accent)" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

export default function Dropzone({
  files,
  onFiles,
  maxFiles,
  locale,
  disabled = false,
  onRemove,
  processing = false,
  error = null,
  failedFiles = [],
  onDismissError,
}: DropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  // Files this Dropzone itself rejected (browse / drag-drop). Shown with the
  // localized errors.unsupported message below; paste + right-click
  // rejections arrive via the parent `error` prop instead.
  const [localRejected, setLocalRejected] = useState<string[]>([]);

  // A parent error supersedes the local rejection banner — never stack both.
  useEffect(() => {
    if (error) setLocalRejected([]);
  }, [error]);

  const emit = useCallback(
    (list: FileList | File[] | null) => {
      if (!list || disabled) return;
      const next = Array.from(list).filter((f) => f.size > 0);
      if (next.length === 0) return;
      // Validate with isSupportedInputFile (extension + MIME) — never MIME
      // alone, so SVG (image/svg+xml) is rejected here, not just downstream.
      const supported = next.filter((f) => isSupportedInputFile(f));
      const rejected = next.filter((f) => !isSupportedInputFile(f)).map((f) => f.name);
      setLocalRejected(rejected);
      if (supported.length > 0) onFiles(supported);
    },
    [disabled, onFiles],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t(locale, 'dropzone.title')}
      aria-disabled={disabled}
      data-testid="dropzone"
      onClick={() => {
        if (!disabled) inputRef.current?.click();
      }}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) inputRef.current?.click();
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        if (disabled) return;
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        emit(e.dataTransfer.files);
      }}
      className="relative mx-auto w-full max-w-[1100px] cursor-pointer rounded-[6px] bg-[var(--ed-dropzone)] px-3 py-6 text-center transition sm:px-6 sm:py-12"
    >
      {/* Dashed border drawn as an SVG rect (reference style) */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <rect
          x="2"
          y="2"
          rx="6"
          fill="none"
          stroke="var(--ed-dash)"
          strokeWidth={dragging ? 3.5 : 2}
          strokeDasharray="6 12"
          strokeLinecap="round"
          style={{ width: 'calc(100% - 4px)', height: 'calc(100% - 4px)' }}
        />
      </svg>

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.avif"
        multiple
        data-testid="file-input"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          emit(e.target.files);
          e.target.value = '';
        }}
      />

      {processing && (
        <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#1a1d23] px-5 py-2 text-sm font-normal text-white shadow-lg">
          <span className="dots">{t(locale, 'dropzone.processing')}</span>
        </div>
      )}

      <div className="flex flex-col items-center">
        <UploadMark />
        <p className="mt-4 px-2 text-[1.15em] font-medium text-[var(--ed-ink)] sm:mt-6 sm:text-[1.4em]">
          {t(locale, 'dropzone.title_a')}{' '}
          <span className="text-[var(--ed-accent)] hover:underline">
            {t(locale, 'dropzone.browse')}
          </span>{' '}
          <span className="mt-1 block text-xs font-normal text-[var(--ed-muted)] sm:mt-0 sm:inline sm:text-sm">
            {t(locale, 'dropzone.paste_hint')}
          </span>
        </p>
        <span className="mt-4 inline-block w-full max-w-[280px] rounded-[6px] bg-[var(--ed-accent)] px-6 py-3.5 text-base font-bold text-white transition hover:bg-[var(--ed-accent-hover)] sm:mt-6 sm:w-auto sm:px-[30px] sm:py-[18px]">
          {t(locale, 'dropzone.select')}
        </span>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 px-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ed-pill-line)] bg-[var(--ed-pill-bg)] px-3.5 py-1 text-center text-xs font-medium text-[var(--ed-pill-text)]">
            {t(locale, 'dropzone.limits_info')}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ed-pill-line)] bg-[var(--ed-pill-bg)] px-3.5 py-1 text-center text-xs font-medium text-[var(--ed-pill-text)]">
            {t(locale, 'settings.format')}: JPG · PNG · WebP · GIF
          </span>
        </div>
      </div>

      {files.length > 0 && (
        <div
          className="mt-8 flex flex-col items-center"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div className="mb-3 flex items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                files.length >= maxFiles
                  ? 'border-[var(--ed-error)] bg-[var(--ed-error-soft)] text-[var(--ed-error)]'
                  : 'border-[var(--ed-line)] bg-[var(--ed-surface)] text-[var(--ed-ink-2)] shadow-sm'
              }`}
            >
              {files.length >= maxFiles
                ? t(locale, 'dropzone.batch_full', { max: maxFiles })
                : t(locale, 'dropzone.batch_count', { count: files.length, max: maxFiles })}
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {files.map((item) => (
              <div
                key={item.id}
                data-testid={`thumb-${item.id}`}
                className="relative w-[140px] rounded-[6px] border border-[var(--ed-dash)] bg-[var(--ed-surface)] transition duration-150 hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(0,123,255,0.18)]"
              >
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    aria-label={`${t(locale, 'result.remove')}: ${item.file.name}`}
                    className="absolute right-1 top-1 z-10 rounded-full bg-[var(--ed-surface)]/95 p-1 text-[var(--ed-muted)] shadow-sm transition hover:text-[var(--ed-error)]"
                  >
                    <CloseIcon size={14} />
                  </button>
                )}
                <div className="checkerboard flex h-[110px] w-[138px] items-center justify-center overflow-hidden rounded-t-[5px] bg-[var(--ed-thumb-bg)]">
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div className="p-2 text-left">
                  <p
                    className="clamp-2 text-xs font-normal leading-snug text-[var(--ed-ink)]"
                    title={item.file.name}
                  >
                    {item.file.name}
                  </p>
                  <p className="mt-1 text-[11px] font-light text-[var(--ed-muted)]">
                    {item.dims ? `${item.dims.width}×${item.dims.height} · ` : ''}
                    {formatBytes(item.file.size)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div
          id="error_message_offline"
          role="alert"
          className="mx-auto mt-8 flex max-w-xl items-start gap-3 rounded-[6px] bg-[#d33] p-4 text-left text-sm text-white shadow-sm transition"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="mt-0.5 shrink-0 text-white">
            <WarningIcon size={22} />
          </span>
          <div className="flex-1">
            <div className="font-semibold text-white">
              {failedFiles.length > 1 ? t(locale, 'errors.unsupported_many') : error}
            </div>
            {failedFiles.length > 0 && (
              <div id="failedFilesList" className="mt-1 font-mono text-xs text-white/80">
                {failedFiles.join(', ')}
              </div>
            )}
            {failedFiles.length > 0 && error && !error.includes(failedFiles[0]) && (
              <div className="mt-1 text-xs text-white/80">{error}</div>
            )}
          </div>
          {onDismissError && (
            <button
              type="button"
              onClick={onDismissError}
              aria-label={t(locale, 'errors.dismiss')}
              className="text-white/80 transition hover:text-white"
            >
              <CloseIcon size={16} />
            </button>
          )}
        </div>
      )}
      {!error && localRejected.length > 0 && (
        <div
          role="alert"
          className="mx-auto mt-8 flex max-w-xl items-start gap-3 rounded-[6px] bg-[#d33] p-4 text-left text-sm text-white shadow-sm transition"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="mt-0.5 shrink-0 text-white">
            <WarningIcon size={22} />
          </span>
          <div className="flex-1">
            <div className="font-semibold text-white">
              {localRejected.length > 1
                ? t(locale, 'errors.unsupported_many')
                : t(locale, 'errors.unsupported', { name: localRejected[0] })}
            </div>
            <div id="failedFilesList" className="mt-1 font-mono text-xs text-white/80">
              {localRejected.join(', ')}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLocalRejected([])}
            aria-label={t(locale, 'errors.dismiss')}
            className="text-white/80 transition hover:text-white"
          >
            <CloseIcon size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
