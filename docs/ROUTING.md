# Routing — ShrinkIt Chrome Extension (hash routing)

The Full Editor (`editor.html`) is a **multi-page app** that mirrors the
ShrinkIt web app's pages. It uses **hash routing**: the page is selected
by the URL fragment (`#/route`), not by the path. One built file,
`editor.html`, serves every route.

Canonical form:

```text
editor.html[?query]#/route
```

Examples:

```text
editor.html#/                                   Home
editor.html#/tools                              Tools hub
editor.html#/tools/passport-photo-maker         Passport tool page
editor.html?src=rightclick&key=rc-123#/         Right-click landing (Home)
editor.html?src=error&reason=cors#/             Error landing (Home)
```

## Why hash routing

Extension pages are plain files served from a `chrome-extension://`
origin. There is no server, so there is no server routing and no rewrite
rule that could map a path such as `editor.html/tools` to a real file.

- **Paths do not work.** A path-style URL (`editor.html/tools`) points at
  a file that does not exist. Loading it fails, and reloading it fails.
- **The History API does not help.** `pushState` to a new path has the
  same problem: the new path is not a file, so a reload or a shared link
  breaks.
- **The hash is never sent anywhere.** Everything after `#` stays in the
  browser. Changing it never triggers a navigation or a reload, and it
  survives reloads, bookmarks, and copy-paste.
- **Back / forward work for free.** Each hash change is a history entry,
  so the browser back button moves between pages. The router listens to
  `hashchange` (plus the initial load) and renders the matching page.

## The query-before-hash rule

The query string **must come before** the hash. Everything after the
first `#` is the fragment, so a query placed after the hash is part of
the fragment and `URLSearchParams` will never see it.

```text
CORRECT: editor.html?src=rightclick&key=rc-123#/
WRONG:   editor.html#/ ?src=rightclick&key=rc-123   (query inside the fragment — ignored)
```

The router reads the route from `window.location.hash` and the handoff
parameters from `window.location.search`. The two never mix.

## Route table

| Route                          | Web page mirrored                                 | Page file                            |
| ------------------------------ | ------------------------------------------------- | ------------------------------------ |
| `#/`                           | `/` (Home: hero tool + HowItWorks + InfoSections) | `src/pages/HomePage.tsx`             |
| `#/resize`                     | `/resize` (main resizer, standalone page)         | `src/pages/ResizePage.tsx`           |
| `#/tools`                      | `/tools` (Tools hub)                              | `src/pages/ToolsHubPage.tsx`         |
| `#/tools/compress-to-50kb`     | `/tools/compress-to-50kb`                         | `src/pages/tools/Compress50Page.tsx` |
| `#/tools/compress-to-20kb`     | `/tools/compress-to-20kb`                         | `src/pages/tools/Compress20Page.tsx` |
| `#/tools/passport-photo-maker` | `/tools/passport-photo-maker`                     | `src/pages/tools/PassportPage.tsx`   |
| `#/tools/social-media-resizer` | `/tools/social-media-resizer`                     | `src/pages/tools/SocialPage.tsx`     |
| `#/tools/compare-images`       | `/tools/compare-images`                           | `src/pages/tools/ComparePage.tsx`    |
| `#/about`                      | `/about`                                          | `src/pages/AboutPage.tsx`            |
| `#/contact`                    | `/contact`                                        | `src/pages/ContactPage.tsx`          |
| `#/privacy`                    | `/privacy`                                        | `src/pages/PrivacyPage.tsx`          |
| `#/terms`                      | `/terms`                                          | `src/pages/TermsPage.tsx`            |
| Any other hash                 | `/404`                                            | `src/pages/NotFoundPage.tsx`         |

Notes on the table:

- The **5 tool pages** are the `/tools/*` rows. The main resizer is not
  one of them: it lives on Home (`#/`) as the hero tool and on its own
  standalone page (`#/resize`), exactly like the web app (`/` + `/resize`
  carry the hero tool; `/tools/*` carries the five tools).
- The old single-editor tab slugs (`main`, `target50`, `target20`,
  `passport`, `social`, `compare`) are **not** routes. They were the
  previous tab system and must not appear in links. Tool deep links use
  the web slugs above.
- The route strings are the contract. If the landed code places a page
  component in a different file than this table names, update this table
  — do not invent a second route for the same page.

## Query parameters

| Parameter | Values                               | Meaning                                                                                                                                                                                                                              |
| --------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src`     | `rightclick`, `error`                | Handoff source. Absent = normal navigation (file picker / drag-drop).                                                                                                                                                                |
| `key`     | Session key, e.g. `rc-1712345678901` | With `src=rightclick`: the `chrome.storage.session` key holding `{ name, dataUrl }` for the preloaded image. The page consumes it once, then clears it.                                                                              |
| `reason`  | `cors`, `blob`, `unknown`            | With `src=error`: machine-readable reason code. The page maps it to a localised message; the code itself is never shown to the user.                                                                                                 |
| `tool`    | Legacy tab slug                      | **Legacy only.** The previous build opened `?tool=slug`. The router maps a legacy `tool` value to its hash route when no hash is present, so old links still land on the right tool page. New code must not generate `?tool=` links. |

## Who opens which URL

| Caller                                      | URL opened                                    |
| ------------------------------------------- | --------------------------------------------- |
| Popup → Full Editor button                  | `editor.html#/`                               |
| Popup → Tools link                          | `editor.html#/tools`                          |
| Background → `SHRINKIT_OPEN_EDITOR` message | `editor.html#/`                               |
| Background → right-click, image fetched OK  | `editor.html?src=rightclick&key=<key>#/`      |
| Background → right-click, fetch failed      | `editor.html?src=error&reason=<code>#/`       |
| Header / Footer nav links                   | `editor.html#/<route>` (hash links, same tab) |

