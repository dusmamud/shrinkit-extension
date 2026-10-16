import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { t } from '../lib/i18n/index';
import type { Locale } from '../lib/i18n/index';
import {
  type SizeUnit,
  type OriginalSize,
  getDefaultDimensionsForUnit,
  calculateProportionalDimension,
} from '../lib/image/units';
import { UNIT_LIMITS, DPI_LIMITS, QUALITY_LIMITS } from '../lib/image/limits';
import type { OutputFormat } from '../lib/image/filenames';

export type ResizeMode = 'stretch' | 'crop' | 'fit';

/** Controlled resize settings — width/height are raw input strings. */
export interface SettingsState {
  width: string;
  height: string;
  unit: SizeUnit;
  locked: boolean;
  mode: ResizeMode;
  format: OutputFormat;
  quality: string;
  dpi: string;
  background: 'white' | 'black';
  preserveExif: boolean;
}

export interface SettingsPanelProps {
  settings: SettingsState;
  onChange: (patch: Partial<SettingsState>) => void;
  locale: Locale;
  originalSize?: OriginalSize | null;
  disabled?: boolean;
  onProcess?: () => void;
  processing?: boolean;
  queuedCount?: number;
  itemCount?: number;
  onClear?: () => void;
  onAbort?: () => void;
}

const UNITS: SizeUnit[] = ['percent', 'pixels', 'cm', 'inches'];
const FORMATS: OutputFormat[] = ['jpeg', 'png', 'webp', 'gif'];
const MODES: ResizeMode[] = ['stretch', 'crop', 'fit'];

function CaretDownIcon({ size = 16, rotated }: { size?: number; rotated?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`ml-2 shrink-0 text-[var(--ed-muted)] transition-transform duration-200 ${
        rotated ? 'rotate-180' : ''
      }`}
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

function CheckIcon({ size = 16 }: { size?: number }) {
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

function WarningIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2 1 21h22L12 2Zm0 6.5a1.25 1.25 0 0 1 1.25 1.25v4.5A1.25 1.25 0 0 1 12 15.5a1.25 1.25 0 0 1-1.25-1.25v-4.5A1.25 1.25 0 0 1 12 8.5Zm0 9.25a1.5 1.5 0 1 1 0-.01Z" />
    </svg>
  );
}

