# Options / Settings page

Full-page extension Options page (`chrome://extensions` → ShrinkIt → Options).
Layout follows the web app: 960px page, 650px centered settings form,
`--ed-*` tokens carrying the web `--t-*` values.

## Files

- `entrypoints/options/index.html` — WXT options entry, mounts `main.tsx`.
- `entrypoints/options/main.tsx` — React root, imports global CSS + page CSS.
- `entrypoints/options/Options.tsx` — the page: sticky header (Logo 32px +
  ShrinkIt title + subtitle), Appearance → Defaults → Behaviour → About.
  The form is **inlined here** (not `SettingsForm`) so it can carry the
  Defaults size fields (last width / height / unit) and the web input
  styles.
- `entrypoints/options/style.css` — `--ed-*` tokens (web values, light +
  Dark 2), native-control accents (radio / checkbox / range) and
  focus-visible outlines; layout lives in Tailwind classes.
- `entrypoints/options/README.md` — this file.
- `src/components/SettingsForm.tsx` — a separate reusable controlled
  Defaults + Behaviour form (props: `settings`, `onChange`, `locale`).
  It is NOT used by this page; it is kept for future popup/editor
  embedding.

## Behaviour

- Loads settings on mount via `getSettings()`; falls back to
  `DEFAULT_SETTINGS` if loading fails.
- Every change calls `saveSettings()` immediately and shows a localized
  "saved" confirmation (`options.saved`) for 2 seconds. A failed save shows
  `options.saveFailed`.
- Theme: applies `data-theme` to `<html>` (Editor's `resolveTheme` logic),
  following the OS in `system` mode. Language via `LanguageSwitcher`,
  theme via `ThemeSwitcher` (both shared with the Editor header).
- About section: ShrinkIt name, version `1.0.0`, a "100% local — no uploads"
  note, a link to the web app (`https://shrinkit.dusrel.com`), and a privacy
  note. All copy goes through `t()`.

## Settings fields this page uses

From `src/lib/settings/index` (`Settings` type):

| Field           | Type     | Values                                      |
| --------------- | -------- | ------------------------------------------- |
| `theme`         | string   | `light` \| `dark` \| `system`               |
| `language`      | `Locale` | `en` \| `es` \| `pt`                        |
| `lastWidth`     | string   | e.g. `50`, `800`                            |
| `lastHeight`    | string   | e.g. `` (auto), `600`                       |
| `lastUnit`      | string   | `percent` \| `pixels` \| `cm` \| `inches`   |
| `lastFormat`    | string   | `jpeg` \| `png` \| `webp` \| `gif`          |
| `lastQuality`   | string   | `1`–`100`                                   |
| `lastDpi`       | string   | `72` \| `150` \| `300` (free input allowed) |
| `defaultPreset` | string   | `50%` \| `800px` \| `20KB` \| `last-used`   |
| `downloadMode`  | string   | `auto` \| `ask`                             |
| `preserveExif`  | boolean  | —                                           |
| `background`    | string   | `white` \| `black`                          |

## i18n keys required (en / es / pt)

`options.title`, `options.subtitle`, `options.loading`, `options.saved`,
`options.saveFailed`, plus the reused `settings.*`, `theme.*`,
`language.*`, and `ext.*` keys (see `src/i18n/messages/en.json`).
