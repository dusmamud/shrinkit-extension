# Responsive + Accessibility — ShrinkIt Extension

Scope: the responsive rules appended to `src/styles/global.css` (Worker 8
section at the end of that file) and the accessibility requirements for the
extension UI. Tokens are untouched: every colour in the appended CSS
references a `--t-*` web token (or a system colour in forced-colors mode).

What this doc does **not** claim: real-browser overflow was **not** verified
here. Only a real Chrome run on a laptop proves nothing overflows. The
tables below state the _code_ behaviour at each width.

## Breakpoint behaviour

Web breakpoints mirrored: 1440 / 1075 / 960 / 768 / 600 / 480 / 400 / 390 /
360 / 320. Container caps (web parity): header 1075px, main 960px,
dropzone 940px, settings 650px, popup fixed 400px wide.

| Viewport | Header                                                                                | Hero                                             | Dropzone                                                                      | Settings                                                    | Tabs                                           | Popup                                                         |
| -------- | ------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------- |
| ≥ 1440px | Inner stays capped at 1075px, centred; no full-width stretch                          | 50px heading (Tailwind `md:`)                    | Capped 940px, centred                                                         | Capped 650px, centred                                       | Full row, 14px, separators 16px                | Fixed 400px (Chrome popup geometry, unaffected by page width) |
| 1075px   | Header leaves its cap; padding 14px 16px, gap 12px                                    | 50px                                             | 940px                                                                         | 650px                                                       | Full row                                       | Fixed 400px                                                   |
| 1024px   | Desktop nav appears at `lg:` (tightest single-row width); padding 14px 16px, gap 12px | 50px                                             | 940px                                                                         | 650px                                                       | Full row                                       | Fixed 400px                                                   |
| 960px    | Hamburger (desktop nav hidden below `lg:`); padding 14px 16px                         | 50px (≥ 768px)                                   | 940px                                                                         | 650px                                                       | Full row                                       | Fixed 400px                                                   |
| 768px    | Hamburger; desktop nav hidden below `lg:`                                             | 50px                                             | 940px (inner padding steps down via Tailwind `sm:`/`md:`)                     | Format/quality gap 24px                                     | Tabs wrap if needed; tab font per editor rules | Fixed 400px                                                   |
| 600px    | Header padding 12px 16px; tabs wrap to a second line (editor rules)                   | 40px (Tailwind `sm:`)                            | Padding `px-4 sm:px-8 py-6 sm:py-8`                                           | Title 1.75rem; format/quality gap 18px (web 600px value)    | Wrap; 12px at ≤ 480px                          | Fixed 400px                                                   |
| 480px    | Brand name 1.15rem; tabs 12px, separators 6px                                         | 28px (global rule, below the 32px Tailwind base) | Stacks; width/height row stacks below 480px (Tailwind `min-[480px]:flex-row`) | Title 1.5rem; submit full-width, max 320px (web 480px rule) | Wrap; 44px touch targets                       | Fixed 400px                                                   |
| 400px    | Brand name 1.05rem                                                                    | 28px                                             | Stacks                                                                        | Stacks; title 1.5rem                                        | Wrap; 44px targets                             | Fixed 400px — the popup itself does not shrink                |
| 390px    | Brand name 1.05rem                                                                    | 28px                                             | Stacks                                                                        | Stacks                                                      | Wrap; 44px targets                             | Fixed 400px                                                   |
| 360px    | Header padding 10px 12px, gap 8px; brand 1rem; tabs 11.5px, separators 4px            | 26px                                             | Stacks                                                                        | Title 1.375rem                                              | Wrap; 44px targets                             | Fixed 400px                                                   |
| 320px    | Header at its tightest; nothing overflows (all widths relative)                       | 24px floor                                       | Stacks; dropzone padding `px-4 py-6`                                          | Title 1.375rem; submit capped 320px                         | Wrap; 44px targets; labels may wrap            | Fixed 400px — Chrome popups do not shrink to 320px by design  |

Notes:

- **Hero scale** keys off the hero `h1`'s size class (`text-[32px]` in
  `src/components/home/Hero.tsx`): 50px ≥ 768px, 40px ≥ 640px, 32px below
  640px (Tailwind), then 28px ≤ 480px, 26px ≤ 360px, 24px ≤ 320px (global
  rules). Long page headings (`text-[2.5rem]` on About / Contact / Privacy /
  Terms) step 40px → 32px ≤ 960px → 28px ≤ 480px → 26px ≤ 360px.
  Tools-hub / tool-page headings (`text-3xl`) step 30px → 26px ≤ 480px.
- **Result grid** (`ResultPanel` multi-card grid) collapses 4 → 3 → 2
  columns via Tailwind, then to **1 column ≤ 400px** via a structural
  global rule (`main div:has(> [data-testid^="result-card-"])`), so cards
  never squeeze below readable width. Tool stat grids (TargetSize,
  Compare) stay 2-column — they are numeric readouts, not cards.
- **Settings stack**: the width/height + lock + unit row is one row ≥ 480px
  and stacks below it; mode radios and the format/quality row wrap
  (`flex-wrap`) at every width; the settings title and submit button follow
  the web 480px rules.
