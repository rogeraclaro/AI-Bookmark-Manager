# Mobile Share Target — Design Document

**Date:** 2026-03-14
**Status:** Approved

## Context

AI Bookmarks (ai-bookmarks) is a React/Vite SPA running on a VPS at `ailinksdb.masellas.info`. It has a Chrome extension (`extension/`) with a popup form for saving bookmarks. The goal is to replicate this save flow on Android, triggered via the native Share Sheet.

## Constraints

1. UI must be identical to the Chrome extension form view (neobrutalist: yellow header, black borders, same fields).
2. Nothing in the existing VPS app (`src/`) or its backend may be modified.
3. All new code lives in an isolated `mobile/` directory, deployed to `/mobile/` on the VPS domain.
4. No Claude proxy — categories are selected manually by the user.
5. Android only (for now).

## Architecture

### Directory structure

```
ai-bookmarks/
└── mobile/
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    ├── manifest.json           # PWA manifest with share_target
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx             # UI: identical to extension form view
    │   └── api.ts              # re-exports from extension/shared/api.ts
    └── dist/                   # build output → deployed to VPS
```

### VPS deployment path

```
/var/www/ailinksdb.masellas.info/mobile/
```

Accessible at `https://ailinksdb.masellas.info/mobile/`.
Served as static files — no new server processes or nginx location changes required beyond serving the folder.

## PWA Web Share Target

`manifest.json` registers the app as an Android Share Target:

```json
{
  "name": "AI Bookmarks",
  "short_name": "AI Bookmarks",
  "start_url": "/mobile/",
  "display": "standalone",
  "background_color": "#facc15",
  "theme_color": "#facc15",
  "share_target": {
    "action": "/mobile/",
    "method": "GET",
    "params": {
      "url": "url",
      "title": "title",
      "text": "text"
    }
  }
}
```

**Android setup flow:**
1. Visit `https://ailinksdb.masellas.info/mobile/` in Chrome
2. "Add to home screen" → installed as PWA
3. From any app → Share → "AI Bookmarks"
4. Opens `https://ailinksdb.masellas.info/mobile/?url=...&title=...`
5. App reads query params and pre-fills the form

## UI

Identical to the extension's `form` view state, with these adaptations:
- `w-full` instead of `w-[400px]` fixed width
- No tabs view (not applicable on mobile)
- Author inferred from URL via `resolveAuthorFromUrl` (same logic as extension)
- Categories loaded directly from VPS API (no `chrome.runtime`)

**Fields:** Title (editable), Description (textarea), Author (read-only), URL (read-only), Categories (checkboxes + add new).

**States:** `loading` → `form` → `success` / `error` / `duplicate` — same as extension.

## API integration

`mobile/src/api.ts` re-exports from `extension/shared/api.ts`:

```ts
export { getBookmarks, getCategories, saveBookmark, isDuplicate } from '../../extension/shared/api'
```

Environment variables (`.env.local` in `mobile/`):
```
VITE_API_BASE_URL=https://ailinksdb.masellas.info
VITE_API_SECRET=<same secret as extension>
```

No new backend endpoints. No changes to the existing API.

## Deployment

```bash
cd mobile/
npm run build
rsync -av dist/ user@vps:/var/www/ailinksdb.masellas.info/mobile/
```
