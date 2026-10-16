# Contributing — ShrinkIt Chrome Extension

Thanks for helping. This project is small and deliberately strict: a single purpose (resize / compress / convert images locally), no servers, no mock data, no dead code. Read this file before opening a pull request.

## Setup

Prerequisites: Node.js (LTS) and npm.

```bash
git clone <repo-url>
cd shrinkit-extension
npm install
npm run dev
```

Load the unpacked build in Chrome: open `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select `.output/chrome-mv3`.

> Note: GitHub push and Chrome Web Store listing are not done yet — this project is currently a local build only.

## Scripts

| Command                | What it does                                                     |
| ---------------------- | ---------------------------------------------------------------- |
| `npm run dev`          | WXT dev server with hot reload (builds to `.output/chrome-mv3`). |
| `npm run build`        | Production build (`wxt build`).                                  |
| `npm run zip`          | Production build + Store-ready `.zip` (`wxt zip`).               |
| `npm run test`         | Unit tests (`vitest run`).                                       |
| `npm run typecheck`    | TypeScript strict check (`tsc --noEmit`).                        |
| `npm run lint`         | ESLint over the whole repo (`eslint .`).                         |
| `npm run format`       | Check formatting (`prettier --check .`).                         |
| `npm run format:write` | Apply formatting (`prettier --write .`).                         |

All of these must pass before a PR is merged (see the checklist below).

## Code style

- **TypeScript strict.** No `any` unless genuinely unavoidable — and if it is, add a comment saying why. Prefer precise types, `unknown` + narrowing, and exhaustive checks.
- **Prettier: 100-character lines, single quotes.** Run `npm run format:write` before committing. Do not hand-format against Prettier.
- **No `console.log`.** No stray logging in shipped code. If you need diagnostics during development, remove them before opening the PR. (Deliberate user-facing error surfaces — error banners, toasts — are fine; silent console output is not.)
- **No hardcoded user-visible strings.** Every string the user can see goes through the i18n lookup (`src/i18n/`, languages en / es / pt). No hardcoded English, Spanish, or Portuguese in UI code. English is the fallback for missing keys — never a raw key.
- **No TODOs.** Do not land `TODO`, `FIXME`, `XXX`, or placeholder code. If something is not done, it does not ship — finish it, or leave it out of the PR and say so in the PR description.
- **No mock data.** No fake images, fake results, fake counts, or placeholder content presented as real. Tests use real fixtures or clearly-labelled synthetic inputs inside test files only.
- **No dead code.** No unused exports, commented-out blocks, or unreachable branches. Delete, don't comment out.
- **Small, readable modules.** One responsibility per file. Shared logic goes in `src/lib/` (engine, i18n, settings) or `src/tools/` (tool definitions) — not copied between popup and editor.
- **Imports:** prefer relative imports within this repo; keep import order tidy (external → internal) so diffs stay clean.

## Architecture rules (summary)

The full picture is in [ARCHITECTURE.md](ARCHITECTURE.md). The rules that most often trip up PRs:

- The background service worker is plain TypeScript — no React, no DOM, no Canvas. DOM/Canvas work belongs in `popup/`, `editor/`, or `offscreen/`.
- Popup and editor share the engine (`src/lib/`) and tool definitions (`src/tools/`). Never duplicate tool logic between them.
- Images are never written to `chrome.storage` (sync or local). The only exception is the short-lived `chrome.storage.session` handoff for the right-click flow, consumed and cleared by the editor.
- No new permissions without a justification entry in [docs/PERMISSIONS.md](docs/PERMISSIONS.md) and a line in the README permissions table. Prefer no new permissions at all.
- No network calls for processing, analytics, or tracking. The only network use is the offscreen document fetching a user-right-clicked image so it can be resized locally.

## File ownership

This repo is built by parallel workers, each owning specific files. **Do not edit files you do not own.** If your change needs a file owned by someone else, say so in your PR description (or in your handoff) instead of editing it directly — the owner will make the change, or ownership will be reassigned.

- Docs workers own: `README.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`, `docs/README.md`, `docs/PERMISSIONS.md`, `docs/PRIVACY.md`.
- Every other file has its own owner (entrypoints, `src/`, tests, config). When in doubt, ask before touching it.

## PR checklist

Before requesting review, confirm all of these:

- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes with zero errors.
- [ ] `npm run format` passes (`npm run format:write` if not).
- [ ] `npm run test` passes; new behaviour has a test.
- [ ] `npm run build` succeeds; if you changed UI, you loaded the build in Chrome and exercised the affected flow (popup and/or editor).
- [ ] No `console.log`, no `TODO`/`FIXME`, no hardcoded user-visible strings, no mock data, no dead code.
- [ ] No new permissions — or, if unavoidable, `docs/PERMISSIONS.md` + README table updated with justification.
- [ ] If you touched the right-click flow, you tested it end-to-end: right-click an image → editor opens with that image → resize → download.
- [ ] If you touched i18n, all three catalogs (en / es / pt) have the new keys.
- [ ] PR description says what changed, what you tested, and what you did not test.

## Reporting bugs

Open an issue with: what you did, what you expected, what happened instead, the image type/size if relevant (no need to attach private images — a description is enough), Chrome version, and whether it reproduces in the popup, the editor, or the right-click flow.
