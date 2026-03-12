# Architecture

**Analysis Date:** 2026-03-12

## Pattern Overview

**Overall:** Dual-stack application with two independent deployment targets:
1. **Web App** (React SPA) - Full-featured bookmark management and import/export
2. **Chrome Extension** - Quick-capture UI for saving current webpage as bookmark

Both share data through a common REST API backend (`https://ailinksdb.masellas.info`).

**Key Characteristics:**
- Flexible storage: LocalStorage fallback or API-backed persistence
- Google Gemini API integration for tweet content analysis and categorization
- Message-passing architecture between extension components (content script, popup, service worker)
- React-based UI with Tailwind CSS styling and custom retry/rate-limit handling

## Layers

**Presentation Layer:**
- Purpose: Render UI and handle user interactions
- Location: `src/` (webapp) and `extension/popup/` (extension)
- Contains: React components (Button, Input, Modal, etc.), page layouts, forms
- Depends on: Service layer, translations
- Used by: End users directly

**Service Layer:**
- Purpose: Business logic and data persistence
- Location: `src/services/`, `extension/shared/`, `extension/background/`
- Contains: Gemini API integration, storage abstraction, category/bookmark management, caching
- Depends on: External APIs (Gemini, custom bookmark API), browser APIs (chrome.*, fetch)
- Used by: Presentation layer, extension background script

**API Abstraction Layer:**
- Purpose: Decouple storage implementation details
- Location: `src/services/storage.ts`, `extension/shared/api.ts`
- Contains: Conditional storage (API vs LocalStorage), request handling, error handling
- Depends on: Network (fetch), localStorage, environment variables
- Used by: All service logic

**Content Integration Layer (Extension):**
- Purpose: Extract and communicate webpage metadata
- Location: `extension/content/`, `extension/background/`
- Contains: Page metadata extraction, Chrome message listeners, duplicate checking
- Depends on: DOM APIs, Chrome extension APIs
- Used by: Extension popup for bookmark creation

**Data Model Layer:**
- Purpose: Type definitions and constants
- Location: `src/types.ts`, `extension/shared/types.ts`, `extension/shared/config.ts`
- Contains: TypeScript interfaces (Bookmark, Category, TweetRaw), message types, API config
- Depends on: None (pure types/constants)
- Used by: All layers

## Data Flow

**Tweet Import Flow (Web App):**

1. User uploads Twitter JSON export (`App.tsx`)
2. File parsed and tweets extracted (handles multiple JSON formats: `full_text`, `text`)
3. Tweets batched and sent to Gemini API via `processBookmarksWithGemini()`
4. Gemini returns structured result: `{title, categories, externalLinks, isAI, originalId}`
5. Results stored via `storage.saveBookmarks()` → either API or LocalStorage
6. Import log displayed with status for each tweet

**Webpage Bookmark Flow (Chrome Extension):**

1. User clicks extension icon on any webpage
2. `popup.tsx` loads and calls `chrome.tabs.sendMessage()` to `content.ts`
3. `content.ts` extracts metadata (title, description, author, URL) from page
4. Popup displays extraction and categories from `service-worker.ts` cache
5. User edits, selects categories, and clicks "Save"
6. Message sent to `service-worker.ts`: `{type: 'SAVE_BOOKMARK', data: bookmark}`
7. Service worker calls extension/shared/api.ts → posts to backend API
8. Categories cache cleared on success

**State Management:**

- **Web App:** React `useState()` hooks within `App.tsx` - no global state manager
  - `bookmarks`, `categories`, `deletedIds`, `logs` tracked locally
  - UI-level state: `editingBookmark`, `showModal`, `filterCategory`, `searchTerm`
  - API calls trigger state updates via `.then()` callbacks

- **Extension:** No persistent state between popup sessions
  - Categories cached in `service-worker.ts` memory for 5 minutes
  - Each popup load queries fresh metadata from content script
  - Background script maintains single source of truth for categories

## Key Abstractions

