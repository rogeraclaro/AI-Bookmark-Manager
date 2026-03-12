# Codebase Structure

## Overview

Dual-stack project: a React web app and a Chrome Extension, sharing no code directly but both communicating with the same Supabase/Gemini backend.

## Directory Layout

```
ai-bookmarks/
├── src/                          # Web app (React + Vite)
│   ├── App.tsx                   # Root component, routing, main layout
│   ├── main.tsx                  # Entry point
│   ├── types.ts                  # Shared TypeScript types (Bookmark, Category, etc.)
│   ├── translations.ts           # i18n strings (ES/EN)
│   ├── vite-env.d.ts             # Vite type declarations
│   ├── vite.config.ts            # Vite config for web app
│   ├── components/
│   │   ├── UI.tsx                # Shared UI primitives (buttons, modals, etc.)
│   │   ├── ScrollToTop.tsx       # Scroll restoration on route change
│   │   └── TrialCountdown.tsx    # Trial/subscription UI component
│   └── services/
│       ├── geminiService.ts      # Gemini AI API calls (summarization, tagging)
│       └── storage.ts            # Supabase CRUD operations for bookmarks
│
├── extension/                    # Chrome Extension (MV3)
│   ├── background/
│   │   └── service-worker.ts     # MV3 service worker, handles messages from content/popup
│   ├── content/
│   │   └── content.ts            # Content script injected into web pages
│   ├── popup/
│   │   ├── popup.tsx             # Extension popup UI (React)
│   │   └── index.tsx             # Popup entry point
│   ├── shared/
│   │   ├── api.ts                # Shared API calls used by popup/background
│   │   ├── config.ts             # Extension configuration constants
│   │   └── types.ts              # Extension-specific TypeScript types
│   ├── assets/                   # Extension icons and static assets
│   ├── vite.config.ts            # Vite config for extension build
│   ├── tailwind.config.js        # Tailwind config (extension-scoped)
│   └── postcss.config.js         # PostCSS config
│
├── public/                       # Static assets for web app
├── eslint.config.js              # ESLint configuration
├── tailwind.config.js            # Tailwind config (web app)
├── postcss.config.js             # PostCSS config (web app)
└── vite.config.ts                # Root Vite config
```

## Key File Locations

| Purpose | File |
|---------|------|
| App entry | `src/main.tsx` |
| Root component / routing | `src/App.tsx` |
| Bookmark data types | `src/types.ts` |
| Supabase storage layer | `src/services/storage.ts` |
| Gemini AI service | `src/services/geminiService.ts` |
| Shared UI components | `src/components/UI.tsx` |
| Extension service worker | `extension/background/service-worker.ts` |
| Extension popup | `extension/popup/popup.tsx` |
| Content script | `extension/content/content.ts` |
| Extension API calls | `extension/shared/api.ts` |
| Extension types | `extension/shared/types.ts` |

## Naming Conventions

### Files
- React components: `PascalCase.tsx` (e.g., `ScrollToTop.tsx`)
- Services/utilities: `camelCase.ts` (e.g., `geminiService.ts`, `storage.ts`)
- Config files: `camelCase.config.js/ts`
- Type definition files: `types.ts` per scope

### Code
- React components: `PascalCase` functions
- Hooks: `useCamelCase` (not heavily used)
- Services: module-level exported functions in camelCase
- Types/interfaces: `PascalCase` (e.g., `Bookmark`, `Category`)

## Where to Add New Code

| Task | Location |
|------|----------|
| New UI component (web) | `src/components/` |
| New service/API call (web) | `src/services/` |
| New shared type | `src/types.ts` |
| New extension UI | `extension/popup/` |
| New extension background logic | `extension/background/service-worker.ts` |
| New extension API helper | `extension/shared/api.ts` |
| New i18n string | `src/translations.ts` |

## Special Directories

- `node_modules/` — dependencies, never edit
- `dist/` — build output, gitignored
- `.planning/` — GSD planning artifacts, not part of app code
- `.env` / `.env.local` — environment variables (Supabase URL/key, Gemini key), gitignored
