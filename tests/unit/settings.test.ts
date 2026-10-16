import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Settings tests run against the real settings module, with ONLY the
 * browser extension API stubbed: an in-memory `chrome.storage.sync` /
 * `chrome.storage.local` pair. This stub is test harness, not a mock of
 * the code under test — every settings function under test is real.
 * The stub is installed BEFORE importing the module under test.
 */

type Store = Map<string, unknown>;

const syncStore: Store = new Map();
const localStore: Store = new Map();
let syncSetShouldFail = false;

function createStorageArea(store: Store, failSet: () => boolean) {
  return {
    get: async (key: string): Promise<Record<string, unknown>> => {
      const out: Record<string, unknown> = {};
      if (store.has(key)) {
        out[key] = store.get(key);
      }
      return out;
    },
    set: async (items: Record<string, unknown>): Promise<void> => {
      if (failSet()) {
        throw new Error('QUOTA_BYTES quota exceeded');
      }
      for (const [k, v] of Object.entries(items)) {
        store.set(k, v);
      }
    },
  };
}

const fakeChrome = {
  storage: {
    sync: createStorageArea(syncStore, () => syncSetShouldFail),
    local: createStorageArea(localStore, () => false),
  },
};

vi.stubGlobal('chrome', fakeChrome as unknown as typeof chrome);

const { DEFAULT_SETTINGS, getSettings, saveSettings, sanitizeSettings, getLocale } =
  await import('../../src/lib/settings/index');

beforeEach(() => {
  syncStore.clear();
  localStore.clear();
  syncSetShouldFail = false;
});

describe('DEFAULT_SETTINGS', () => {
  it('holds the shipped defaults', () => {
    expect(DEFAULT_SETTINGS).toEqual({
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
    });
  });
});

describe('getSettings / saveSettings round-trip', () => {
  it('returns defaults on empty storage', async () => {
    await expect(getSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('returns a copy: mutating the result must not mutate the defaults', async () => {
    const got = await getSettings();
    got.theme = 'dark';
    expect(DEFAULT_SETTINGS.theme).toBe('system');
  });

  it('persists a patch and merges it over the defaults', async () => {
    await saveSettings({ theme: 'dark', lastQuality: '80' });
    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      theme: 'dark',
      lastQuality: '80',
    });
  });

  it('merges successive patches instead of replacing the whole object', async () => {
    await saveSettings({ theme: 'dark' });
    await saveSettings({ language: 'es' });
    const got = await getSettings();
    expect(got.theme).toBe('dark');
    expect(got.language).toBe('es');
    expect(got.lastQuality).toBe(DEFAULT_SETTINGS.lastQuality);
  });

  it('writes the merged settings to chrome.storage.sync', async () => {
    await saveSettings({ background: 'black' });
    expect(syncStore.get('shrinkit-settings')).toEqual({
      ...DEFAULT_SETTINGS,
      background: 'black',
    });
  });

  it('reads back settings previously written to chrome.storage.local', async () => {
    localStore.set('shrinkit-settings', { ...DEFAULT_SETTINGS, theme: 'light', language: 'pt' });
    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      theme: 'light',
      language: 'pt',
    });
  });

  it('prefers sync storage over local storage', async () => {
    syncStore.set('shrinkit-settings', { ...DEFAULT_SETTINGS, theme: 'dark' });
    localStore.set('shrinkit-settings', { ...DEFAULT_SETTINGS, theme: 'light' });
    expect((await getSettings()).theme).toBe('dark');
  });

  it('falls back to local storage when a sync write fails (quota)', async () => {
    syncSetShouldFail = true;
    await saveSettings({ theme: 'dark' });
    expect(localStore.get('shrinkit-settings')).toEqual({
      ...DEFAULT_SETTINGS,
      theme: 'dark',
    });
    // And the fallback copy is what reads back.
    await expect(getSettings()).resolves.toMatchObject({ theme: 'dark' });
  });

  it('never throws when chrome.storage is unavailable', async () => {
    vi.stubGlobal('chrome', undefined);
    try {
      await expect(getSettings()).resolves.toEqual(DEFAULT_SETTINGS);
      await expect(saveSettings({ theme: 'dark' })).resolves.toBeUndefined();
    } finally {
      vi.stubGlobal('chrome', fakeChrome as unknown as typeof chrome);
    }
  });
});

describe('sanitizeSettings', () => {
  it('returns defaults for non-object input', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings(42)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('dark')).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings([])).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it('drops invalid enum / wrong-type values back to defaults and ignores unknown keys', () => {
    const cleaned = sanitizeSettings({
      theme: 'neon',
      language: 'fr',
      lastUnit: 'furlongs',
      lastFormat: 'tiff',
      defaultPreset: 'everything',
      downloadMode: 'carrier-pigeon',
      background: 'pink',
      preserveExif: 'yes',
      lastWidth: 42,
      unknownKey: 'should be dropped',
    });
    expect(cleaned).toEqual(DEFAULT_SETTINGS);
    expect('unknownKey' in cleaned).toBe(false);
  });

  it('keeps valid values and fills the rest from defaults', () => {
    expect(
      sanitizeSettings({ theme: 'dark', language: 'pt', lastWidth: '800', preserveExif: true }),
    ).toEqual({
      ...DEFAULT_SETTINGS,
      theme: 'dark',
      language: 'pt',
      lastWidth: '800',
      preserveExif: true,
    });
  });
});

describe('getLocale', () => {
  it('defaults to en', async () => {
    await expect(getLocale()).resolves.toBe('en');
  });

  it('follows the stored language', async () => {
    await saveSettings({ language: 'es' });
    await expect(getLocale()).resolves.toBe('es');
  });
});