**Bookmark Model:**
- Purpose: Represents a saved webpage/tweet with metadata
- Examples: `src/types.ts` line 19-28, `extension/shared/types.ts` line 2-11
- Pattern: TypeScript interface with required fields (id, title, description, author, originalLink, categories, createdAt)

**Storage Abstraction:**
- Purpose: Decouple data persistence from implementation
- Examples: `src/services/storage.ts`, `extension/shared/api.ts`
- Pattern: Conditional wrapper - checks `USE_API` flag and routes to either REST API or LocalStorage

**Gemini Processing Pipeline:**
- Purpose: Analyze tweet content, extract metadata, classify categories
- Examples: `src/services/geminiService.ts`
- Pattern: Batch processing with retry logic, rate-limiting, timeout handling
- Rate limits: 2000 RPM during trial (100ms delay), 5 RPM after (13s delay)

**Chrome Message Protocol:**
- Purpose: Communication between extension components (popup ↔ content script, popup ↔ background)
- Examples: Defined in `extension/shared/types.ts` (Message interface)
- Pattern: Type-discriminated messages with strict format: `{type: string, data?: any}`

## Entry Points

**Web App Entry Point:**
- Location: `src/main.tsx`
- Triggers: Browser loads `/` (Vite dev or production build)
- Responsibilities: Mount React app to DOM root element, render `App.tsx`

**Extension Popup Entry Point:**
- Location: `extension/popup/index.tsx` (HTML) + `extension/popup/popup.tsx` (React)
- Triggers: User clicks extension icon
- Responsibilities: Load page metadata, fetch categories, render bookmark capture form

**Extension Background Service Worker:**
- Location: `extension/background/service-worker.ts`
- Triggers: Extension loads (runs in background continuously)
- Responsibilities: Listen for messages, cache categories, relay API calls, handle duplicate checks

**Extension Content Script:**
- Location: `extension/content/content.ts`
- Triggers: Injected on all_urls when needed (lazy-loaded from popup)
- Responsibilities: Extract page metadata, respond to popup requests

## Error Handling

**Strategy:** Graceful degradation with user-facing messaging and console logging.

**Patterns:**

- **API Failures:** Try-catch blocks with fallback data
  - Example: `geminiService.ts` - on API error, returns empty categories or retries with backoff
  - Example: `storage.ts` - falls back to LocalStorage if API secret not configured

- **Missing Data:** Use defaults and sensible fallbacks
  - Tweet extraction: Multiple fields attempted (full_text, text) with empty string fallback
  - Page metadata: Cascade through og:title → twitter:title → document.title → h1 → "Unknown"

- **User Feedback:** Log entries displayed in UI log panel
  - Import logs show per-tweet status (✓ success, ❌ error, ⚠️ rate limit)
  - Error alerts modal with message and retry button

- **Rate Limiting:** Detected and handled via response status codes
  - 429 response triggers exponential backoff wait (DELAY_MS increases per retry)
  - Message logged: "Rate limit hit, pausing X seconds"

## Cross-Cutting Concerns

**Logging:**
- Web app: `strings.logs` (translated messages) → LogEntry objects → stored in state → rendered in log panel
- Extension: `console.log/error()` → browser DevTools console
- Gemini API: Detailed messages for import progress, errors, retries

**Validation:**
- Bookmark creation: Title required, at least one category, URL not duplicate
- Extension form: Title length check (max 80 chars), category not empty
- API responses: Type-checked via TypeScript interfaces

**Authentication:**
- Extension API calls: `x-api-secret` header with shared secret from `API_CONFIG`
- Web app storage API: `x-api-secret` header from env var `VITE_STORAGE_SECRET`
- Content script: No auth needed (runs in page context)

**Caching:**
- Extension categories: 5-minute TTL in `service-worker.ts` memory
- Gemini API: No caching (each import fresh analysis)
- Bookmarks: Loaded from API/LocalStorage on demand

---

*Architecture analysis: 2026-03-12*
