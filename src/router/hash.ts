/**
 * Hash parsing / building for the editor's multi-page shell.
 *
 * Pure functions — no DOM, no storage, no React — so they are fully
 * unit-testable. The Editor owns the side effects (listening to
 * `hashchange`, scrolling, reading `window.location.search`).
 *
 * Hash shape: `#/route?query#anchor`
 * - The route is the part after the leading `#`, up to `?` or a second `#`.
 * - `?query` params land in `params` (URL-decoded, first value wins on
 *   duplicates, matching URLSearchParams).
 * - A second `#` carries an in-page anchor (`#/#how-it-works` means
 *   route `/` scrolled to the element with id `how-it-works`). It is
 *   exposed as `params.anchor` so the result stays `{route, params}`.
 * - A trailing slash is ignored (`#/tools/` is `/tools`); an empty or
 *   missing hash is `/` (Home).
 * - `/resize` is preserved as its own route: its page (ResizePage)
 *   redirects to Home on mount.
 * - Anything that matches no route is the `*` (404) route.
 */

import { isValidRoute, ROUTES, type Route } from './routes';

export type { Route };
export { isValidRoute, ROUTES };

/** Parse a hash (with or without the leading `#`) into route + params. */
export function parseHash(hash: string): { route: Route; params: Record<string, string> } {
  let rest = hash.trim();
  if (rest.startsWith('#')) {
    rest = rest.slice(1);
  }

  // Second `#` starts the in-page anchor (`#/#how-it-works`).
  let anchor: string | null = null;
  const anchorIndex = rest.indexOf('#');
  if (anchorIndex >= 0) {
    anchor = rest.slice(anchorIndex + 1);
    rest = rest.slice(0, anchorIndex);
  }

  // `?` starts the query string inside the fragment.
  let query = '';
  const queryIndex = rest.indexOf('?');
  if (queryIndex >= 0) {
    query = rest.slice(queryIndex + 1);
    rest = rest.slice(0, queryIndex);
  }

  let path = rest.trim();
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  if (path.length > 1) {
    path = path.replace(/\/+$/, '');
  }
  if (path === '') {
    path = '/';
  }

  const params: Record<string, string> = {};
  if (query) {
    const search = new URLSearchParams(query);
    search.forEach((value, key) => {
      if (!(key in params)) {
        params[key] = value;
      }
    });
  }
  if (anchor !== null && anchor !== '') {
    try {
      params.anchor = decodeURIComponent(anchor);
    } catch {
      params.anchor = anchor;
    }
  }

  if (isValidRoute(path) && path !== '*') {
    return { route: path, params };
  }
  return { route: '*', params };
}

/** Build the canonical hash for a route (`/` -> `#/`, `*` -> `#/404`). */
export function buildHash(route: Route): string {
  if (!isValidRoute(route)) {
    return '#/404';
  }
  if (route === '*') {
    return '#/404';
  }
  return `#${route}`;
}
