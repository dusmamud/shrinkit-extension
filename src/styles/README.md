# Styles

## Tokens

`global.css` defines the shared design tokens, matching the ShrinkIt web app:

- `--accent: #007bff` — primary blue
- `--accent-hover: #016df0` — primary blue on hover
- `[data-theme='dark']` sets `color-scheme: dark`

Existing tokens were kept as-is; only additions were appended.

## Fonts

The font stack is `'Poppins', system-ui, sans-serif`. There is **no** remote
`@import` or Google Fonts `<link>`: Manifest V3 extension CSP blocks remote
fonts at runtime, so Poppins is used only when already available on the
system, and `system-ui` is the fallback. Do not add a remote font fetch.

## Shared classes

Plain CSS classes (no `@apply`, safe under Tailwind v4) in `global.css`:

- `.btn-primary` — solid accent button, with hover and disabled states.
- `.card` — bordered rounded container; dark-theme variant included.
- `.input` — full-width text input; dark-theme variant included.
