# Options / Settings page

Full-page extension Options page (`chrome://extensions` → ShrinkIt → Options),
plus the reusable `SettingsForm` used by this page (and embeddable by the
popup / editor later).

## Files

- `entrypoints/options/index.html` — WXT options entry, mounts `main.tsx`.
- `entrypoints/options/main.tsx` — React root, imports global CSS + page CSS.
- `entrypoints/options/Options.tsx` — the page: Appearance + SettingsForm + About.
- `entrypoints/options/style.css` — native-control accents (radio / checkbox /
  range) and focus-visible outlines only; layout lives in Tailwind classes.
- `entrypoints/options/README.md` — this file.
- `src/components/SettingsForm.tsx` — reusable Defaults + Behaviour form.

## Behaviour

- Loads settings on mount via `getSettings()`; falls back to
  `DEFAULT_SETTINGS` if loading fails.
- Every change calls `saveSettings()` immediately and shows a localized
  "saved" confirmation (`options.saved`) for 2 seconds. A failed save shows
  `options.saveFailed`.
- Appearance is rendered by `ThemeSwitcher` + `LanguageSwitcher`, which own
  their own persistence and are rendered without props. The page reads the
  active locale from `settings.locale` (or `settings.language`) for its own
  strings; after a language change via the switcher, the new locale applies
  on next load.
- About section: ShrinkIt name, version `1.0.0`, a "100% local — no uploads"
  note, a link to the web app (`https://shrinkit.dusrel.com`), and a privacy
  note. All copy goes through `t()`.

## Contracts assumed (other workers own these modules)

```ts
// src/lib/settings/index
import {
  getSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  type Settings,
} from '../../src/lib/settings/index';
// getSettings(): Promise<Settings>
// saveSettings(settings: Settings): Promise<void>
```

```ts
// src/lib/i18n/index
import { t, type Locale } from '../../src/lib/i18n/index';
// t(key: string, locale: Locale): string
```

```tsx
// src/components/LanguageSwitcher, src/components/ThemeSwitcher
// Rendered with no props; each owns its own persistence.
```

## Settings fields this page uses

The settings worker's `Settings` type must provide these fields (names and
value domains are fixed by this page + `SettingsForm`):

| Field                    | Type     | Values                                                                              |
| ------------------------ | -------- | ----------------------------------------------------------------------------------- |
| `locale` (or `language`) | `Locale` | `en` \| `es` \| `pt`                                                                |
| `theme`                  | string   | `light` \| `dark` \| `system` (owned by ThemeSwitcher)                              |
| `defaultPreset`          | string   | `main` \| `compress-50kb` \| `compress-20kb` \| `passport` \| `social` \| `compare` |
| `defaultFormat`          | string   | `original` \| `jpeg` \| `png` \| `webp`                                             |
| `defaultQuality`         | number   | 1–100                                                                               |
| `defaultDpi`             | number   | 72 \| 150 \| 300                                                                    |
| `downloadMode`           | string   | `auto` \| `ask`                                                                     |
| `preserveExif`           | boolean  | —                                                                                   |
| `background`             | string   | `white` \| `black`                                                                  |

## i18n keys required (en / es / pt)

`options.title`, `options.subtitle`, `options.loading`, `options.saved`,
`options.saveFailed`, `options.appearance`, `options.appearance.theme`,
`options.appearance.language`, `options.defaults`, `options.defaults.preset`,
`options.defaults.preset.main`, `options.defaults.preset.compress-50kb`,
`options.defaults.preset.compress-20kb`, `options.defaults.preset.passport`,
`options.defaults.preset.social`, `options.defaults.preset.compare`,
`options.defaults.format`, `options.defaults.format.original`,
`options.defaults.format.jpeg`, `options.defaults.format.png`,
`options.defaults.format.webp`, `options.defaults.quality`, `options.defaults.dpi`,
`options.behaviour`, `options.behaviour.downloadMode`,
`options.behaviour.downloadMode.auto`, `options.behaviour.downloadMode.ask`,
`options.behaviour.preserveExif`, `options.behaviour.background`,
`options.behaviour.background.white`, `options.behaviour.background.black`,
`options.about`, `options.about.version`, `options.about.local`,
`options.about.webApp`, `options.about.privacy`.

## Embedding SettingsForm elsewhere

```tsx
<SettingsForm
  settings={settings}
  onChange={(patch) => {
    /* merge + persist */
  }}
  locale={locale}
/>
```

It holds no persistence logic and no local state — fully controlled via props,
so the popup / editor can embed it with their own load/save wiring.
