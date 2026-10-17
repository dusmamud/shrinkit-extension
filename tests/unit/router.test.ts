import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { buildEditorUrl } from '../../entrypoints/background/index';
import { buildHash, parseHash } from '../../src/router/hash';
import {
  LEGACY_TOOL_TO_ROUTE,
  ROUTES,
  ROUTE_TITLE_KEY,
  isValidRoute,
  legacyToolToRoute,
  type Route,
} from '../../src/router/routes';

function backgroundSource(): string {
  const url = new URL('../../entrypoints/background/index.ts', import.meta.url);
  return readFileSync(url, 'utf-8');
}

describe('ROUTES (src/router/routes.ts)', () => {
  it('is exactly the docs/ROUTING.md route table, in nav order, 404 catch-all last', () => {
    expect([...ROUTES]).toEqual([
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
    ]);
  });

  it('tool routes use the web slugs, never the old tab slugs', () => {
    for (const route of ROUTES) {
      expect(route).not.toMatch(/target50|target20/);
    }
    expect(ROUTES).toContain('/tools/compress-to-50kb');
    expect(ROUTES).toContain('/tools/compress-to-20kb');
    expect(ROUTES).toContain('/tools/passport-photo-maker');
    expect(ROUTES).toContain('/tools/social-media-resizer');
    expect(ROUTES).toContain('/tools/compare-images');
  });
});

describe('isValidRoute', () => {
  it('accepts every ROUTES entry, including the * catch-all', () => {
    for (const route of ROUTES) {
      expect(isValidRoute(route)).toBe(true);
    }
  });

  it('rejects non-routes', () => {
    expect(isValidRoute('/404')).toBe(false);
    expect(isValidRoute('')).toBe(false);
    expect(isValidRoute('/tools/50kb')).toBe(false);
    expect(isValidRoute('/tools/passport')).toBe(false);
    expect(isValidRoute(null)).toBe(false);
    expect(isValidRoute(undefined)).toBe(false);
    expect(isValidRoute(42)).toBe(false);
  });
});

describe('parseHash', () => {
  it('parses every real route', () => {
    for (const route of ROUTES) {
      if (route === '*') {
        continue;
      }
      expect(parseHash(`#${route}`).route).toBe(route);
    }
  });

  it('empty, bare-hash, and root hashes all land on Home', () => {
    expect(parseHash('').route).toBe('/');
    expect(parseHash('#').route).toBe('/');
    expect(parseHash('#/').route).toBe('/');
    expect(parseHash('/').route).toBe('/');
  });

  it('ignores a trailing slash', () => {
    expect(parseHash('#/tools/').route).toBe('/tools');
    expect(parseHash('#/tools/compress-to-50kb/').route).toBe('/tools/compress-to-50kb');
    expect(parseHash('#/about/').route).toBe('/about');
  });

  it('unknown routes land on the 404 catch-all, never a blank page', () => {
    expect(parseHash('#/nope').route).toBe('*');
    expect(parseHash('#/tools/50kb').route).toBe('*');
    expect(parseHash('#/tools/passport').route).toBe('*');
    expect(parseHash('#/404').route).toBe('*');
  });

  it('keeps /resize as its own route (standalone page, web parity — no redirect)', () => {
    expect(parseHash('#/resize').route).toBe('/resize');
    // ResizePage renders the shared Hero + MainResizer like the web
    // /resize page; it must NOT bounce to Home via a hash write.
    const page = readFileSync(
      fileURLToPath(new URL('../../src/pages/ResizePage.tsx', import.meta.url)),
      'utf8',
    );
    expect(page).toContain('Hero');
    expect(page).toContain('MainResizer');
    expect(page).not.toContain('window.location.hash');
  });

  it('splits the in-page anchor after a second #', () => {
    const parsed = parseHash('#/#how-it-works');
    expect(parsed.route).toBe('/');
    expect(parsed.params.anchor).toBe('how-it-works');
  });

  it('parses a query inside the fragment into params', () => {
    const parsed = parseHash('#/tools?ref=home');
    expect(parsed.route).toBe('/tools');
    expect(parsed.params.ref).toBe('home');
  });

  it('accepts a hash without the leading #', () => {
    expect(parseHash('/tools').route).toBe('/tools');
    expect(parseHash('tools').route).toBe('/tools');
  });
});

