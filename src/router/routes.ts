/**
 * Route table for the extension editor's hash router.
 *
 * One built file, `editor.html`, serves every route. The route is the
 * fragment after `#` (`editor.html#/tools`); the query string, when
 * present, always comes BEFORE the hash (`editor.html?src=rightclick&key=…#/`).
 *
 * `/resize` is a real route whose page (`ResizePage`) redirects to Home
 * (`#/`), matching the task spec. Unknown hashes render the 404 page
 * (route `*`). The catch-all `*` is in ROUTES so isValidRoute can name
 * every route the router can produce; it is never a link target —
 * buildHash maps it to `#/404`.
 */

/** Every route the hash router can produce. */
export type Route =
  | '/'
  | '/tools'
  | '/tools/compress-to-50kb'
  | '/tools/compress-to-20kb'
  | '/tools/passport-photo-maker'
  | '/tools/social-media-resizer'
  | '/tools/compare-images'
  | '/about'
  | '/contact'
  | '/privacy'
  | '/terms'
  | '/resize'
  | '*';

/** All routes, in nav order, with the 404 catch-all last. */
export const ROUTES: readonly Route[] = [
  '/',
  '/tools',
  '/tools/compress-to-50kb',
  '/tools/compress-to-20kb',
  '/tools/passport-photo-maker',
  '/tools/social-media-resizer',
  '/tools/compare-images',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/resize',
  '*',
];

/** True when `value` is one of the ROUTES entries (including the `*` catch-all). */
export function isValidRoute(value: unknown): value is Route {
  return typeof value === 'string' && (ROUTES as readonly string[]).includes(value);
}

/**
 * Localised document-title key per route. Each key matches the h1 the
 * page itself renders (Worker 9 adds the keys that are not in the
 * catalogs yet); Home and `/resize` reuse `site.tagline`, the title the
 * single-page editor used before the rebuild.
 */
export const ROUTE_TITLE_KEY: Record<Route, string> = {
  '/': 'site.tagline',
  '/tools': 'tools.hub.title',
  '/tools/compress-to-50kb': 'tools.compress50.title',
  '/tools/compress-to-20kb': 'tools.compress20.title',
  '/tools/passport-photo-maker': 'tools.passportPage.title',
  '/tools/social-media-resizer': 'tools.socialPage.title',
  '/tools/compare-images': 'tools.comparePage.title',
  '/about': 'about.title',
  '/contact': 'contact.title',
  '/privacy': 'privacy.title',
  '/terms': 'terms.title',
  '/resize': 'site.tagline',
  '*': 'notfound.title',
};

/**
 * Legacy `?tool=` tab slugs from the previous single-page editor.
 * The router maps one of these to its hash route ONLY when the URL
 * carries no hash at all, so old links still land on the right page.
 * New code must not generate `?tool=` links.
 */
export const LEGACY_TOOL_TO_ROUTE: Readonly<Record<string, Route>> = {
  main: '/',
  target50: '/tools/compress-to-50kb',
  target20: '/tools/compress-to-20kb',
  passport: '/tools/passport-photo-maker',
  social: '/tools/social-media-resizer',
  compare: '/tools/compare-images',
};

/** Map a legacy `?tool=` value to its route, or null when unknown. */
export function legacyToolToRoute(tool: unknown): Route | null {
  if (typeof tool !== 'string') {
    return null;
  }
  return LEGACY_TOOL_TO_ROUTE[tool] ?? null;
}
