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
    <svg viewBox="0 0 110 110" fill="none" aria-hidden="true" className="h-8 w-8 sm:h-9 sm:w-9">
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
      className="group relative mx-auto box-border w-full min-w-0 max-w-[940px] cursor-pointer rounded-2xl bg-[var(--ed-dropzone)] px-4 py-6 text-center shadow-sm transition hover:bg-[color-mix(in_srgb,var(--ed-surface-2)_30%,transparent)] sm:px-8 sm:py-8 md:py-9"
    >
      {/* Dashed border drawn as an SVG rect (reference style). Drag-over
          state = thicker dash stroke, exactly like the web Dropzone. */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <rect
          x="2"
          y="2"
          rx="14"
          fill="none"
          stroke="var(--ed-dash)"
          strokeWidth={dragging ? 3.5 : 2}
          strokeDasharray="6 10"
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
        <div className="absolute left-1/2 top-4 z-10 max-w-[calc(100%-1rem)] -translate-x-1/2 truncate whitespace-nowrap rounded-full bg-[#1a1d23] px-5 py-2 text-sm font-normal text-white shadow-lg">
          <span className="dots">{t(locale, 'dropzone.processing')}</span>
        </div>
      )}

      <div className="flex min-w-0 flex-col items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--ed-accent)_10%,transparent)] text-[var(--ed-accent)] transition duration-200 group-hover:scale-105 sm:h-16 sm:w-16">
          <UploadMark />
        </div>
        <p className="mt-3 px-2 text-base font-semibold text-[var(--ed-ink)] sm:mt-4 sm:text-lg md:text-xl">
          {t(locale, 'dropzone.title_a')}{' '}
          <span className="text-[var(--ed-accent)] hover:underline">
            {t(locale, 'dropzone.browse')}
          </span>
          <span className="mt-1 block text-xs font-normal text-[var(--ed-muted)] sm:ml-1 sm:mt-0 sm:inline sm:text-sm">
            {t(locale, 'dropzone.paste_hint')}
          </span>
        </p>
        <span className="mt-3.5 inline-flex w-full max-w-[240px] items-center justify-center rounded-[8px] bg-[var(--ed-accent)] px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0257bf] hover:shadow-md active:scale-95 sm:mt-5 sm:w-auto sm:text-base">
          {t(locale, 'dropzone.select')}
        </span>
        <div className="mt-3 flex min-w-0 max-w-full flex-wrap items-center justify-center gap-2 px-2 sm:mt-4">
          <span className="inline-flex max-w-full items-center gap-1.5 whitespace-normal break-words rounded-full border border-[var(--ed-pill-line)] bg-[var(--ed-pill-bg)] px-3.5 py-1 text-center text-xs font-medium text-[var(--ed-pill-text)]">
            {t(locale, 'dropzone.limits_info')}
          </span>
        </div>
      </div>

      {files.length > 0 && (
        <div
          className="mt-8 flex w-full min-w-0 max-w-full flex-col items-center"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div className="mb-3 flex min-w-0 max-w-full flex-wrap items-center justify-center gap-2">
            <span
              className={`max-w-full rounded-full border px-3 py-1 text-xs font-semibold ${
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
          <div className="flex w-full min-w-0 max-w-full flex-wrap justify-center gap-4">
            {files.map((item) => (
              <div
                key={item.id}
                data-testid={`thumb-${item.id}`}
                className="relative box-border w-[140px] min-w-0 max-w-full rounded-[6px] border border-[var(--ed-dash)] bg-[var(--ed-surface)] transition duration-150 hover:scale-[1.02] hover:shadow-[0_8px_24px_color-mix(in_srgb,var(--ed-accent)_18%,transparent)]"
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
                <div className="checkerboard flex h-[110px] w-full min-w-0 max-w-[138px] items-center justify-center overflow-hidden rounded-t-[5px] bg-[var(--ed-thumb-bg)]">
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div className="min-w-0 p-2 text-left">
                  <p
                    className="clamp-2 min-w-0 break-words text-xs font-normal leading-snug text-[var(--ed-ink)]"
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
          className="mx-auto mt-8 box-border flex w-full min-w-0 max-w-xl items-start gap-3 rounded-[6px] bg-[#d33] p-4 text-left text-sm text-white shadow-sm transition"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="mt-0.5 shrink-0 text-white">
            <WarningIcon size={22} />
          </span>
          <div className="min-w-0 flex-1 break-words">
            <div className="font-semibold text-white">
              {failedFiles.length > 1 ? t(locale, 'errors.unsupported_many') : error}
            </div>
            {failedFiles.length > 0 && (
              <div id="failedFilesList" className="mt-1 break-all font-mono text-xs text-white/80">
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
              className="shrink-0 text-white/80 transition hover:text-white"
            >
              <CloseIcon size={16} />
            </button>
          )}
        </div>
      )}
      {!error && localRejected.length > 0 && (
        <div
          role="alert"
          className="mx-auto mt-8 box-border flex w-full min-w-0 max-w-xl items-start gap-3 rounded-[6px] bg-[#d33] p-4 text-left text-sm text-white shadow-sm transition"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="mt-0.5 shrink-0 text-white">
            <WarningIcon size={22} />
          </span>
          <div className="min-w-0 flex-1 break-words">
            <div className="font-semibold text-white">
              {localRejected.length > 1
                ? t(locale, 'errors.unsupported_many')
                : t(locale, 'errors.unsupported', { name: localRejected[0] })}
            </div>
            <div id="failedFilesList" className="mt-1 break-all font-mono text-xs text-white/80">
              {localRejected.join(', ')}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLocalRejected([])}
            aria-label={t(locale, 'errors.dismiss')}
            className="shrink-0 text-white/80 transition hover:text-white"
          >
            <CloseIcon size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
