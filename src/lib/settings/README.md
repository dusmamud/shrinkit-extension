# settings

Persistent extension settings, stored in `chrome.storage`. Only the
`Settings` object is ever stored — never images or image data.

## Files

- `src/lib/settings/index.ts` — `Settings`, `DEFAULT_SETTINGS`,
  `getSettings()`, `saveSettings()`, `getLocale()`, `sanitizeSettings()`

## Shape

```ts
interface Settings {
  theme: 'light' | 'dark' | 'system';
  language: Locale; // 'en' | 'es' | 'pt'
  lastWidth: string;
  lastHeight: string;
  lastUnit: 'percent' | 'pixels' | 'cm' | 'inches';
  lastFormat: 'jpeg' | 'png' | 'gif' | 'webp';
  lastQuality: string;
  lastDpi: string;
  defaultPreset: '50%' | '800px' | '20KB' | 'last-used';
  downloadMode: 'auto' | 'ask';
  preserveExif: boolean;
  background: 'white' | 'black';
}
```

Defaults: theme `system`, language `en`, last width `50` (percent),
format `jpeg`, quality `90`, DPI `72`, default preset `50%`, download
`auto`, EXIF stripped (`preserveExif: false`), background `white`.

## Behaviour

- `getSettings()` — reads `chrome.storage.sync` key `shrinkit-settings`,
  falls back to `chrome.storage.local`, then to `DEFAULT_SETTINGS`.
  Stored values are sanitised: wrong types / out-of-range enum values fall
  back to defaults, unknown keys are ignored. Never throws.
- `saveSettings(patch)` — merges the patch over the current settings and
  writes to `chrome.storage.sync`; on a quota (or any) error it falls back
  to `chrome.storage.local`. Never throws.
- `getLocale()` — convenience accessor returning the stored language.
  Never throws.
- Outside an extension context (no `chrome.storage`), reads return
  defaults and writes are dropped silently.

## Usage

```ts
import { getSettings, saveSettings } from '../lib/settings/index.js';

const settings = await getSettings();
await saveSettings({ theme: 'dark', defaultPreset: '800px' });
```

## Components

- `src/components/LanguageSwitcher.tsx` — `<LanguageSwitcher locale
onChange />`, labels from `ext.language*` via `t()`.
- `src/components/ThemeSwitcher.tsx` — `<ThemeSwitcher theme onChange
locale? />` (`locale` defaults to `'en'`), labels from `ext.theme*` via
  `t()`. Both are plain Tailwind-styled `<select>` controls.
