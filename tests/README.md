# Unit tests

Vitest unit tests for the pure, DOM-free parts of the extension. Every test
imports the **real** implementation — nothing about the code under test is
mocked. The only stub in the suite is the `chrome.storage` harness in
`settings.test.ts` (an in-memory `chrome.storage.sync` / `chrome.storage.local`
pair installed before the settings module is imported), because there is no
real extension API in the Node test environment.

Run:

```sh
npm test        # vitest run (node environment)
npm run typecheck
```

## Files

| File                | Covers                                                                                                                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `filenames.test.ts` | `src/lib/image/filenames.ts` — base names, output names, supported inputs, `formatBytes`, `percentSaved`, format maps                                                                    |
| `limits.test.ts`    | `src/lib/image/limits.ts` — input/output dimension guards, batch + quality/DPI/unit limits                                                                                               |
| `units.test.ts`     | `src/lib/image/units.ts` — percent/pixels/cm/inch conversion, unit defaults, proportional math, crop/fit geometry                                                                        |
| `dpi.test.ts`       | `src/lib/image/dpi.ts` — CRC-32, data-URL helpers, PNG `pHYs` injection, JPEG EXIF DPI injection + EXIF preserve                                                                         |
| `settings.test.ts`  | `src/lib/settings/index.ts` — defaults, `getSettings`/`saveSettings` round-trip through stubbed `chrome.storage`, sync→local fallback, `sanitizeSettings`, `getLocale`                   |
| `i18n.test.ts`      | `src/lib/i18n/index.ts` + `src/i18n/messages/*.json` — identical key sets en==es==pt, matching `{placeholder}` names, param interpolation, missing-key fallback, unknown-locale fallback |

## Deliberately not covered here

- **DOM / canvas / pica / engine** (`src/lib/image/engine.ts`, `process.ts`,
  `processor.worker.ts`): need a browser canvas and `OffscreenCanvas`; not
  testable in the Node environment.
- **`useLocale` React hook** (`src/lib/i18n/index.ts`): needs a React test
  renderer; the pure `t()` / `getMessages()` / `isLocale()` surface is covered
  instead.