describe('buildHash', () => {
  it('builds the canonical hash for every route', () => {
    for (const route of ROUTES) {
      if (route === '*') {
        continue;
      }
      expect(buildHash(route)).toBe(`#${route}`);
    }
  });

  it('maps the 404 catch-all and invalid routes to #/404', () => {
    expect(buildHash('*')).toBe('#/404');
    expect(buildHash('/bogus' as Route)).toBe('#/404');
    expect(buildHash('' as Route)).toBe('#/404');
  });

  it('round-trips through parseHash for every route', () => {
    for (const route of ROUTES) {
      expect(parseHash(buildHash(route)).route).toBe(route);
    }
  });
});

describe('legacyToolToRoute', () => {
  it('maps every legacy ?tool= slug to its web-slug hash route', () => {
    expect(LEGACY_TOOL_TO_ROUTE).toEqual({
      main: '/',
      target50: '/tools/compress-to-50kb',
      target20: '/tools/compress-to-20kb',
      passport: '/tools/passport-photo-maker',
      social: '/tools/social-media-resizer',
      compare: '/tools/compare-images',
    });
    for (const [tool, route] of Object.entries(LEGACY_TOOL_TO_ROUTE)) {
      expect(legacyToolToRoute(tool)).toBe(route);
    }
  });

  it('returns null for unknown or non-string values', () => {
    expect(legacyToolToRoute('compress-50kb')).toBeNull();
    expect(legacyToolToRoute('')).toBeNull();
    expect(legacyToolToRoute(undefined)).toBeNull();
    expect(legacyToolToRoute(null)).toBeNull();
    expect(legacyToolToRoute(42)).toBeNull();
  });
});

describe('ROUTE_TITLE_KEY', () => {
  it('covers exactly the ROUTES entries', () => {
    expect(Object.keys(ROUTE_TITLE_KEY).sort()).toEqual([...ROUTES].sort());
  });

  it('points at real i18n keys (existence is asserted in i18n.test.ts)', () => {
    for (const key of Object.values(ROUTE_TITLE_KEY)) {
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    }
  });
});

describe('buildEditorUrl (background URL builder)', () => {
  it('builds editor.html#/ for Home with no params', () => {
    expect(buildEditorUrl('editor.html', {}, '/')).toBe('editor.html#/');
  });

  it('puts the query BEFORE the hash for right-click landings', () => {
    expect(buildEditorUrl('editor.html', { src: 'rightclick', key: 'rc-1' }, '/')).toBe(
      'editor.html?src=rightclick&key=rc-1#/',
    );
  });

  it('puts the query BEFORE the hash for error landings', () => {
    expect(
      buildEditorUrl('editor.html', { src: 'error', reason: 'cors', key: 'rc-error-1' }, '/'),
    ).toBe('editor.html?src=error&reason=cors&key=rc-error-1#/');
  });

  it('builds hash routes for tool pages', () => {
    expect(buildEditorUrl('editor.html', {}, '/tools/compress-to-50kb')).toBe(
      'editor.html#/tools/compress-to-50kb',
    );
    expect(buildEditorUrl('editor.html', {}, '/tools')).toBe('editor.html#/tools');
  });

  it('maps the 404 catch-all to #/404', () => {
    expect(buildEditorUrl('editor.html', {}, '*')).toBe('editor.html#/404');
  });

  it('never emits a ?tool= param', () => {
    const urls = [
      buildEditorUrl('editor.html', {}, '/'),
      buildEditorUrl('editor.html', { src: 'rightclick', key: 'rc-1' }, '/'),
      buildEditorUrl('editor.html', { src: 'error', reason: 'blob', key: 'k' }, '/'),
      buildEditorUrl('editor.html', {}, '/tools/compress-to-20kb'),
    ];
    for (const url of urls) {
      expect(url).not.toMatch(/[?&]tool=/);
    }
  });
});

describe('background source: new routing scheme', () => {
  it('uses the shared router (buildHash / legacyToolToRoute), not a private table', () => {
    const source = backgroundSource();
    expect(source).toContain('legacyToolToRoute');
    expect(source).toContain('buildEditorUrl');
    expect(source).not.toContain('KNOWN_TOOLS');
    expect(source).not.toContain('safeTool');
  });

  it('never generates a ?tool= URL', () => {
    const source = backgroundSource();
    expect(source).not.toMatch(/[?&]tool=/);
    expect(source).not.toContain("tool: 'main'");
  });

  it('opens right-click and error landings on Home (#/)', () => {
    const source = backgroundSource();
    expect(source).toContain("await openEditor({ src: 'rightclick', key }, '/')");
    expect(source).toContain("await openEditor({ src: 'error', reason, key }, '/')");
    expect(source).toContain('void openEditor({}, legacyToolToRoute(openMessage.tool)');
  });
});
