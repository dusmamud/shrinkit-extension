import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { parseHash } from '../../src/router/hash';
import { ROUTES } from '../../src/router/routes';

/**
 * Route -> page file, per the docs/ROUTING.md route table. The `*`
 * catch-all renders the 404 page.
 */
const ROUTE_PAGE_FILES: Record<string, string> = {
  '/': 'src/pages/HomePage.tsx',
  '/resize': 'src/pages/ResizePage.tsx',
  '/tools': 'src/pages/ToolsHubPage.tsx',
  '/tools/compress-to-50kb': 'src/pages/tools/Compress50Page.tsx',
  '/tools/compress-to-20kb': 'src/pages/tools/Compress20Page.tsx',
  '/tools/passport-photo-maker': 'src/pages/tools/PassportPage.tsx',
  '/tools/social-media-resizer': 'src/pages/tools/SocialPage.tsx',
  '/tools/compare-images': 'src/pages/tools/ComparePage.tsx',
  '/about': 'src/pages/AboutPage.tsx',
  '/contact': 'src/pages/ContactPage.tsx',
  '/privacy': 'src/pages/PrivacyPage.tsx',
  '/terms': 'src/pages/TermsPage.tsx',
  '*': 'src/pages/NotFoundPage.tsx',
};

const EXTENSION_ROOT = fileURLToPath(new URL('../../', import.meta.url));

function readSource(relativePath: string): string {
  return readFileSync(join(EXTENSION_ROOT, relativePath), 'utf-8');
}

function walkTsx(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(join(EXTENSION_ROOT, dir), { withFileTypes: true })) {
    const relative = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTsx(relative, out);
    } else if (entry.name.endsWith('.tsx')) {
      out.push(relative);
    }
  }
  return out;
}

/** UI files whose hash links must all resolve to real routes. */
function linkSourceFiles(): string[] {
  return [
    ...walkTsx('src/components/layout'),
    ...walkTsx('src/components/home'),
    ...walkTsx('src/pages'),
    'entrypoints/popup/Popup.tsx',
    'entrypoints/options/Options.tsx',
    'entrypoints/editor/Editor.tsx',
  ];
}

/** Strip block comments and full-line // comments (docs mention legacy URLs). */
function stripComments(source: string): string {
  const withoutBlocks = source.replace(/\/\*[\s\S]*?\*\//g, '');
  return withoutBlocks
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('//'))
    .join('\n');
}

/** Every `#/...` literal in a file, with anchor/query suffixes stripped. */
function hashLinkRoutes(source: string): string[] {
  const routes: string[] = [];
  for (const match of source.matchAll(/#(\/[A-Za-z0-9/_?#=.-]*)/g)) {
    let path = match[1];
    const anchorIndex = path.indexOf('#', 1);
    if (anchorIndex >= 0) {
      path = path.slice(0, anchorIndex);
    }
    const queryIndex = path.indexOf('?');
    if (queryIndex >= 0) {
      path = path.slice(0, queryIndex);
    }
    // Trailing prose punctuation (')', '.', ',') is not part of the route.
    path = path.replace(/[^A-Za-z0-9/]+$/, '');
    if (path.length > 1) {
      path = path.replace(/\/+$/, '');
    }
    routes.push(path);
  }
  return routes;
}

describe('every route has a page file (docs/ROUTING.md table)', () => {
  it('the page table covers exactly ROUTES', () => {
    expect(Object.keys(ROUTE_PAGE_FILES).sort()).toEqual([...ROUTES].sort());
  });

  it('every route has its page file on disk', () => {
    for (const [route, file] of Object.entries(ROUTE_PAGE_FILES)) {
      expect(existsSync(join(EXTENSION_ROOT, file)), `missing page for ${route}: ${file}`).toBe(
        true,
      );
    }
  });

  it('the Editor shell renders every route and imports every page', () => {
    const editor = readSource('entrypoints/editor/Editor.tsx');
    for (const [route, file] of Object.entries(ROUTE_PAGE_FILES)) {
      const component = file
        .split('/')
        .pop()
        ?.replace(/\.tsx$/, '');
      expect(component, `page file for ${route}`).toBeDefined();
      expect(editor, `Editor must render ${route}`).toContain(`route === '${route}'`);
      expect(editor, `Editor must import ${component}`).toContain(component as string);
    }
  });
});

describe('every hash link points to a real route', () => {
  it('finds hash links in the UI sources (guard against a silent empty scan)', () => {
    const files = linkSourceFiles();
    expect(files.length).toBeGreaterThan(0);
    let total = 0;
    for (const file of files) {
      total += hashLinkRoutes(readSource(file)).length;
    }
    expect(total).toBeGreaterThan(0);
  });

  it('no hash link lands on the 404 catch-all', () => {
    const dead: string[] = [];
    for (const file of linkSourceFiles()) {
      for (const route of hashLinkRoutes(readSource(file))) {
        // '#/404' is buildHash('*') — a deliberate link to the 404 page.
        if (route === '/404') {
          continue;
        }
        if (parseHash(`#${route}`).route === '*') {
          dead.push(`${file}: #${route}`);
        }
      }
    }
    expect(dead).toEqual([]);
  });

  it('no path-style editor links and no ?tool= links in the UI sources', () => {
    for (const file of linkSourceFiles()) {
      const source = stripComments(readSource(file));
      expect(source, `${file} must not link editor.html/<path>`).not.toMatch(/editor\.html\//);
      expect(source, `${file} must not generate ?tool= links`).not.toMatch(/[?&]tool=/);
    }
  });
});
