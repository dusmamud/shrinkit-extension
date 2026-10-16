import type { Locale } from '../i18n/index.js';

export type Theme = 'light' | 'dark' | 'system';
export type Unit = 'percent' | 'pixels' | 'cm' | 'inches';
export type OutputFormat = 'jpeg' | 'png' | 'gif' | 'webp';
export type DefaultPreset = '50%' | '800px' | '20KB' | 'last-used';
export type DownloadMode = 'auto' | 'ask';
export type Background = 'white' | 'black';

export interface Settings {
  theme: Theme;
  language: Locale;
  lastWidth: string;
  lastHeight: string;
  lastUnit: Unit;
  lastFormat: OutputFormat;
  lastQuality: string;
  lastDpi: string;
  defaultPreset: DefaultPreset;
  downloadMode: DownloadMode;
  preserveExif: boolean;
  background: Background;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  language: 'en',
  lastWidth: '50',
  lastHeight: '',
  lastUnit: 'percent',
  lastFormat: 'jpeg',
  lastQuality: '90',
  lastDpi: '72',
  defaultPreset: '50%',
  downloadMode: 'auto',
  preserveExif: false,
  background: 'white',
};

const STORAGE_KEY = 'shrinkit-settings';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'es' || value === 'pt';
}

function pick<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function pickString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function pickBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/**
 * Merge an untrusted stored value over the defaults, dropping anything
 * that does not match the Settings shape. Unknown keys are ignored.
 * Only settings are ever stored — never images or image data.
 */
export function sanitizeSettings(value: unknown): Settings {
  if (!isRecord(value)) {
    return { ...DEFAULT_SETTINGS };
  }
  return {
    theme: pick(value.theme, ['light', 'dark', 'system'] as const, DEFAULT_SETTINGS.theme),
    language: isLocale(value.language) ? value.language : DEFAULT_SETTINGS.language,
    lastWidth: pickString(value.lastWidth, DEFAULT_SETTINGS.lastWidth),
    lastHeight: pickString(value.lastHeight, DEFAULT_SETTINGS.lastHeight),
    lastUnit: pick(
      value.lastUnit,
      ['percent', 'pixels', 'cm', 'inches'] as const,
      DEFAULT_SETTINGS.lastUnit,
    ),
    lastFormat: pick(
      value.lastFormat,
      ['jpeg', 'png', 'gif', 'webp'] as const,
      DEFAULT_SETTINGS.lastFormat,
    ),
    lastQuality: pickString(value.lastQuality, DEFAULT_SETTINGS.lastQuality),
    lastDpi: pickString(value.lastDpi, DEFAULT_SETTINGS.lastDpi),
    defaultPreset: pick(
      value.defaultPreset,
      ['50%', '800px', '20KB', 'last-used'] as const,
      DEFAULT_SETTINGS.defaultPreset,
    ),
    downloadMode: pick(value.downloadMode, ['auto', 'ask'] as const, DEFAULT_SETTINGS.downloadMode),
    preserveExif: pickBoolean(value.preserveExif, DEFAULT_SETTINGS.preserveExif),
    background: pick(value.background, ['white', 'black'] as const, DEFAULT_SETTINGS.background),
  };
}

type StorageArea = Pick<typeof chrome.storage.sync, 'get' | 'set'>;

function getStorageArea(): StorageArea | null {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      return null;
    }
    return chrome.storage.sync ?? null;
  } catch {
    return null;
  }
}

function getLocalArea(): StorageArea | null {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      return null;
    }
    return chrome.storage.local ?? null;
  } catch {
    return null;
  }
}

async function readFrom(area: StorageArea | null): Promise<Settings | null> {
  if (!area) {
    return null;
  }
  try {
    const stored = await area.get(STORAGE_KEY);
    if (!isRecord(stored) || !(STORAGE_KEY in stored)) {
      return null;
    }
    return sanitizeSettings(stored[STORAGE_KEY]);
  } catch {
    return null;
  }
}

/**
 * Load settings from chrome.storage.sync, falling back to
 * chrome.storage.local and then to DEFAULT_SETTINGS. Never throws.
 */
export async function getSettings(): Promise<Settings> {
  try {
    const fromSync = await readFrom(getStorageArea());
    if (fromSync) {
      return fromSync;
    }
    const fromLocal = await readFrom(getLocalArea());
    if (fromLocal) {
      return fromLocal;
    }
  } catch {
    // Fall through to defaults.
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Merge a patch into the stored settings. Writes to chrome.storage.sync;
 * on a quota (or any other) error, falls back to chrome.storage.local.
 * Never throws and never stores images — only the Settings object.
 */
export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  try {
    const current = await getSettings();
    const next: Settings = sanitizeSettings({ ...current, ...patch });
    const payload = { [STORAGE_KEY]: next };
    try {
      const sync = getStorageArea();
      if (sync) {
        await sync.set(payload);
        return;
      }
    } catch {
      // Quota or sync unavailable — fall through to local storage.
    }
    try {
      const local = getLocalArea();
      if (local) {
        await local.set(payload);
      }
    } catch {
      // Storage unavailable (e.g. non-extension context) — settings are dropped.
    }
  } catch {
    // Never throw from the settings store.
  }
}

/** Convenience accessor for the stored UI locale. Never throws. */
export async function getLocale(): Promise<Locale> {
  try {
    const settings = await getSettings();
    return isLocale(settings.language) ? settings.language : DEFAULT_SETTINGS.language;
  } catch {
    return DEFAULT_SETTINGS.language;
  }
}
