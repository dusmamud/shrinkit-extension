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

const selectClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';

const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-200';

const radioRowClass = 'flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200';

/**
 * Reusable settings form: Defaults + Behaviour sections.
 * Standalone — holds no persistence logic. The host (Options page, popup,
 * editor) owns loading/saving and passes `settings` + `onChange`.
 * Every user-visible string goes through `t()`; no hardcoded copy.
 */
export default function SettingsForm({ settings, onChange, locale }: SettingsFormProps) {
  return (
    <div className="space-y-8">
      <section aria-labelledby="settings-defaults-heading">
        <h3
          id="settings-defaults-heading"
          className="mb-4 text-base font-semibold text-slate-900 dark:text-white"
        >
          {t(locale, 'options.defaults')}
        </h3>
        <div className="space-y-5">
          <div>
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

          <div>
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

          <div>
            <label htmlFor="settings-default-quality" className={labelClass}>
              {t(locale, 'options.defaults.quality')}
            </label>
            <div className="mt-1 flex items-center gap-3">
              <input
                id="settings-default-quality"
                type="range"
                min={1}
                max={100}
                step={1}
                className="w-full"
                value={Number(settings.lastQuality)}
                onChange={(event) => onChange({ lastQuality: String(event.target.value) })}
              />
              <output
                htmlFor="settings-default-quality"
                className="w-12 shrink-0 text-right text-sm font-medium text-slate-900 tabular-nums dark:text-white"
              >
                {settings.lastQuality}
              </output>
            </div>
          </div>

          <div>
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
          className="mb-4 text-base font-semibold text-slate-900 dark:text-white"
        >
          {t(locale, 'options.behaviour')}
        </h3>
        <div className="space-y-5">
          <fieldset>
            <legend className={labelClass}>{t(locale, 'options.behaviour.downloadMode')}</legend>
            <div className="mt-2 space-y-2">
              <label className={radioRowClass}>
                <input
                  type="radio"
                  name="settings-download-mode"
                  value="auto"
                  checked={settings.downloadMode === 'auto'}
                  onChange={() => onChange({ downloadMode: 'auto' })}
                />
                {t(locale, 'options.behaviour.downloadMode.auto')}
              </label>
              <label className={radioRowClass}>
                <input
                  type="radio"
                  name="settings-download-mode"
                  value="ask"
                  checked={settings.downloadMode === 'ask'}
                  onChange={() => onChange({ downloadMode: 'ask' })}
                />
                {t(locale, 'options.behaviour.downloadMode.ask')}
              </label>
            </div>
          </fieldset>

          <label className={radioRowClass}>
            <input
              type="checkbox"
              checked={settings.preserveExif}
              onChange={(event) => onChange({ preserveExif: event.target.checked })}
            />
            {t(locale, 'options.behaviour.preserveExif')}
          </label>

          <fieldset>
            <legend className={labelClass}>{t(locale, 'options.behaviour.background')}</legend>
            <div className="mt-2 space-y-2">
              <label className={radioRowClass}>
                <input
                  type="radio"
                  name="settings-background"
                  value="white"
                  checked={settings.background === 'white'}
                  onChange={() => onChange({ background: 'white' })}
                />
                <span
                  aria-hidden="true"
                  className="inline-block h-4 w-4 rounded-full border border-slate-300 bg-white"
                />
                {t(locale, 'options.behaviour.background.white')}
              </label>
              <label className={radioRowClass}>
                <input
                  type="radio"
                  name="settings-background"
                  value="black"
                  checked={settings.background === 'black'}
                  onChange={() => onChange({ background: 'black' })}
                />
                <span
                  aria-hidden="true"
                  className="inline-block h-4 w-4 rounded-full border border-slate-300 bg-black"
                />
                {t(locale, 'options.behaviour.background.black')}
              </label>
            </div>
          </fieldset>
        </div>
      </section>
    </div>
  );
}
