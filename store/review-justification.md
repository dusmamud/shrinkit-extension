# Chrome Web Store review — permission justification (ShrinkIt v1.0.0)

## Why ShrinkIt requests `<all_urls>` host permission

ShrinkIt is a 100% client-side image resizer. No image bytes ever leave the
user's device — there is no server, no upload, no analytics.

The extension adds a "ShrinkIt — Resize Image" entry to the right-click
context menu on images. When a user right-clicks an image on an arbitrary
website (news sites, CDNs, social feeds), the browser's same-origin policy
blocks the extension's editor page from reading that image's bytes directly.

The `<all_urls>` host permission is used for ONE purpose only: letting the
extension's offscreen document fetch the raw bytes of the specific image the
user right-clicked, so it can be resized locally on the device.

- No browsing history or behavior is collected.
- No network request is made except fetching the single user-chosen image.
- Fetched bytes are processed entirely on-device (Canvas / Web Workers) and
  never transmitted anywhere.

## Permission breakdown

| Permission | Why it is needed |
|---|---|
| `storage` | Save user preferences (default size, format, quality, theme, language). |
| `downloads` | Save resized images to the user's Downloads folder. |
| `contextMenus` | "ShrinkIt — Resize Image" right-click entry on images. |
| `tabs` | Open the editor tab, or focus it if already open. |
| `offscreen` | Fetch right-clicked image bytes in an offscreen document (the documented CORS workaround). |
| `host_permissions: <all_urls>` | Fetch the bytes of the user-right-clicked image from any site/CDN (see above). |

## Privacy policy

https://shrinkit.dusrel.com/privacy — states that everything runs locally and
nothing is uploaded.
