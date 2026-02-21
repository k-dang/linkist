# Repository Guidelines

## Project Structure & Module Organization
This repository is a Chrome Extension (Manifest V3) with no build pipeline.

- `manifest.json`: extension metadata, permissions, and popup entrypoint.
- `popup.html`: popup markup loaded by Chrome action.
- `popup.css`: popup styles.
- `popup.js`: popup behavior, active-tab link extraction, rendering, and error handling.
- `README.md`: setup and usage notes.

Keep logic in `popup.js` modular (small focused functions) and keep UI structure changes mirrored between `popup.html` and `popup.css`.

## Build, Test, and Development Commands
There is no `npm`/bundler workflow in this project.

- Load locally: open `chrome://extensions` -> enable **Developer mode** -> **Load unpacked** -> select this folder.
- Reload after edits: click **Reload** on the Linkist card in `chrome://extensions`.
- Quick smoke test: open an `https://` page, click the extension icon, verify link count/list, and open a link from the popup.

## Coding Style & Naming Conventions
- JavaScript/CSS/HTML are plain (no framework).
- Use 2-space indentation, semicolons, and single quotes in JS.
- Prefer `const` by default; use `let` only when reassignment is required.
- Use clear camelCase names for JS identifiers (`renderLinks`, `getActiveTab`).
- Use kebab-case for CSS classes (`link-item`, `link-url`).
- Keep DOM IDs descriptive and stable (`links-list`, `link-count`).

## Testing Guidelines
Automated tests are not configured yet. Validate changes with manual checks:

1. Standard page (`http/https`) shows detected links in DOM order.
2. Duplicate URLs are not repeated.
3. Empty-link pages show the empty state.
4. Restricted pages (for example `chrome://extensions`) show the friendly error.
5. Clicking a listed item opens a new tab.

When adding non-trivial logic, include a short manual test note in the PR description.