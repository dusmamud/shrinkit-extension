import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// ShrinkIt Chrome Extension — Manifest V3, WXT + React.
// Single purpose: resize / compress / convert images the user selects,
// 100% locally on-device. No uploads, no accounts, no analytics.
// Permissions are minimal + justified in README.md:
// - storage: theme/language/settings (sync) — never images.
// - downloads: save resized output to the user's Downloads folder.
// - contextMenus: "Resize with ShrinkIt" on right-clicked images.
// - tabs: open the Full Editor in a new tab from popup / context menu.
// - host_permissions <all_urls>: ONLY so the offscreen document can fetch
//   the bytes of an image the user right-clicked (CORS-blocked pages,
//   CDN URLs). Bytes are processed locally and never sent anywhere.
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'ShrinkIt — Image Resizer',
    description:
      'Shrink, compress and convert images entirely in your browser. No sign-up, no uploads, no watermarks. 100% private.',
    version: '1.0.0',
    // NOTE: No default_locale here on purpose. ShrinkIt uses its own JSON
    // i18n (src/i18n/messages/en|es|pt.json), NOT chrome.i18n. Chrome
    // rejects a manifest with default_locale but no _locales/ subtree
    // ("Default locale was specified, but _locales subtree is missing").
    permissions: ['storage', 'downloads', 'contextMenus', 'tabs', 'offscreen'],
    host_permissions: ['<all_urls>'],
    action: { default_title: 'ShrinkIt — Image Resizer' },
    icons: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
    web_accessible_resources: [{ resources: ['icons/*.png'], matches: ['<all_urls>'] }],
  },
  vite: () => ({ plugins: [tailwindcss()] }),
});
