import type { Locale } from '../../src/lib/i18n/index';
import { t } from '../../src/lib/i18n/index';
import type { Settings } from '../../src/lib/settings/index';

export interface SettingsFormProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  locale: Locale;
}

const PRESET_OPTIONS: Settings['defaultPreset'][] = ['50%', '800px', '20KB', 'last-used'];

const FORMAT_OPTIONS: Settings['lastFormat'][] = ['jpeg', 'png', 'webp', 'gif'];

const DPI_OPTIONS: number[] = [72, 150, 300];

/* Web values as var() fallbacks: the Options page loads no --ed-* sheet,
   so the fallback is the live value there; in the editor the --ed-*
   token (fixed by the token pass to the web value) wins. */
const selectClass =
  'w-full h-[50px] rounded-[6px] border border-[var(--ed-input-line,#cbd5e1)] bg-[var(--ed-input-bg,#ffffff)] px-3.5 text-sm text-[var(--ed-ink-2,#1d2939)] outline-none transition focus:border-[var(--ed-accent,#016df0)]';

const labelClass = 'block text-sm font-medium text-[var(--ed-ink,#000000)]';

const radioRowClass = 'flex min-w-0 items-center gap-2 text-sm text-[var(--ed-ink-2,#1d2939)]';

const controlClass = 'shrink-0 accent-[var(--ed-accent,#016df0)]';

/**
 * Reusable settings form: Defaults + Behaviour sections.
 * Standalone — holds no persistence logic. The host (Options page, popup,
 * editor) owns loading/saving and passes `settings` + `onChange`.
 * Every user-visible string goes through `t()`; no hardcoded copy.
 */
export default function SettingsForm({ settings, onChange, locale }: SettingsFormProps) {
  return (
    <div className="min-w-0 space-y-8">
      <section aria-labelledby="settings-defaults-heading">
        <h3
          id="settings-defaults-heading"
          className="mb-4 text-base font-semibold text-[var(--ed-ink,#000000)]"
        >
          {t(locale, 'options.defaults')}
        </h3>
        <div className="space-y-5">
          <div className="min-w-0">
            <label htmlFor="settings-default-preset" className={labelClass}>
              {t(locale, 'options.defaults.preset')}
            </label>
            <select
              id="settings-default-preset"
              className={`${selectClass} mt-1`}
              value={settings.defaultPreset}
              onChange={(event) =>
                onChange({ defaultPreset: event.target.value as Settings['defaultPreset'] })
              }
            >
              {PRESET_OPTIONS.map((preset) => (
                <option key={preset} value={preset}>
                  {t(locale, `options.defaults.preset.${preset}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label htmlFor="settings-default-format" className={labelClass}>
              {t(locale, 'options.defaults.format')}
            </label>
            <select
              id="settings-default-format"
              className={`${selectClass} mt-1`}
              value={settings.lastFormat}
              onChange={(event) =>
                onChange({ lastFormat: event.target.value as Settings['lastFormat'] })
              }
            >
              {FORMAT_OPTIONS.map((format) => (
                <option key={format} value={format}>
                  {t(locale, `options.defaults.format.${format}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label htmlFor="settings-default-quality" className={labelClass}>
              {t(locale, 'options.defaults.quality')}
            </label>
            <div className="mt-1 flex min-w-0 items-center gap-3">
              <input
                id="settings-default-quality"
                type="range"
                min={1}
                max={100}
                step={1}
                className={`min-w-0 flex-1 ${controlClass}`}
                value={Number(settings.lastQuality)}
                onChange={(event) => onChange({ lastQuality: String(event.target.value) })}
              />
              <output
                htmlFor="settings-default-quality"
                className="w-12 shrink-0 text-right text-sm font-medium text-[var(--ed-ink-2,#1d2939)] tabular-nums"
              >
                {settings.lastQuality}
              </output>
            </div>
          </div>

          <div className="min-w-0">
            <label htmlFor="settings-default-dpi" className={labelClass}>
              {t(locale, 'options.defaults.dpi')}
            </label>
            <select
              id="settings-default-dpi"
              className={`${selectClass} mt-1`}
              value={Number(settings.lastDpi)}
              onChange={(event) => onChange({ lastDpi: String(event.target.value) })}
            >
              {DPI_OPTIONS.map((dpi) => (
                <option key={dpi} value={dpi}>
                  {dpi}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section aria-labelledby="settings-behaviour-heading">
        <h3
          id="settings-behaviour-heading"
          className="mb-4 text-base font-semibold text-[var(--ed-ink,#000000)]"
        >
          {t(locale, 'options.behaviour')}
        </h3>
        <div className="space-y-5">
          <fieldset className="min-w-0">
            <legend className={labelClass}>{t(locale, 'options.behaviour.downloadMode')}</legend>
            <div className="mt-2 space-y-2">
              <label className={radioRowClass}>
                <input
                  type="radio"
                  name="settings-download-mode"
                  value="auto"
                  className={controlClass}
                  checked={settings.downloadMode === 'auto'}
                  onChange={() => onChange({ downloadMode: 'auto' })}
                />
                <span className="min-w-0 break-words">
                  {t(locale, 'options.behaviour.downloadMode.auto')}
                </span>
              </label>
              <label className={radioRowClass}>
                <input
                  type="radio"
                  name="settings-download-mode"
                  value="ask"
                  className={controlClass}
                  checked={settings.downloadMode === 'ask'}
                  onChange={() => onChange({ downloadMode: 'ask' })}
                />
                <span className="min-w-0 break-words">
                  {t(locale, 'options.behaviour.downloadMode.ask')}
                </span>
              </label>
            </div>
          </fieldset>

          <label className={radioRowClass}>
            <input
              type="checkbox"
              className={controlClass}
              checked={settings.preserveExif}
              onChange={(event) => onChange({ preserveExif: event.target.checked })}
            />
            <span className="min-w-0 break-words">
              {t(locale, 'options.behaviour.preserveExif')}
            </span>
          </label>

          <fieldset className="min-w-0">
            <legend className={labelClass}>{t(locale, 'options.behaviour.background')}</legend>
            <div className="mt-2 space-y-2">
              <label className={radioRowClass}>
                <input
                  type="radio"
                  name="settings-background"
                  value="white"
                  className={controlClass}
                  checked={settings.background === 'white'}
                  onChange={() => onChange({ background: 'white' })}
                />
                <span
                  aria-hidden="true"
                  className="inline-block h-4 w-4 shrink-0 rounded-full border border-[var(--ed-input-line,#cbd5e1)] bg-white"
                />
                <span className="min-w-0 break-words">
                  {t(locale, 'options.behaviour.background.white')}
                </span>
              </label>
              <label className={radioRowClass}>
                <input
                  type="radio"
                  name="settings-background"
                  value="black"
                  className={controlClass}
                  checked={settings.background === 'black'}
                  onChange={() => onChange({ background: 'black' })}
                />
                <span
                  aria-hidden="true"
                  className="inline-block h-4 w-4 shrink-0 rounded-full border border-[var(--ed-input-line,#cbd5e1)] bg-black"
                />
                <span className="min-w-0 break-words">
                  {t(locale, 'options.behaviour.background.black')}
                </span>
              </label>
            </div>
          </fieldset>
        </div>
      </section>
    </div>
  );
}