function TrashIcon({ size = 14 }: { size?: number }) {
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

function StopIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* CustomSelect — local helper (ported from the web app's CustomSelect) */
/* ------------------------------------------------------------------ */

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

interface CustomSelectProps<T extends string = string> {
  id?: string;
  testId?: string;
  ariaLabel?: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  align?: 'left' | 'center' | 'right';
}

function CustomSelect<T extends string = string>({
  id,
  testId,
  ariaLabel,
  value,
  options,
  onChange,
  disabled = false,
  className = '',
  triggerClassName = '',
  align = 'center',
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const nativeSelectRef = useRef<HTMLSelectElement>(null);

  const reactId = useId();
  const selectId = id || `select-${reactId}`;
  const listboxId = `listbox-${selectId}`;

  const selectedIndex = options.findIndex((opt) => opt.value === value);
  const [highlightedIndex, setHighlightedIndex] = useState(selectedIndex >= 0 ? selectedIndex : 0);
  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [isOpen, selectedIndex]);

  const selectOption = useCallback(
    (optionValue: T) => {
      onChange(optionValue);
      setIsOpen(false);
      triggerRef.current?.focus();
      if (nativeSelectRef.current) {
        nativeSelectRef.current.value = optionValue;
        nativeSelectRef.current.dispatchEvent(new Event('change', { bubbles: true }));
      }
    },
    [onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % options.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + options.length) % options.length);
        break;
      case 'Home':
        e.preventDefault();
        setHighlightedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setHighlightedIndex(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (options[highlightedIndex]) selectOption(options[highlightedIndex].value);
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left ${className}`}
      onKeyDown={handleKeyDown}
    >
      <select
        ref={nativeSelectRef}
        id={selectId}
        data-testid={testId}
        aria-hidden="true"
        tabIndex={-1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          pointerEvents: 'none',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`group relative flex h-[50px] cursor-pointer select-none items-center justify-between rounded-[8px] border bg-[var(--ed-surface)] px-3.5 text-[0.875rem] font-medium text-[var(--ed-ink-2)] outline-none transition-all duration-150 hover:border-[var(--ed-accent)] hover:bg-[var(--ed-surface-2)] focus:border-[var(--ed-accent)] focus:ring-2 focus:ring-[var(--ed-accent)]/20 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 sm:text-[1rem] ${
          isOpen
            ? 'border-[var(--ed-accent)] shadow-xs ring-2 ring-[var(--ed-accent)]/20'
            : 'border-[var(--ed-input-line)]'
        } ${triggerClassName}`}
      >
        <span
          className={`flex-1 truncate capitalize tracking-tight ${
            align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
          }`}
        >
          {selectedOption ? selectedOption.label : value}
        </span>
        <CaretDownIcon size={16} rotated={isOpen} />
      </button>

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          aria-label={ariaLabel}
          className={`ed-menu-in absolute z-50 mt-1.5 max-w-[240px] min-w-full overflow-hidden rounded-[10px] border border-[var(--ed-line)] bg-[var(--ed-surface)] py-1.5 shadow-xl transition-all duration-150 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {options.map((option, idx) => {
            const isSelected = option.value === value;
            const isHighlighted = idx === highlightedIndex;
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => selectOption(option.value)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`relative flex cursor-pointer select-none items-center justify-between gap-3 px-3.5 py-2.5 text-[0.875rem] capitalize transition-colors sm:text-[0.9375rem] ${
                  isSelected
                    ? 'bg-[var(--ed-pill-bg)] font-semibold text-[var(--ed-pill-text)]'
                    : isHighlighted
                      ? 'bg-[var(--ed-surface-2)] text-[var(--ed-ink-2)]'
                      : 'text-[var(--ed-ink-2)]'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <span>{option.label}</span>
                </span>
                {isSelected && (
                  <span className="shrink-0 text-[var(--ed-accent)]">
                    <CheckIcon size={16} />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Resize-mode diagrams                                               */
/* ------------------------------------------------------------------ */

function ModeDiagram({ mode }: { mode: ResizeMode }) {
  if (mode === 'stretch') {
    return (
      <svg width="64" height="44" viewBox="0 0 64 44" fill="none" aria-hidden="true">
        <rect x="2" y="11" width="22" height="22" rx="2" stroke="var(--ed-ink-2)" strokeWidth="2" />
        <path
          d="M30 22h10m0 0-3.5-3.5M40 22l-3.5 3.5"
          stroke="var(--ed-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect
          x="44"
          y="6"
          width="18"
          height="32"
          rx="2"
          stroke="var(--ed-accent)"
          strokeWidth="2"
        />
      </svg>
    );
  }
  if (mode === 'crop') {
    return (
      <svg width="64" height="44" viewBox="0 0 64 44" fill="none" aria-hidden="true">
        <rect
          x="12"
          y="8"
          width="40"
          height="28"
          rx="2"
          stroke="var(--ed-ink-2)"
          strokeWidth="2"
          strokeDasharray="4 3"
        />
        <path
          d="M12 8V2H6M52 8V2h6M12 36v6H6M52 36v6h6"
          stroke="var(--ed-accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="64" height="44" viewBox="0 0 64 44" fill="none" aria-hidden="true">
      <rect
        x="6"
        y="4"
        width="52"
        height="36"
        rx="2"
        stroke="var(--ed-ink-2)"
        strokeWidth="2"
        strokeDasharray="4 3"
      />
      <rect x="20" y="12" width="24" height="20" rx="2" fill="var(--ed-accent)" opacity="0.85" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* SettingsPanel                                                      */
/* ------------------------------------------------------------------ */

export default function SettingsPanel({
  settings,
  onChange,
  locale,
  originalSize,
  disabled = false,
  onProcess,
  processing = false,
  itemCount = 1,
  onClear,
  onAbort,
}: SettingsPanelProps) {
  const locked = settings.locked;

  const original: OriginalSize =
    originalSize && originalSize.width > 0 && originalSize.height > 0
      ? originalSize
      : { width: 1920, height: 1080 };

  const unitLimit = UNIT_LIMITS[settings.unit];

  const wNum = Number(settings.width);
  const hNum = Number(settings.height);
  const isWidthInvalid = !Number.isFinite(wNum) || wNum < unitLimit.min || wNum > unitLimit.max;
  const isHeightInvalid = !Number.isFinite(hNum) || hNum < unitLimit.min || hNum > unitLimit.max;

  const widthError = isWidthInvalid
    ? t(locale, 'errors.width_limit', {
        min: `${unitLimit.min}${unitLimit.suffix}`,
        max: `${unitLimit.max.toLocaleString()}${unitLimit.suffix}`,
      })
    : null;
  const heightError = isHeightInvalid
    ? t(locale, 'errors.height_limit', {
        min: `${unitLimit.min}${unitLimit.suffix}`,
        max: `${unitLimit.max.toLocaleString()}${unitLimit.suffix}`,
      })
    : null;

  // The web app shows resize modes only if unlocked AND width !== height.
  const showModes = !locked && settings.width !== settings.height;
  const resolutionApplies = settings.format !== 'gif';
  const qualityApplies = settings.format === 'jpeg' || settings.format === 'webp';

  const dpiNum = Number(settings.dpi);
  const isDpiInvalid =
    resolutionApplies &&
    (!Number.isFinite(dpiNum) || dpiNum < DPI_LIMITS.min || dpiNum > DPI_LIMITS.max);
  const dpiError = isDpiInvalid ? t(locale, 'errors.dpi_limit') : null;

  const qualityNum =
    settings.format === 'png' || settings.format === 'gif' ? '100' : settings.quality || '90';
  const qNum = Number(qualityNum);
  const isQualityInvalid =
    qualityApplies &&
    (!Number.isFinite(qNum) || qNum < QUALITY_LIMITS.min || qNum > QUALITY_LIMITS.max);
  const qualityError = isQualityInvalid ? t(locale, 'errors.quality_limit') : null;

  const validationError = widthError || heightError || dpiError || qualityError;

  const setWidth = (value: string) => {
    if (locked) {
      const nw = Number(value);
      if (Number.isFinite(nw) && nw > 0) {
        const nh = calculateProportionalDimension('width', nw, settings.unit, original);
        onChange({ width: value, height: String(nh) });
        return;
      }
    }
    onChange({ width: value });
  };

  const setHeight = (value: string) => {
    if (locked) {
      const nh = Number(value);
      if (Number.isFinite(nh) && nh > 0) {
        const nw = calculateProportionalDimension('height', nh, settings.unit, original);
        onChange({ height: value, width: String(nw) });
        return;
      }
    }
    onChange({ height: value });
  };

  const toggleLock = () => {
    const nextLocked = !locked;
    if (nextLocked) {
      const nw = Number(settings.width);
      if (Number.isFinite(nw) && nw > 0) {
        const nh = calculateProportionalDimension('width', nw, settings.unit, original);
        onChange({ locked: nextLocked, height: String(nh) });
        return;
      }
    }
    onChange({ locked: nextLocked });
  };

  const handleUnitChange = (newUnit: SizeUnit) => {
    const def = getDefaultDimensionsForUnit(newUnit, original, Number(settings.dpi) || 72);
    onChange({ unit: newUnit, width: def.width, height: def.height });
  };

  const handleFormatChange = (newFormat: OutputFormat) => {
    if (newFormat === 'jpeg') {
      onChange({
        format: newFormat,
        quality: settings.quality && settings.quality !== '100' ? settings.quality : '90',
      });
    } else if (newFormat === 'png') {
      onChange({ format: newFormat, quality: '100' });
    } else if (newFormat === 'gif') {
      onChange({ format: newFormat, dpi: '72' });
    } else {
      onChange({ format: newFormat });
    }
  };

  const inputClass = (invalid: boolean) =>
    `h-[50px] w-[68px] text-center text-[1.15em] font-light outline-none transition sm:w-[72px] sm:text-[1.25em] ${
      invalid
        ? 'rounded-[6px] border-2 border-[var(--ed-error)] bg-[var(--ed-error-soft)] text-[var(--ed-error)] focus:border-[var(--ed-error)]'
        : 'rounded-[6px] border border-[var(--ed-input-line)] bg-[var(--ed-input-bg)] text-[var(--ed-ink-2)] focus:border-[var(--ed-accent)]'
    }`;

  return (
    <section id="resize-form-offline" aria-label={t(locale, 'settings.title')} className="py-4">
      <div className="resize-form-container table-multi-resize mx-auto max-w-[650px]">
        <h2 className="title mb-8 text-center font-sans text-[2rem] font-medium text-[var(--ed-ink-2)]">
          {t(locale, 'settings.title')}
        </h2>

        {/* (a) Size Form Area */}
        <div className="size-form-area flex flex-col items-center justify-center">
          <div className="flex items-center justify-center">
            {/* Labels Column */}
            <div className="flex flex-col gap-4 pr-2.5 text-right sm:pr-4">
              <div className="flex h-[50px] items-center justify-end">
                <label
                  htmlFor="set-width"
                  className="lbl-full whitespace-nowrap text-[0.875rem] font-medium text-[var(--ed-ink)] sm:text-[1.125rem]"
                >
                  {t(locale, 'settings.width')}
                </label>
              </div>
              <div className="flex h-[50px] items-center justify-end">
                <label
                  htmlFor="set-height"
                  className="lbl-full whitespace-nowrap text-[0.875rem] font-medium text-[var(--ed-ink)] sm:text-[1.125rem]"
                >
                  {t(locale, 'settings.height')}
                </label>
              </div>
            </div>

            {/* Inputs Column */}
            <div className="flex flex-col gap-4">
              <input
                id="set-width"
                data-testid="width-input"
                type="number"
                min={unitLimit.min}
                max={unitLimit.max}
                step="any"
                value={settings.width}
                disabled={disabled}
                onChange={(e) => setWidth(e.target.value)}
                title={
                  widthError || `Allowed: ${unitLimit.min}–${unitLimit.max}${unitLimit.suffix}`
                }
                className={inputClass(isWidthInvalid)}
              />
              <input
                id="set-height"
                data-testid="height-input"
                type="number"
                min={unitLimit.min}
                max={unitLimit.max}
                step="any"
                value={settings.height}
                disabled={disabled}
                onChange={(e) => setHeight(e.target.value)}
                title={
                  heightError || `Allowed: ${unitLimit.min}–${unitLimit.max}${unitLimit.suffix}`
                }
                className={inputClass(isHeightInvalid)}
              />
            </div>

            {/* Bracket + Lock Badge + Unit Dropdown */}
            <div className="flex items-center">
              <div style={{ position: 'relative', width: '58px', height: '116px', flexShrink: 0 }}>
                <svg
                  width="58"
                  height="116"
                  viewBox="0 0 58 116"
                  className="overflow-visible"
                  aria-hidden="true"
                >
                  <path
                    d="M 0 25 L 18 25 Q 26 25 26 33 L 26 45"
                    fill="none"
                    stroke={locked ? 'var(--ed-ink-2)' : 'transparent'}
                    strokeWidth="1.2"
                  />
                  <path
                    d="M 0 91 L 18 91 Q 26 91 26 83 L 26 71"
                    fill="none"
                    stroke={locked ? 'var(--ed-ink-2)' : 'transparent'}
                    strokeWidth="1.2"
                  />
                  <line
                    x1="39"
                    y1="58"
                    x2="58"
                    y2="58"
                    stroke="var(--ed-ink-2)"
                    strokeWidth="1.2"
                  />
                </svg>
                <button
                  type="button"
                  data-testid="aspect-lock"
                  aria-pressed={locked}
                  aria-label={t(locale, locked ? 'settings.unlock_aspect' : 'settings.lock_aspect')}
                  data-tip={t(locale, 'settings.lock_tip')}
                  onClick={toggleLock}
                  style={{
                    position: 'absolute',
                    left: '13px',
                    top: '45px',
                    width: '26px',
                    height: '26px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    zIndex: 10,
                  }}
                  className={`transition-transform active:scale-95 ${
                    locked
                      ? 'bg-[var(--ed-accent)] text-white shadow-sm'
                      : 'bg-[#9ca3af] text-white opacity-80'
                  }`}
                >
                  {locked ? (
                    <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                      <path
                        d="M2.5 5.5V3.5C2.5 1.567 4.067 0 6 0C7.933 0 9.5 1.567 9.5 3.5V5.5"
                        stroke="white"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <rect y="5.5" width="12" height="8.5" rx="2" fill="white" />
                      <circle cx="6" cy="9.75" r="1.2" fill="var(--ed-accent)" />
                    </svg>
                  ) : (
                    <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                      <path
                        d="M2.5 5.5V3.5C2.5 1.567 4.067 0 6 0C7.933 0 9.5 1.567 9.5 3.5"
                        stroke="white"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <rect y="5.5" width="12" height="8.5" rx="2" fill="white" />
                      <circle cx="6" cy="9.75" r="1.2" fill="#9ca3af" />
                    </svg>
                  )}
                </button>
              </div>

              <CustomSelect<SizeUnit>
                id="set-unit"
                testId="unit-select"
                ariaLabel={t(locale, 'settings.unit')}
                value={settings.unit}
                disabled={disabled}
                onChange={handleUnitChange}
                className="w-[125px] sm:w-[155px]"
                triggerClassName="w-full"
                options={UNITS.map((u) => ({
                  value: u,
                  label: t(locale, `settings.units.${u}`),
                }))}
              />
            </div>
          </div>

          {(widthError || heightError) && (
            <div
              role="alert"
              className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-[var(--ed-error)]"
            >
              <span className="shrink-0">
                <WarningIcon size={15} />
              </span>
              <span>{widthError || heightError}</span>
            </div>
          )}

          {resolutionApplies && (
            <div
              id="resolution_row"
              data-tip={t(locale, 'settings.resolution_tip')}
              className="mt-4 flex flex-col items-center justify-center"
            >
              <div className="flex items-center justify-center">
                <div className="flex h-[50px] items-center justify-end pr-2.5 sm:pr-4">
                  <label
                    htmlFor="set-dpi"
                    className="lbl-full cursor-help whitespace-nowrap text-[0.875rem] font-medium text-[var(--ed-ink)] underline decoration-dotted underline-offset-4 sm:text-[1.125rem]"
                  >
                    {t(locale, 'settings.resolution')}
                  </label>
                </div>
                <div className="flex items-center">
                  <div className="relative">
                    <input
                      id="set-dpi"
                      data-testid="dpi-input"
                      type="number"
                      min={DPI_LIMITS.min}
                      max={DPI_LIMITS.max}
                      step="1"
                      value={settings.dpi}
                      disabled={disabled}
                      onChange={(e) => onChange({ dpi: e.target.value })}
                      title={dpiError || `Allowed: ${DPI_LIMITS.min}–${DPI_LIMITS.max} DPI`}
                      className={`h-[50px] w-[85px] rounded-[6px] pr-8 text-center text-[1.15em] font-light outline-none transition sm:w-[95px] sm:text-[1.25em] ${
                        isDpiInvalid
                          ? 'border-2 border-[var(--ed-error)] bg-[var(--ed-error-soft)] text-[var(--ed-error)] focus:border-[var(--ed-error)]'
                          : 'border border-[var(--ed-input-line)] bg-[var(--ed-input-bg)] text-[var(--ed-ink-2)] focus:border-[var(--ed-accent)]'
                      }`}
                    />
                    <span
                      id="dpi_unit_overlay"
                      className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[0.75em] text-[var(--ed-muted)]"
                    >
                      DPI
                    </span>
                  </div>
                  <div className="pointer-events-none hidden w-[170px] sm:block sm:w-[208px]" />
                </div>
              </div>

              {dpiError && (
                <div
                  role="alert"
                  className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-[var(--ed-error)]"
                >
                  <span className="shrink-0">
                    <WarningIcon size={14} />
                  </span>
                  <span>{dpiError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Resize Mode Row (slides open when unlocked & W !== H) */}
        <div
          className={`mode-row ${showModes ? 'open my-4 block' : 'hidden'}`}
          aria-hidden={!showModes}
        >
          <div
            className="flex items-stretch justify-center gap-2 pb-2 sm:gap-4"
            role="radiogroup"
            aria-label={t(locale, 'settings.resize_mode')}
          >
            {MODES.map((m) => {
              const selected = settings.mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  data-testid={`mode-${m}`}
                  data-tip={t(locale, `settings.mode_${m}_tip`)}
                  disabled={disabled}
                  onClick={() => onChange({ mode: m })}
                  className={[
                    'flex w-24 flex-col items-center gap-1.5 rounded-[6px] px-2 pb-2 pt-3 transition sm:w-28 sm:px-3',
                    selected
                      ? 'scale-[1.04] border-b-4 border-[#14b8a6]'
                      : 'hover:bg-[var(--ed-surface-2)]',
                  ].join(' ')}
                >
                  <ModeDiagram mode={m} />
                  <span className="flex items-center gap-1.5 text-sm font-normal text-[var(--ed-ink)]">
                    <span
                      className={[
                        'inline-block h-3.5 w-3.5 rounded-full border-2',
                        selected
                          ? 'border-[var(--ed-accent)] bg-[var(--ed-accent)]'
                          : 'border-[var(--ed-input-line)] bg-[var(--ed-surface)]',
                      ].join(' ')}
                      aria-hidden="true"
                    />
                    {t(locale, `settings.mode_${m}`)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* (b) Format / Quality / Background row */}
        <div className="format-quality-area mt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          <div
            className="format flex flex-col items-start"
            data-tip={t(locale, 'settings.format_tip')}
          >
            <label
              htmlFor="set-format"
              className="mb-2 text-[1.15rem] font-medium text-[var(--ed-ink)]"
            >
              {t(locale, 'settings.format')}
            </label>
            <CustomSelect<OutputFormat>
              id="set-format"
              testId="format-select"
              ariaLabel={t(locale, 'settings.format')}
              value={settings.format}
              disabled={disabled}
              onChange={handleFormatChange}
              className="w-[100px] sm:w-[115px]"
              triggerClassName="w-full uppercase"
              options={FORMATS.map((f) => ({
                value: f,
                label: f === 'jpeg' ? 'JPG' : f.toUpperCase(),
              }))}
            />
          </div>

          {qualityApplies && (
            <div
              id="sector_calidad"
              className="flex flex-col items-start"
              data-tip={t(locale, 'settings.quality_tip')}
            >
              <label
                htmlFor="set-quality"
                className="mb-2 text-[1.15rem] font-medium text-[var(--ed-ink)]"
              >
                {t(locale, 'settings.quality')}
              </label>
              <div className="relative">
                <input
                  id="set-quality"
                  data-testid="quality-input"
                  type="number"
                  min={QUALITY_LIMITS.min}
                  max={QUALITY_LIMITS.max}
                  step="1"
                  value={qualityNum}
                  disabled={disabled}
                  onChange={(e) => onChange({ quality: e.target.value })}
                  title={qualityError || `Allowed: ${QUALITY_LIMITS.min}–${QUALITY_LIMITS.max}%`}
                  className={`h-[50px] w-[90px] rounded-[6px] pr-7 text-center text-[1.25em] font-light outline-none transition ${
                    isQualityInvalid
                      ? 'border-2 border-[var(--ed-error)] bg-[var(--ed-error-soft)] text-[var(--ed-error)] focus:border-[var(--ed-error)]'
                      : 'border border-[var(--ed-input-line)] bg-[var(--ed-input-bg)] text-[var(--ed-ink-2)] focus:border-[var(--ed-accent)]'
                  }`}
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[0.85em] text-[var(--ed-muted)]">
                  %
                </span>
              </div>
              {qualityError && (
                <div
                  role="alert"
                  className="mt-1 flex items-center gap-1 text-xs font-medium text-[var(--ed-error)]"
                >
                  <span className="shrink-0">
                    <WarningIcon size={14} />
                  </span>
                  <span>{qualityError}</span>
                </div>
              )}
            </div>
          )}

          <div
            id="sector_background"
            className="flex flex-col items-start"
            data-tip={t(locale, 'settings.background_tip')}
          >
            <label className="mb-2 text-[1.15rem] font-medium text-[var(--ed-ink)]">
              {t(locale, 'settings.background')}
            </label>
            <div
              className="flex h-[50px] items-center gap-3.5"
              role="radiogroup"
              aria-label={t(locale, 'settings.background')}
            >
              {(['white', 'black'] as const).map((c) => {
                const selected = settings.background === c;
                return (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    data-testid={`bg-${c}`}
                    aria-label={t(
                      locale,
                      c === 'white' ? 'settings.bg_white' : 'settings.bg_black',
                    )}
                    disabled={disabled}
                    onClick={() => onChange({ background: c })}
                    className={`background_button h-[35px] w-[35px] rounded-full transition-transform hover:scale-105 ${
                      c === 'white'
                        ? 'bg-white shadow-[0px_1px_5px_0px_rgba(0,0,0,0.2)]'
                        : 'bg-black shadow-[0px_1px_5px_0px_rgba(0,0,0,0.2)]'
                    } ${
                      selected
                        ? 'border-[3px] border-[var(--ed-accent)] ring-[3px] ring-[var(--ed-accent)]'
                        : c === 'white'
                          ? 'border border-[#ddd]'
                          : 'border border-black'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* (c) Centered Resize Button */}
        {onProcess && (
          <div id="resize-form-submit-container" className="mt-8 text-center">
            <button
              id="offline-submit-button"
              type="button"
              data-testid="process-button"
              onClick={onProcess}
              disabled={disabled || processing || itemCount === 0 || Boolean(validationError)}
              title={validationError || undefined}
              className="inline-block rounded-[6px] bg-[var(--ed-accent)] px-12 py-3.5 text-[1.125rem] font-bold text-white shadow-sm transition hover:bg-[var(--ed-accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {processing
                ? t(locale, 'settings.processing')
                : itemCount > 1
                  ? t(locale, 'settings.process_many')
                  : t(locale, 'settings.process_one')}
            </button>

            {validationError && (
              <p
                role="alert"
                className="mt-2 flex items-center justify-center gap-1 text-xs font-medium text-[var(--ed-error)]"
              >
                <span className="shrink-0">
                  <WarningIcon size={14} />
                </span>
                <span>{validationError}</span>
              </p>
            )}

            <div className="mt-3 flex justify-center gap-3">
              {processing && onAbort && (
                <button
                  type="button"
                  onClick={onAbort}
                  className="inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--ed-input-line)] px-4 py-1.5 text-xs font-normal text-[var(--ed-ink)] transition hover:border-[var(--ed-error)] hover:text-[var(--ed-error)]"
                >
                  <StopIcon size={14} /> {t(locale, 'settings.stop')}
                </button>
              )}
              {onClear && (
                <button
                  type="button"
                  onClick={onClear}
                  className="inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--ed-input-line)] px-4 py-1.5 text-xs font-normal text-[var(--ed-ink)] transition hover:border-[var(--ed-error)] hover:text-[var(--ed-error)]"
                >
                  <TrashIcon size={14} /> {t(locale, 'result.clear')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* EXIF preference */}
        <div className="mt-6 flex justify-center">
          <label className="flex cursor-pointer items-center gap-2.5 text-xs text-[var(--ed-muted)] transition hover:text-[var(--ed-ink)]">
            <input
              type="checkbox"
              data-testid="exif-checkbox"
              checked={settings.preserveExif}
              disabled={disabled}
              onChange={(e) => onChange({ preserveExif: e.target.checked })}
              className="h-3.5 w-3.5 accent-[#007bff]"
            />
            <span>{t(locale, 'settings.preserve_exif')}</span>
          </label>
        </div>
      </div>
    </section>
  );
}