- **Popup**: fixed 400px × max 560px, vertical scroll only
  (`entrypoints/popup/style.css`). It does not respond to page-viewport
  widths; test it as a real Chrome popup, not in DevTools device emulation
  of the editor page.

## How to test

1. `npm run build`, then load the unpacked extension in Chrome
   (`chrome://extensions` → Developer mode → Load unpacked → `.output/`).
2. Open the editor page. Open Chrome DevTools → Device toolbar (or resize
   the window) and step through **every** width in the table:
   1440, 1075, 1024, 960, 768, 600, 480, 400, 390, 360, 320.
3. At each width, check: **no horizontal scrollbar**, no clipped button or
   tab, no text running under another element, dropzone + settings fully
   usable, header brand + hamburger (below 1024px) reachable, mobile menu
   opens/closes.
4. Popup: click the extension icon in the toolbar (real 400px popup).
   Confirm no horizontal scroll and all controls reachable.
5. Keyboard: Tab through the whole editor page (see Accessibility below).
   Confirm every focused control shows the 2px accent outline.
6. `npm run check:responsive` — source-level parity guard (containers,
   tokens, breakpoints, logo pinning). It does **not** prove real-browser
   overflow; see the note at the top.

## Accessibility requirements

Every interactive element must have an accessible name: visible text, or
`aria-label` where the control is icon-only. These are requirements for the
whole extension UI, not only the CSS in this change:

- **Focus visible**: `:focus-visible` shows a 2px solid `--t-accent`
  outline with 2px offset (global rule). Never add `:focus { outline: none; }`
  without a `:focus-visible` replacement. In forced-colors mode the outline
  uses `CanvasText`.
- **Touch / click targets**: nav buttons and links are 44px minimum
  (static `min-height` + `padding-block`, never a `:hover`/`:active` size
  change, so no layout shift). WCAG 2.2 AA minimum for other targets is
  24 × 24px — see finding F7 for the footer.
- **Skip link (REQUIRED, not yet implemented)**: the editor shell must
  provide a skip-to-content link as the first focusable element
  (`<a href="#main">`), visually hidden until focused, targeting the
  `<main>` element. See finding F3.
- **Colour contrast**: use web `--t-*` tokens only; do not invent colours.
  Measured pairs (WCAG ratios): `--t-muted` #667085 on white **4.97:1**,
  `--t-muted` dark #98989f on #121214 **6.53:1**, white on `--t-accent`
  #016df0 **4.72:1**, white on #0257bf (hover) **6.73:1**, slate-500
  #64748b on white **4.76:1**, `--t-ink-2` #1d2939 on white **14.7:1**,
  dark `--t-ink` #e5e5ea on #121214 **14.9:1**. All pass AA for normal
  text. Do not rely on colour alone: selected tabs also get an underline,
  selected radios get `aria-checked`, errors get `role="alert"` + icon.
- **Keyboard**: every `role="button"` dropzone must fire on Enter **and**
  Space, and Space must `preventDefault()` (otherwise the page scrolls).
  The mobile menu must close on Escape (implemented) and return focus to
  the hamburger (see F8). Custom combobox/listbox must support
  ArrowUp/ArrowDown/Home/End/Enter/Escape (implemented in SettingsPanel).
- **Reduced motion**: `prefers-reduced-motion: reduce` disables entry
  animations and transitions (existing rules — keep them).
- **Images**: decorative images use `alt=""`; informative images (result
  previews, illustrations) use the file name / heading as `alt`. Pinned
  logos keep their 32/34/30px boxes via width/height attributes + inline
  styles, which outrank the generic `svg`/`img` rules in global.css.
- **Headings**: each route renders exactly one `h1` (Home hero, About,
  Contact, Privacy, Terms, Tools hub, tool pages). Do not add a second
  `h1` in the shell.

## Accessibility findings (code read, NOT fixed — other workers' files)

Worker 8 was scoped to `src/styles/global.css` + this doc, so the findings
below are reported, not patched. File references are to the code as read
during this task.

**Integration update (coordinator):** F1, F2, F3, F5, F6, F7, F8, F9,
F10, F12 are now FIXED (see each finding). F4 is MOOT — the tab UI it
describes was removed by the multi-page rebuild (nav is plain hash links,
no tab roles anywhere). F11 remains OPEN: the SettingsPanel combobox still
lacks `aria-activedescendant`; verify in a screen reader that the
highlighted option is announced.

- **F1 — Tool dropzones lack an explicit accessible name.** FIXED in integration: all five tool dropzones now carry `aria-label` (their visible drop-title key). The five
  `role="button"` dropzones in `src/tools/target-size/TargetSizeTool.tsx`
  (~line 251), `src/tools/passport/PassportTool.tsx` (~187),
  `src/tools/social/SocialTool.tsx` (~229), and
  `src/tools/compare/CompareTool.tsx` (~290, ~342) have **no `aria-label`**
  (unlike the main `Dropzone.tsx` and the popup dropzone, which both set
  one). Their visible drop-title/hint text does give them a name from
  contents, so this is a robustness gap, not a nameless control — add
  `aria-label` to match the main dropzone. Their hidden
  `<input type="file">` elements are likewise unlabeled.
