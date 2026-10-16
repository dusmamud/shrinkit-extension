# Icons

## Source — do not redraw

All icons derive from the ShrinkIt web app logo, copied verbatim from
`~/workspace/shrinkit` (`public/icons/icon-512.png` → `icon-512.png` here,
plus the pre-existing `icon-192.png` / `icon-192-maskable.png` /
`icon-512-maskable.png` / `logo.svg`). Never invent a new logo.

## Generated sizes

`icon-16.png`, `icon-32.png`, `icon-48.png`, and `icon-128.png` were
generated from `icon-512.png` with Python PIL (`Image.LANCZOS` resample,
RGBA PNG, `optimize=True`) — real resizes, verified with `file` + a PIL
size check. No size is a copy of the 512 file renamed.

| File           | Dimensions | Used for                                  |
| -------------- | ---------- | ----------------------------------------- |
| `icon-16.png`  | 16 × 16    | Toolbar / favicon-size contexts           |
| `icon-32.png`  | 32 × 32    | Retina toolbar                            |
| `icon-48.png`  | 48 × 48    | Extension management page, `Logo` default |
| `icon-128.png` | 128 × 128  | Chrome Web Store / install surfaces       |

## Regenerating

```sh
python3 -c "
from PIL import Image
im = Image.open('public/icons/icon-512.png').convert('RGBA')
for s in (16, 32, 48, 128):
    im.resize((s, s), Image.LANCZOS).save(f'public/icons/icon-{s}.png', optimize=True)
"
```

Re-verify with `file public/icons/icon-*.png` and a PIL size check after
any regeneration.
