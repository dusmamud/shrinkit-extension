# i18n

Localisation for the ShrinkIt extension. Flat `key → string` catalogs, one
per locale. No hardcoded English in TS/TSX outside these JSON files — UI
strings must come through `t()`.

## Files

- `src/i18n/messages/en.json` — English (source of truth for keys)
- `src/i18n/messages/es.json` — Spanish
- `src/i18n/messages/pt.json` — Portuguese
- `src/lib/i18n/index.ts` — `Locale`, `LOCALES`, `t()`, `getMessages()`,
  `useLocale()`

## Key counts

All three catalogs carry the same 158 keys: 126 ported faithfully from the
ShrinkIt web app (`~/workspace/shrinkit/messages/*.json`, same keys and
translated values) + 32 extension keys (`ext.*`).

Extension keys (translated ES/PT, not English copies):

- `ext.popup_title`, `ext.full_editor`, `ext.open_full_editor`,
  `ext.quick_resize`, `ext.presets`, `ext.preset_50`, `ext.preset_800px`,
  `ext.preset_20kb`, `ext.preset_last_used`
- `ext.right_click_title` (“Resize with ShrinkIt”), `ext.right_click_failed`,
  `ext.right_click_cors`
- `ext.settings_title`, `ext.theme`, `ext.theme_light`, `ext.theme_dark`,
  `ext.theme_system`, `ext.language`, `ext.language_en`,
  `ext.language_es`, `ext.language_pt`, `ext.download_mode`,
  `ext.download_auto`, `ext.download_ask`, `ext.default_preset`,
  `ext.open_settings`
- `ext.no_image`, `ext.processing`, `ext.download`, `ext.download_all`,
  `ext.new_image`, `ext.clear`

`ext.language_en/es/pt` are the localised names of the three languages
themselves, so `LanguageSwitcher` needs no hardcoded labels. (PT
`ext.download_mode` is “Download”, the standard Portuguese term — not an
untranslated copy.)

## Usage

```ts
import { t, useLocale } from '../lib/i18n/index.js';

t('es', 'dropzone.title');
t('en', 'errors.too_many', { max: 50 });
t('pt', 'footer.rights', { year: 2026 });

const { locale, setLocale } = useLocale(); // backed by the settings store
```

## Rules

- `t()` returns the key itself for a missing key — it never throws.
- `{param}` placeholders are interpolated from the `params` argument;
  unknown placeholders are left as-is.
- Adding a key: add it to **all three** JSON files (keep them sorted and
  key-identical) and re-check the counts match.
- `useLocale()` reads/writes the stored locale through
  `src/lib/settings/index.ts` (`getLocale` / `saveSettings`). The settings
  module must never import this module at runtime (type-only `Locale`
  import is fine) — no import cycle.
