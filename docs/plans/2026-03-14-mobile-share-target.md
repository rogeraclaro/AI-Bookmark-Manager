# Mobile Share Target Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:executing-plans to implement this plan task-by-task.

**Goal:** Build a PWA at `mobile/` that Android users can install and use as a Share Target to save links to the AI Bookmarks VPS, with UI identical to the Chrome extension.

**Architecture:** Isolated Vite/React SPA in `mobile/`. Re-uses `extension/shared/api.ts` and `extension/shared/types.ts` via relative imports. Deployed as static files to `/var/www/ailinksdb.masellas.info/mobile/`. Registers as Android Share Target via PWA `manifest.json`. Zero changes to existing VPS app or extension.

**Tech Stack:** React 18, Vite 5, TypeScript, Tailwind CSS 3, Vitest

---

## Task 1: Bootstrap `mobile/` project

**Files:**
- Create: `mobile/package.json`
- Create: `mobile/tsconfig.json`
- Create: `mobile/vite.config.ts`
- Create: `mobile/postcss.config.js`
- Create: `mobile/tailwind.config.js`
- Create: `mobile/index.html`

**Step 1: Create `mobile/package.json`**

```json
{
  "name": "ai-bookmark-manager-mobile",
  "version": "1.0.0",
  "description": "Mobile PWA Share Target for AI Bookmark Manager",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run --reporter=verbose"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "@vitest/ui": "^1.6.1",
    "autoprefixer": "^10.4.16",
    "jsdom": "^24.1.3",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.3",
    "vite": "^5.0.8",
    "vitest": "^1.6.1"
  }
}
```

**Step 2: Create `mobile/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

**Step 3: Create `mobile/vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/mobile/',
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'jsdom',
  },
});
```

**Step 4: Create `mobile/postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**Step 5: Create `mobile/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{html,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**Step 6: Create `mobile/index.html`**

```html
<!doctype html>
<html lang="ca">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="manifest" href="/mobile/manifest.json" />
    <meta name="theme-color" content="#facc15" />
    <title>AI Bookmark Manager</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 7: Install dependencies**

```bash
cd mobile && npm install
```

Expected: `node_modules/` created, no errors.

**Step 8: Commit**

```bash
git add mobile/package.json mobile/tsconfig.json mobile/vite.config.ts mobile/postcss.config.js mobile/tailwind.config.js mobile/index.html
git commit -m "feat(mobile): bootstrap Vite/React project scaffold"
```

---

## Task 2: PWA manifest + icons

**Files:**
- Create: `mobile/manifest.json`
- Create: `mobile/public/` (directory for static assets)

**Step 1: Create `mobile/manifest.json`**

```json
{
  "name": "AI Bookmark Manager",
  "short_name": "AI Bookmarks",
  "description": "Guarda pàgines web a la teva col·lecció d'AI Bookmarks",
  "start_url": "/mobile/",
  "display": "standalone",
  "background_color": "#facc15",
  "theme_color": "#facc15",
  "icons": [
    {
      "src": "/mobile/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/mobile/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
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

**Step 2: Copy extension icons to `mobile/public/`**

```bash
mkdir -p mobile/public
cp extension/assets/icon-48.png mobile/public/icon-192.png
cp extension/assets/icon-128.png mobile/public/icon-512.png
```

Note: We're reusing the extension icons (48px → 192px slot, 128px → 512px slot). They'll be upscaled by Android but work fine for a first version. Replace with proper 192/512 PNGs later if needed.

**Step 3: Commit**

```bash
git add mobile/manifest.json mobile/public/
git commit -m "feat(mobile): add PWA manifest with Android share_target"
```

---

## Task 3: Utility functions + tests

**Files:**
- Create: `mobile/src/utils.ts`
- Create: `mobile/src/utils.test.ts`

**Step 1: Write the failing tests**

Create `mobile/src/utils.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveAuthorFromUrl, parseShareParams } from './utils';

describe('resolveAuthorFromUrl', () => {
  it('returns "github" for github.com URLs', () => {
    expect(resolveAuthorFromUrl('https://github.com/user/repo')).toBe('github');
  });

  it('returns "twitter" for x.com URLs', () => {
    expect(resolveAuthorFromUrl('https://x.com/user/status/123')).toBe('twitter');
  });

  it('returns "twitter" for twitter.com URLs', () => {
    expect(resolveAuthorFromUrl('https://twitter.com/user')).toBe('twitter');
  });

  it('returns "web" for unknown URLs', () => {
    expect(resolveAuthorFromUrl('https://example.com/article')).toBe('web');
  });
});

