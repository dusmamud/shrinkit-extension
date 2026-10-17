# Layout components (Header + Footer)

React ports of the web app's `Header.astro` / `Footer.astro`, adapted to the
extension's hash routing (`editor.html#/...`). Same structure, spacing,
typography, and `--t-*` tokens as the web app — no new visual language.

## Header (`Header.tsx`)

Props: `{ locale, theme, onLocaleChange, onThemeChange }`.

- Bar: `border-b border-tdivider/50 bg-tpage`, inner
  `mx-auto max-w-[1075px] px-4 py-4`.
- Brand: 34px icon (pinned via `width`/`height` attributes + inline
  `style`, `icons/icon-48.png` downscaled through `chrome.runtime.getURL`
  with a relative-path fallback — same pattern as `Logo.tsx`) +
  `text-[1.35rem] font-medium tracking-tight` wordmark from `site.name`.
- Desktop nav (`hidden md:flex`): Resize (`#/`), Tools (`#/tools`),
  How it works (`#/#how-it-works` — anchor on Home), Privacy (`#/privacy`),
  Contact (`#/contact`), with 1px `bg-tdivider` dividers between links
  (`mx-2.5 xl:mx-4 h-4 w-px`), then the CTA `Resize Image` → `#/`
  (`h-[38px] xl:h-[42px] px-4 xl:px-6 text-xs xl:text-[14px] font-bold
bg-tbtnb hover:bg-[#0257bf]`), then the reused `ThemeSwitcher` +
  `LanguageSwitcher`.
- Mobile (`md:hidden`): hamburger button, 44px min touch target
  (`h-11 w-11 min-h-[44px] min-w-[44px]`), toggles between hamburger and
  close (X) icons, `aria-expanded` + `aria-controls="mobile-menu"`.
- Mobile panel: stacked nav below the bar (`border-t border-tdivider`),
  each link `min-h-[44px]`, CTA at `h-[48px]`, then Language + Theme
  switchers with labels. The panel closes when any link is clicked, on
  `hashchange` (covers back/forward), and on `Escape`.
- All navigation is plain hash `href`s — no `onClick` routing.

## Footer (`Footer.tsx`)

Props: `{ locale }`. Full variant (not the web `/resize` minimal
copyright-only variant).

- Shell: `bg-tsurface2 pt-[3em]`, inner `mx-auto max-w-[1075px] px-4 pb-10`.
- Brand block (`max-w-xs`): 30px icon (pinned) + `text-lg font-medium`
  wordmark + tagline (`footer.tagline`, `mt-3 text-[0.875rem] font-light
leading-relaxed`).
- 4 columns (`flex-col gap-8 sm:flex-row sm:gap-16`), headings
  `text-[0.875rem] font-medium`, links `text-[0.875rem] font-light
hover:text-taccent`, lists `mt-3 space-y-2.5`:
  - Product: Resize Image (`#/`), How it works (`#/#how-it-works`),
    About (`#/about`).
  - Tools: All Tools (`#/tools`), Compress to 50KB
    (`#/tools/compress-to-50kb`), Compress to 20KB
    (`#/tools/compress-to-20kb`), Passport Photo Maker
    (`#/tools/passport-photo-maker`), Social Media Resizer
    (`#/tools/social-media-resizer`), Compare Images
    (`#/tools/compare-images`).
  - Privacy: Privacy Policy (`#/privacy`), Terms (`#/terms`).
  - Reach out: Contact Us (`#/contact`).
- Copyright bar: `bg-[#016df0]`, `mx-auto max-w-[1075px] px-4 py-3
text-center text-sm font-normal text-white`, `footer.rights` with
  `{year}`.

## i18n keys used (Worker 9 adds these to `en/es/pt.json`)

Header: `site.name`, `nav.resize`, `nav.tools`, `nav.how`, `nav.privacy`,
`nav.contact`, `nav.resize_image`, `nav.menu`, `nav.close_menu`,
`nav.language`, `theme.label`.

Footer: `site.name`, `footer.tagline`, `footer.rights` (`{year}`),
`footer.col_product`, `footer.col_tools`, `footer.col_privacy`,
`footer.col_reachout`, `footer.resize_image`, `footer.how_it_works`,
`footer.about`, `footer.tools_all`, `footer.tools_50kb`,
`footer.tools_20kb`, `footer.tools_passport`, `footer.tools_social`,
`footer.tools_compare`, `footer.privacy_policy`, `footer.terms`,
`footer.contact_us`.

No hardcoded English strings, no TODOs, no mocks, no `console.log`.
`resolveIconUrl` is exported from `Header.tsx` so `Footer.tsx` reuses the
exact same icon resolution instead of duplicating it.