- **F2 — Space key scrolls the page on dropzones.** FIXED in integration: main `Dropzone.tsx` + all five tool dropzones now `preventDefault()` on Space. `Dropzone.tsx`
  (~line 108) and all five tool dropzones handle Space without
  `preventDefault()`, so pressing Space both opens the file picker **and**
  scrolls the page. The popup dropzone (`entrypoints/popup/Popup.tsx`
  ~line 728) already calls `preventDefault()` — copy that pattern.
- **F3 — No skip-to-content link.** FIXED in integration: `Editor.tsx` renders a skip link (`nav.skip_to_content`) targeting `<main id="main-content">` as the first focusable element. No `skip` link exists anywhere in
  `src/` or `entrypoints/`. The editor shell (Worker 1's `Editor.tsx`) must
  add one as the first focusable element, targeting `<main>`. WCAG 2.4.1.
- **F4 — Editor tabs use an incomplete tab pattern.** MOOT in integration: the tab UI was removed by the multi-page rebuild — nav is plain hash links, no tab roles anywhere. `Editor.tsx`
  (~lines 233–260) renders `role="tab"` buttons with `aria-selected` but
  no `role="tablist"` parent, no `aria-controls`, and no
  `role="tabpanel"` panels, and no arrow-key navigation. Either complete
  the pattern (tablist + controls + tabpanel + arrow keys) or drop the tab
  roles and keep plain buttons (Tab-key reachable, which already works).
- **F5 — Header nav labels are hardcoded English.** FIXED in integration: `nav.primary` / `nav.mobile` i18n keys (EN/ES/PT). `Header.tsx` uses
  `aria-label="Primary"` / `aria-label="Mobile"` — screen-reader users in
  ES/PT hear English labels. Use localised keys.
- **F6 — Tool pages ignore the dark theme.** FIXED in integration: all four tool components ported from `slate-*` / `bg-white` / `[#007bff]` to `--t-*` tokens. The four tool pages hardcode
  light colours (`bg-white`, `text-slate-900`, `border-slate-200`,
  `text-slate-500`, `hover:border-[#007bff]`) instead of `--t-*` tokens,
  so dark mode does not apply to them. Contrast still passes (slate-500 on
  white is 4.76:1), but the pages render white in dark mode. Port them to
  `--t-*` tokens.
- **F7 — Footer links are below the 24px target minimum.** FIXED in integration: footer links now `inline-block py-0.5` (20px line + 4px padding = 24px). `Footer.tsx`
  links are 14px text with no padding (~20px tall), below the WCAG 2.2 AA
  2.5.8 minimum of 24 × 24px. The 44px nav rule deliberately does not
  cover the footer (reading-size links); add ~2px `padding-block` to
  reach 24px.
- **F8 — Mobile menu does not return focus.** FIXED in integration: Escape close returns focus to the hamburger button via ref. `Header.tsx` closes the
  mobile menu on Escape / hash change but never moves focus back to the
  hamburger, so keyboard users lose their place. Return focus on close.
- **F9 — Options nav has no accessible name.** FIXED in integration: `aria-label={t(locale, 'options.title')}` on the Options `<nav>`.
  `entrypoints/options/Options.tsx` (~line 155) renders `<nav>` with no
  `aria-label`. Give it one (one nav per page, but a name keeps AT output
  unambiguous).
- **F10 — Disabled dropzone stays in the tab order.** FIXED in integration: `tabIndex={disabled ? -1 : 0}` in `Dropzone.tsx`. `Dropzone.tsx`
  sets `tabIndex={0}` unconditionally with `aria-disabled`; when disabled,
  keyboard users can still focus a control that does nothing. Use
  `tabIndex={disabled ? -1 : 0}`.
- **F11 — Combobox lacks `aria-activedescendant`.** The SettingsPanel
  format combobox has `aria-haspopup` / `aria-expanded` / `aria-controls`
  and full arrow-key handling, but no `aria-activedescendant` — verify in
  a screen reader that the highlighted option is announced.
- **F12 — Result previews use empty `alt`.** FIXED in integration: result images now use the source file name as `alt` (ResultPanel pattern). `TargetSizeTool.tsx`
  (~line 293), `PassportTool.tsx` (~line 233), `SocialTool.tsx` (~line 275)
  render result images with `alt=""`. `ResultPanel.tsx` uses the file name
  as `alt` — copy that pattern so the result is perceivable.
- **Passes noted during the read**: popup + options focus-visible rules
  (2px accent) already existed; Options `outline: none` inputs are covered
  by Options' own `:focus-visible` rule; editor/tools `outline-none`
  controls are now covered by the new global `:focus-visible` rule added
  in this change; all icon-only dismiss/remove buttons already carry
  `aria-label`; decorative SVGs are `aria-hidden`; selected tab has an
  underline as well as colour; errors use `role="alert"`.