describe('parseShareParams', () => {
  it('extracts url param from search string', () => {
    const result = parseShareParams('?url=https%3A%2F%2Fexample.com&title=Hello');
    expect(result.url).toBe('https://example.com');
    expect(result.title).toBe('Hello');
  });

  it('extracts text param when url is absent', () => {
    const result = parseShareParams('?text=https%3A%2F%2Fexample.com');
    expect(result.url).toBe('https://example.com');
  });

  it('returns empty strings when no params', () => {
    const result = parseShareParams('');
    expect(result.url).toBe('');
    expect(result.title).toBe('');
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd mobile && npm test
```

Expected: FAIL — `Cannot find module './utils'`

**Step 3: Create `mobile/src/utils.ts`**

```ts
export function resolveAuthorFromUrl(url: string): string {
  if (/github\.com/i.test(url)) return 'github';
  if (/twitter\.com|x\.com/i.test(url)) return 'twitter';
  return 'web';
}

export interface ShareParams {
  url: string;
  title: string;
}

export function parseShareParams(search: string): ShareParams {
  const params = new URLSearchParams(search);
  const url = params.get('url') || params.get('text') || '';
  const title = params.get('title') || '';
  return { url, title };
}
```

**Step 4: Run tests to verify they pass**

```bash
cd mobile && npm test
```

Expected: All 7 tests PASS.

**Step 5: Commit**

```bash
git add mobile/src/utils.ts mobile/src/utils.test.ts
git commit -m "feat(mobile): add share param parsing and author resolution utils"
```

---

## Task 4: API + config layer

**Files:**
- Create: `mobile/src/api.ts`
- Create: `mobile/src/config.ts`
- Create: `mobile/.env.example`

**Step 1: Create `mobile/src/api.ts`**

Re-exports from the extension's shared module — zero duplication:

```ts
export { getBookmarks, getCategories, saveBookmark, isDuplicate } from '../../extension/shared/api';
```

**Step 2: Create `mobile/src/config.ts`**

```ts
export const ERRORS = {
  NO_TITLE: "El títol no pot estar buit",
  TITLE_TOO_LONG: "El títol no pot superar els 80 caràcters",
  DUPLICATE: "Aquest enllaç ja està guardat",
  API_ERROR: "Error de connexió amb el servidor",
  UNKNOWN: "Error desconegut. Torna-ho a intentar.",
  CATEGORY_EXISTS: "Aquesta categoria ja existeix",
  CATEGORY_EMPTY: "El nom de la categoria no pot estar buit",
};

export const UI_STRINGS = {
  TITLE: "AI Bookmark Manager",
  LOADING: "Carregant informació...",
  SAVE: "Afegir Bookmark",
  CANCEL: "Cancel·lar",
  CLOSE: "Tancar",
  RETRY: "Reintentar",
  LABEL_TITLE: "Títol:",
  LABEL_DESCRIPTION: "Descripció:",
  LABEL_AUTHOR: "Autor:",
  LABEL_URL: "URL:",
  LABEL_CATEGORIES: "Categories:",
  SUCCESS: "Bookmark afegit correctament!",
  DUPLICATE_WARNING: "Aquest enllaç ja existeix!",
  DUPLICATE_MESSAGE: "Aquesta pàgina ja està guardada a la teva col·lecció.",
  NEW_CATEGORY_PLACEHOLDER: "Nova categoria...",
  ADD_CATEGORY: "Afegir",
};
```

**Step 3: Create `mobile/.env.example`**

```
# Copy to .env.local and fill in your values
# These must match the values used by the extension
VITE_API_BASE_URL=https://ailinksdb.masellas.info
VITE_API_SECRET=your_secret_here
```

Note: The extension currently has the secret hardcoded in `extension/shared/config.ts`. The mobile app re-uses that same config file via the re-export in Step 1, so no `.env.local` is strictly required for the first version. The `.env.example` documents intent for future refactoring.

**Step 4: Verify TypeScript compiles**

```bash
cd mobile && npx tsc --noEmit
```

Expected: No errors.

**Step 5: Commit**

```bash
git add mobile/src/api.ts mobile/src/config.ts mobile/.env.example
git commit -m "feat(mobile): add API re-export layer and UI config strings"
```

---

## Task 5: CSS + App.tsx UI

**Files:**
- Create: `mobile/src/index.css`
- Create: `mobile/src/App.tsx`

**Step 1: Create `mobile/src/index.css`**

Identical to extension's `popup/popup.css` with `w-full` instead of fixed `w-[400px]`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply m-0 p-0 font-mono bg-white;
  }

  #root {
    @apply w-full min-h-screen;
  }
}

@layer components {
  .input {
    @apply border-2 border-black p-2 w-full font-mono text-sm;
  }

  .textarea {
    @apply border-2 border-black p-2 w-full font-mono text-sm resize-none;
  }

  .btn-primary {
    @apply bg-yellow-400 border-2 border-black px-4 py-2
           font-bold uppercase font-mono text-sm
           shadow-[4px_4px_0px_0px_#000]
           hover:translate-x-[-2px] hover:translate-y-[-2px]
           hover:shadow-[6px_6px_0px_0px_#000]
           active:translate-x-[2px] active:translate-y-[2px]
           active:shadow-none
           transition-all duration-100
           cursor-pointer;
  }

  .btn-secondary {
    @apply bg-white border-2 border-black px-4 py-2
           font-bold uppercase font-mono text-sm
           hover:bg-gray-100
           transition-colors
           cursor-pointer;
  }

  .checkbox-label {
    @apply flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 font-mono text-sm;
  }

  .checkbox-input {
    @apply w-4 h-4 border-2 border-black cursor-pointer;
  }
}
```

**Step 2: Create `mobile/src/App.tsx`**

```tsx
import { useState, useEffect } from 'react';
import type { Bookmark } from '../../extension/shared/types';
import { getCategories, saveBookmark, isDuplicate } from './api';
import { parseShareParams, resolveAuthorFromUrl } from './utils';
import { UI_STRINGS, ERRORS } from './config';

type ViewState = 'loading' | 'form' | 'duplicate' | 'success' | 'error';

export default function App() {
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { url: sharedUrl, title: sharedTitle } = parseShareParams(window.location.search);
    setUrl(sharedUrl);
    setTitle(sharedTitle);

    try {
      const cats = await getCategories();
      setCategories(cats.length > 0 ? cats : ['Altres']);
    } catch {
      setCategories(['Altres']);
    }

    setViewState('form');
  }

  function toggleCategory(category: string) {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  }

  async function handleAddCategory() {
    const trimmedName = newCategoryName.trim();

    if (!trimmedName) { setError(ERRORS.CATEGORY_EMPTY); return; }
    if (categories.includes(trimmedName)) { setError(ERRORS.CATEGORY_EXISTS); return; }

    setIsAddingCategory(true);
    setError('');

    // Optimistic update: add to local list without hitting API
    setCategories(prev => [...prev, trimmedName]);
    setSelectedCategories(prev => [...prev, trimmedName]);
    setNewCategoryName('');
    setIsAddingCategory(false);
  }

  async function handleSave() {
    if (!title.trim()) { setError(ERRORS.NO_TITLE); return; }
    if (title.length > 80) { setError(ERRORS.TITLE_TOO_LONG); return; }
    if (!url) { setError(ERRORS.UNKNOWN); return; }

    setViewState('loading');

    try {
      const duplicate = await isDuplicate(url);
      if (duplicate) { setViewState('duplicate'); return; }

      const finalCategories = selectedCategories.length > 0 ? selectedCategories : ['Altres'];

      const bookmark: Bookmark = {
        id: `mob_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: title.trim(),
        description: description.trim(),
        author: resolveAuthorFromUrl(url),
        originalLink: url,
        externalLinks: [],
        categories: finalCategories,
        createdAt: Date.now(),
      };

      await saveBookmark(bookmark);
      setViewState('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ERRORS.UNKNOWN;
      setError(msg);
      setViewState('error');
    }
  }

  // Loading state
  if (viewState === 'loading') {
    return (
      <div className="p-6 text-center">
        <div className="bg-yellow-400 border-2 border-black p-4 mb-4">
          <h1 className="text-xl font-bold uppercase">{UI_STRINGS.TITLE}</h1>
        </div>
        <p className="font-mono text-sm">{UI_STRINGS.LOADING}</p>
      </div>
    );
  }

  // Duplicate warning
  if (viewState === 'duplicate') {
    return (
      <div className="p-6">
        <div className="bg-red-500 border-2 border-black p-4 mb-4 text-white">
          <h1 className="text-xl font-bold uppercase">⚠️ {UI_STRINGS.DUPLICATE_WARNING}</h1>
        </div>
        <p className="font-mono text-sm mb-6">{UI_STRINGS.DUPLICATE_MESSAGE}</p>
        <div className="flex justify-end">
          <button onClick={() => window.close()} className="btn-secondary">
            {UI_STRINGS.CLOSE}
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (viewState === 'success') {
    return (
      <div className="p-6">
        <div className="bg-green-400 border-2 border-black p-4 text-black">
          <h1 className="text-xl font-bold uppercase">✅ {UI_STRINGS.SUCCESS}</h1>
        </div>
      </div>
    );
  }

  // Error state
  if (viewState === 'error') {
    return (
      <div className="p-6">
        <div className="bg-red-500 border-2 border-black p-4 mb-4 text-white">
          <h1 className="text-xl font-bold uppercase">❌ Error al guardar</h1>
        </div>
        <p className="font-mono text-sm mb-6">{error}</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => window.close()} className="btn-secondary">
            {UI_STRINGS.CLOSE}
          </button>
          <button onClick={() => { setError(''); setViewState('form'); }} className="btn-primary">
            {UI_STRINGS.RETRY}
          </button>
        </div>
      </div>
    );
  }

  // Form view
  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-yellow-400 border-b-2 border-black p-4">
        <h1 className="text-xl font-bold uppercase">🔖 {UI_STRINGS.TITLE}</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Title */}
        <div>
          <label className="block font-bold text-sm mb-1">📄 {UI_STRINGS.LABEL_TITLE}</label>
          <input
            type="text"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block font-bold text-sm mb-1">📝 {UI_STRINGS.LABEL_DESCRIPTION}</label>
          <textarea
            className="textarea"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Author (read-only) */}
        <div>
          <label className="block font-bold text-sm mb-1">👤 {UI_STRINGS.LABEL_AUTHOR}</label>
          <p className="text-gray-500 text-sm font-mono">{resolveAuthorFromUrl(url)}</p>
        </div>

        {/* URL (read-only) */}
        <div>
          <label className="block font-bold text-sm mb-1">🔗 {UI_STRINGS.LABEL_URL}</label>
          <p className="text-gray-500 text-xs font-mono truncate">{url}</p>
        </div>

        {/* Categories */}
        <div>
          <label className="block font-bold text-sm mb-2">🏷️ {UI_STRINGS.LABEL_CATEGORIES}</label>
          <div className="border-2 border-black p-3 bg-gray-50 max-h-40 overflow-y-auto">
            <div className="grid grid-cols-2 gap-1">
              {categories.map(cat => (
                <label key={cat} className="checkbox-label">
                  <input
                    type="checkbox"
                    className="checkbox-input"
                    checked={selectedCategories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
                  />
                  <span>{cat}</span>
                </label>
              ))}
            </div>
            {/* Add new category */}
            <div className="flex gap-2 mt-2 pt-2 border-t border-gray-300">
              <input
                type="text"
                className="input flex-1 text-sm"
                placeholder={UI_STRINGS.NEW_CATEGORY_PLACEHOLDER}
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                disabled={isAddingCategory}
              />
              <button
                onClick={handleAddCategory}
                disabled={isAddingCategory}
                className="btn-secondary text-sm px-3"
              >
                {isAddingCategory ? '...' : UI_STRINGS.ADD_CATEGORY}
              </button>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-100 border-2 border-red-500 p-2 text-red-700 text-sm font-mono">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-between gap-3 pt-2 border-t-2 border-black">
          <button onClick={() => window.close()} className="btn-secondary">
            {UI_STRINGS.CANCEL}
          </button>
          <button onClick={handleSave} className="btn-primary">
            ✓ {UI_STRINGS.SAVE}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Verify TypeScript compiles**

```bash
cd mobile && npx tsc --noEmit
```

Expected: No errors.

**Step 4: Commit**

```bash
git add mobile/src/index.css mobile/src/App.tsx
git commit -m "feat(mobile): add App UI — identical form view to Chrome extension"
```

---

## Task 6: Entry point + dev smoke test

**Files:**
- Create: `mobile/src/main.tsx`

**Step 1: Create `mobile/src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

**Step 2: Run dev server and smoke test**

```bash
cd mobile && npm run dev
```

Expected: Server starts at `http://localhost:5173/mobile/`

Open `http://localhost:5173/mobile/` in browser — should show loading then form with empty URL/title.

Open `http://localhost:5173/mobile/?url=https://example.com&title=Test+Article` — should show form with URL and title pre-filled.

**Step 3: Run tests**

```bash
cd mobile && npm test
```

Expected: All tests PASS.

**Step 4: Commit**

```bash
git add mobile/src/main.tsx
git commit -m "feat(mobile): add entry point and wire up React app"
```

---

## Task 7: Build + deployment

**Files:**
- Create: `mobile/.gitignore`
- Create: `mobile/deploy.sh`

**Step 1: Create `mobile/.gitignore`**

```
node_modules/
dist/
.env.local
```

**Step 2: Verify production build**

```bash
cd mobile && npm run build
```

Expected: `mobile/dist/` created with `index.html`, `assets/`, `manifest.json` (needs copying — see step 3).

**Step 3: Fix build — copy manifest + icons**

Vite doesn't auto-copy `manifest.json` from root. Add a `postbuild` script to `mobile/package.json`:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "postbuild": "cp manifest.json dist/ && cp public/*.png dist/",
  "preview": "vite preview",
  "test": "vitest run --reporter=verbose"
}
```

Run build again:

```bash
npm run build
```

Expected: `dist/manifest.json`, `dist/icon-192.png`, `dist/icon-512.png` present.

**Step 4: Create `mobile/deploy.sh`**

```bash
#!/bin/bash
# Deploy mobile PWA to VPS
# Usage: ./deploy.sh user@your-vps-ip

set -e

VPS_USER_HOST="${1:-user@ailinksdb.masellas.info}"
VPS_PATH="/var/www/ailinksdb.masellas.info/mobile"

echo "Building..."
npm run build

echo "Deploying to $VPS_USER_HOST:$VPS_PATH ..."
rsync -av --delete dist/ "$VPS_USER_HOST:$VPS_PATH/"

echo "Done. Visit https://ailinksdb.masellas.info/mobile/"
```

```bash
chmod +x mobile/deploy.sh
```

**Step 5: Verify dist structure**

```bash
ls mobile/dist/
```

Expected output:
```
assets/
icon-192.png
icon-512.png
index.html
manifest.json
```

**Step 6: Commit**

```bash
git add mobile/.gitignore mobile/deploy.sh mobile/package.json
git commit -m "feat(mobile): add build config and deploy script"
```

---

## Post-deployment: Android setup

Once deployed, these are the one-time steps for Android:

1. Open Chrome → navigate to `https://ailinksdb.masellas.info/mobile/`
2. Tap ⋮ menu → "Add to Home screen" → "Add"
3. From any app → Share → "AI Bookmarks" (appears in the share sheet)
4. The form opens with the URL and title pre-filled

> **Note:** The Share Target only works after the PWA is installed ("Add to Home screen"). Without installation, sharing opens the page in a regular browser tab.

---

## Task Summary

| # | Task | Key files |
|---|------|-----------|
| 1 | Bootstrap project | `mobile/package.json`, `vite.config.ts`, `index.html` |
| 2 | PWA manifest | `mobile/manifest.json`, `mobile/public/icon-*.png` |
| 3 | Utils + tests | `mobile/src/utils.ts`, `mobile/src/utils.test.ts` |
| 4 | API + config | `mobile/src/api.ts`, `mobile/src/config.ts` |
| 5 | UI | `mobile/src/index.css`, `mobile/src/App.tsx` |
| 6 | Entry + smoke test | `mobile/src/main.tsx` |
| 7 | Build + deploy | `mobile/deploy.sh`, `mobile/.gitignore` |
