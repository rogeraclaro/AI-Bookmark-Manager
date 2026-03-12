# External Integrations

**Analysis Date:** 2026-03-12

## APIs & External Services

**Google Generative AI (Gemini):**
- Service: Google Gemini 2.5 Flash model for AI-powered bookmark processing
- What it's used for: Analyzing tweet/bookmark content to extract titles, descriptions, categorize, and identify AI-related content
- SDK/Client: @google/genai 1.30.0
- Auth: Environment variable `VITE_API_KEY` (Google API key)
- Location: `src/services/geminiService.ts`
- Rate Limits:
  - Trial period (active through 2026-03-08): 2000 RPM with 100ms delay between requests
  - Free tier (after trial): 5 RPM with 13s delay between requests
  - Max retries: 5 (trial), 3 (free tier)
- Special handling: Trial status tracked with expiration date (2025-12-08 to 2026-03-08); includes fallback processing when API fails

## Data Storage

**Primary Storage:**
- Strategy: Dual-mode storage in `src/services/storage.ts`
  - Remote API (preferred if `VITE_STORAGE_SECRET` configured)
  - Local browser storage (fallback)

**Remote API:**
- Service: Custom backend at `https://ailinksdb.masellas.info/api`
- Connection: `VITE_STORAGE_API_URL` and `VITE_STORAGE_SECRET` environment variables
- Client: Native `fetch()` API with custom wrapper in `src/services/storage.ts`
- Auth: Header `x-api-secret` with value from `VITE_STORAGE_SECRET`
- Endpoints:
  - `GET /bookmarks` - Retrieve all stored bookmarks
  - `POST /bookmarks` - Save/update complete bookmarks array
  - `GET /categories` - Retrieve available categories
  - `POST /categories` - Save/update categories array
  - `GET /deleted` - Retrieve list of deleted bookmark IDs
  - `POST /deleted` - Save deleted bookmark IDs
  - `POST /reset` - Clear all data

**Local Storage:**
- Fallback when remote API not configured
- Stored keys:
  - `ai-bookmarks-data` - Bookmarks array
  - `ai-bookmarks-categories` - Categories array
  - `ai-bookmarks-deleted-ids` - Deleted bookmark IDs
- Location: Browser's localStorage API

## Chrome Extension Backend

**Backend Service:**
- Service: Custom backend for Chrome extension bookmarks
- Base URL: `https://ailinksdb.masellas.info/api`
- Auth: Header `x-api-secret: aAgYYud97Kp29Lif9u0i` (hardcoded in `extension/shared/config.ts`)
- Endpoints:
  - `GET /bookmarks` - Fetch all bookmarks
  - `POST /bookmarks` - Save bookmark
  - `GET /categories` - Get category list
  - `POST /categories` - Add new category
- Implementation: `extension/shared/api.ts`
- Note: Hardcoded API secret in extension code (security concern - see CONCERNS.md)

## Authentication & Identity

**Auth Provider:**
- Custom header-based authentication using API secrets
- No OAuth, OIDC, or external auth provider
- Secrets provided via:
  - Main app: Environment variable `VITE_STORAGE_SECRET`
  - Extension: Hardcoded in `extension/shared/config.ts`

## Monitoring & Observability

**Error Tracking:**
- Console logging only (console.error, console.log)
- No external error tracking service (Sentry, Rollbar, etc.)

**Logs:**
- Browser console for development/debugging
- In-app UI log display (`LogEntry` type in `src/types.ts`)
- Log messages in Catalan and English

## CI/CD & Deployment

**Hosting:**
- Backend API: `https://ailinksdb.masellas.info` (VPS-based deployment)
- Main webapp: Not detected (likely static site or self-hosted)
- Chrome extension: Distributed via Chrome Web Store (not verified)

**CI Pipeline:**
- Not detected - no GitHub Actions, GitLab CI, Jenkins configs found

**Build Commands:**
```bash
# Main webapp
npm run build        # Compiles TypeScript, bundles with Vite
npm run dev          # Development server with hot reload

# Chrome extension
npm run build        # TypeScript compilation, Vite bundling, manifest/asset copying
npm run dev          # Watch mode build
```

## Environment Configuration

**Required env vars (Main App):**
- `VITE_API_KEY` - Google Generative AI API key (required for bookmark processing)

**Optional env vars (Main App):**
- `VITE_STORAGE_API_URL` - Remote storage backend URL (defaults to relative path)
- `VITE_STORAGE_SECRET` - API authentication secret (if not set, uses local storage)

**Environment files:**
- `.env` file exists in project root (contents managed per security policy)
- No .env.example or other variants detected

**Secrets location:**
- Production secrets: Environment variables in deployment platform
- Development secrets: `.env` file (local, not committed)
- Extension: Hardcoded in `extension/shared/config.ts` (API secret and base URL)

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- Chrome extension messages to background service worker (internal)
  - Types defined in `extension/shared/types.ts`
  - Message handlers in `extension/background/service-worker.ts`
- No external webhook calls detected

## Data Flow Integration Points

**Main App (src/):**
1. User uploads JSON file with tweet data
2. `geminiService.ts` calls Google Gemini API with batch of tweets
3. Gemini returns processed JSON with titles, descriptions, categories
4. Results saved via `storage.ts` to either:
   - Remote API (if `VITE_STORAGE_SECRET` set)
   - Local browser storage (fallback)

**Chrome Extension (extension/):**
1. User saves current webpage via extension popup
2. Background service worker (`service-worker.ts`) receives message
3. Calls `extension/shared/api.ts` which sends to `https://ailinksdb.masellas.info/api`
4. Duplicate check and category management also via same API
5. All data stored on backend

**Cross-App Compatibility:**
- Both apps use same `Bookmark` interface structure
- Both can work with same backend API at `ailinksdb.masellas.info`
- Separate data models for Twitter import vs web bookmark features

---

*Integration audit: 2026-03-12*