Right-click always lands on `#/` (Home), where the hero tool consumes
the preloaded image — the same place a user who opens the editor by hand
starts resizing. The error landing also renders `#/` with a localised
error banner, never a blank page and never a silent failure.

## Router behaviour

- **Parse on load + on `hashchange`.** The router reads the hash on the
  initial load and on every `hashchange` event, then renders the
  matching page component. No full-page reload on navigation.
- **Default route.** An empty or missing hash (`editor.html`, `editor.html#`)
  renders `#/` (Home).
- **Unknown route → 404.** Any hash that matches no row in the route
  table renders the 404 page (web `/404` equivalent), with a link back
  to Home. Unknown routes never render a blank page and never crash.
- **Scroll reset.** Every route change scrolls to the top, so a deep
  page (e.g. Privacy) never leaves the next page mid-scroll.
- **Document title.** Every page sets a localised `document.title`
  (`Site name — page title`) on navigation, via `t()` — never a
  hardcoded string.
- **Shared layout.** Every editor page renders the shared Header and
  Footer (see below). Only the main content area changes between routes.
- **Preload + error state belong to the landing page.** The `src`/`key`/
  `reason` query is read once on the initial load. Navigating to another
  hash route afterwards does not re-read it and does not re-show the
  banner.
- **No path links.** No link, redirect, or `pushState` call may produce
  a path-style editor URL. Internal links are hash links (`#/tools`,
  `#/about`, …). External links (e.g. the web app) are full `https://`
  URLs and leave the extension.

## Layout — shared Header / Footer

The Header and Footer are shared components rendered on every editor
page (ported from the web app's `Header` / `Footer`, Astro → React):

- **Header:** logo (pinned 34px, web parity) + site name, primary nav
  — Resize (`#/`), Tools (`#/tools`), How it works
  (`#/#how-it-works`, anchor on Home), Privacy (`#/privacy`), Contact
  (`#/contact`) — language switcher, theme switcher. About is reached
  via the Footer, not the Header nav. The nav marks the current route
  active. Header inner width 1075px.
- **Footer:** product / tools / legal link columns mirroring the web
  footer (including About, Terms, Contact), all hash links. Copyright
  bar on every page. Footer brand mark pinned 30px.
- **Exception — `#/resize` minimal footer.** The web `/resize` page
  renders only the copyright bar (no footer link columns). The
  extension `#/resize` page keeps that exception: copyright bar only.
- **Home** renders Hero + main resizer + HowItWorks + InfoSections +
  tools grid, matching web `/` (components in `src/components/home/`).
  Tool pages link back to `#/tools`.
- **Anchor links.** A hash may carry an anchor suffix after the route:
  `#/#how-it-works` means route `/` scrolled to the element with id
  `how-it-works`. The router treats the part before the second `#` as
  the route and, when an anchor is present, scrolls to that element
  instead of to the top. Footer and Header use this for the
  How-it-works link.
- **Tool pages** render one tool each (full tool UI, not a tab), plus
  the standard Header/Footer.

## What is NOT hash-routed

Only `editor.html` is multi-page. These are separate WXT entrypoints
with their own HTML files, not hash routes:

| Page               | File                                        | Opened via                                                |
| ------------------ | ------------------------------------------- | --------------------------------------------------------- |
| Popup              | `entrypoints/popup/` (`popup.html`)         | Toolbar action                                            |
| Options            | `entrypoints/options/` (`options.html`)     | `chrome.runtime.openOptionsPage()` / Extensions → Options |
| Offscreen document | `entrypoints/offscreen/` (`offscreen.html`) | Background worker only (never user-visible)               |

The Options page is not reachable as an editor hash route; the editor
Header links to it via `chrome.runtime.openOptionsPage()`, as before.

## How to add a new page

1. **Add the page component** under `src/pages/`
   (e.g. `NewPage.tsx`, tool pages under `src/pages/tools/`), rendering the page content. Content strings
   go through `t()` with keys in `src/i18n/messages/*.json` (en / es /
   pt — all three, never English-only).
2. **Add one row to the route table above** (route → web page mirrored
   → page file) and one entry in the router's route map. Route slugs
   follow the web app's slug for the same page when one exists.
3. **Link it.** Add the link to the Header nav and/or Footer columns
   if the web page is linked there; otherwise link it from the page
   that references it. Links are hash links (`#/new-page`).
4. **Set the title.** The page sets its localised `document.title` on
   mount, like every other page.
5. **Add a verification row.** Append one row to the "Multi-page
   rebuild" table in `VERIFICATION_REPORT.md` (route → web page →
   page file → status) and add the route to the laptop checklist
   (render at 390px + 1440px, nav active state, no overflow).

Do not add a page by adding a tab to a single-page editor, by adding a
new HTML entrypoint, or by using a path-style URL — those are the three
shapes this routing scheme replaces.
