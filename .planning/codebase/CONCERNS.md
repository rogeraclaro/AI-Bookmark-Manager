# Codebase Concerns

**Analysis Date:** 2026-03-12

## Security Concerns

**Hardcoded API Secret in Extension Configuration:**
- Risk: Secret exposed in source code repository
- Files: `extension/shared/config.ts` (lines 4, 7)
- Current state: API_SECRET = 'aAgYYud97Kp29Lif9u0i' hardcoded as constant
- Impact: If repository is public, credential is compromised. Any attacker with this secret can save bookmarks to your server
- Recommendation: Move to environment variables or secure config file excluded from version control. Use different secrets for extension vs main app

**Environment Variables in Frontend (Gemini API Key):**
- Risk: API key compiled into built frontend code
- Files: `src/services/geminiService.ts` (line 78)
- Current state: `import.meta.env.VITE_API_KEY` used directly in browser
- Impact: If frontend is public (it is - served on ailinksdb.masellas.info), API key is visible in network requests. Quota exhaustion risk
- Recommendation: Implement API proxy backend to handle Gemini calls instead of exposing key to frontend

**Unvalidated API Response Handling:**
- Risk: Trusting Gemini API responses without validation
- Files: `src/services/geminiService.ts` (lines 160-174)
- Current state: JSON parsed directly after regex cleanup, no schema validation post-parse
- Impact: Malformed responses could slip through; missing title validation at parse time
- Recommendation: Add schema validation after JSON parsing (use zod or similar)

## Tech Debt

**JSON Response Truncation Workaround:**
- Issue: Gemini API sometimes generates infinite/oversized titles that break JSON parsing
- Files: `src/services/geminiService.ts` (lines 149-158, 165-169)
- Impact: Requires regex-based title truncation in string before parsing, then again after parsing. Fragile and duplicative
- Fix approach: Instead of post-processing, adjust system prompt or maxOutputTokens to prevent generation. Consider streaming response handling

**Type Safety Gaps - Excessive `any` Usage:**
- Issue: 17+ instances of `any` type throughout codebase
- Files: `src/App.tsx` (multiple), `src/services/geminiService.ts`, `src/types.ts`, `extension/` files
- Impact: TypeScript provides no type checking for these values; runtime errors possible
- Examples:
  - `loadedBookmarks.map((b: any) =>` in App.tsx line 231
  - `parseError: any` in geminiService.ts line 170
  - `error: any` in multiple catch blocks
- Fix approach: Define proper types for all error objects and data structures. Replace `[key: string]: any` in TweetRaw with specific optional fields

**Batch Processing Size Locked at 1:**
- Issue: Processing tweets one at a time instead of batching
- Files: `src/services/geminiService.ts` (line 184)
- Current state: `const BATCH_SIZE = 1` hardcoded
- Impact: Extremely slow processing (2000+ tweets = 2000+ API calls). Trial quota burns quickly
- Fix approach: Implement dynamic batching (5-10 tweets/batch) to reduce API calls by 80-90%. Add configurable batch size

**Redundant Storage API Layer:**
- Issue: Two different storage implementations (localStorage and custom API)
- Files: `src/services/storage.ts`
- Current state: `if (USE_API) { ... } else { localStorage ... }` repeated for every method
- Impact: Code duplication, harder to maintain, possible desync between API and local state
- Fix approach: Extract common interface, create adapter pattern. Consider defaulting to one approach

**Multiple Message Listeners on Same Service Worker:**
- Issue: Two separate `chrome.runtime.onMessage.addListener` calls for different message types
- Files: `extension/background/service-worker.ts` (lines 30, 88)
- Current state: Should consolidate into single listener with switch/case
- Impact: Harder to debug, potential race conditions with concurrent messages
- Fix approach: Merge both listeners into single handler with proper message routing

## Performance Bottlenecks

**Trial Rate Limiting Hardcoded:**
- Issue: 90-day trial hardcoded with rollover to 5 RPM free tier
- Files: `src/services/geminiService.ts` (lines 9-29)
- Current state: TRIAL_END_DATE = 2026-03-08 is already passed. Rate limits will downgrade to 5 RPM (1 request every 12 seconds)
- Impact: After trial, processing becomes glacially slow. One 2000-tweet file = ~7 hours of processing
- Recommendation: Implement user-configurable rate limiting. Add backend integration to manage trial status server-side (not hardcoded date)

**Large App.tsx Component:**
- Issue: Main component is 1845 lines
- Files: `src/App.tsx`
- Impact: Difficult to reason about, test, or maintain. Multiple responsibilities mixed
- Fix approach: Extract sub-components: BookmarkGrid, FilterPanel, UploadHandler, StatsPanel. Each under 300 lines

**No Pagination/Virtualization:**
- Issue: All bookmarks rendered at once in DOM
- Files: `src/App.tsx` (rendering logic)
- Current state: Map over full bookmarks array to JSX
- Impact: With 1000+ bookmarks, page becomes sluggish. No lazy loading
- Fix approach: Implement virtual scrolling (react-window) or pagination (load 50 at a time)

**String Search Every Render:**
- Issue: Search filters computed on every render without memoization
- Files: `src/App.tsx` (useMemo used but may need optimization review)
- Impact: Noticeable lag when typing in search with large dataset
- Fix approach: Verify useMemo is wrapping all filter/search computations. Consider debouncing input

## Fragile Areas

**Gemini API JSON Schema Parsing:**
- Files: `src/services/geminiService.ts` (lines 90-112, 160-174)
- Why fragile:
  - Multiple fallback cleanups required (regex for contamination, truncation of long titles, control char removal)
  - JSON parsing fails if schema doesn't match exactly
  - No validation that required fields exist post-parse
- Safe modification: Add comprehensive error logging before throwing. Create test cases for various malformed responses. Consider switching to streaming API

**Browser Extension Message Passing:**
- Files: `extension/background/service-worker.ts`, `extension/popup/popup.tsx`
- Why fragile:
  - No timeout on message responses
  - No message ID tracking (can't correlate request/response if multiple in flight)
  - Error handling is inconsistent
- Safe modification: Wrap chrome.runtime.sendMessage in timeout promise. Add request ID field to all messages. Test with concurrent saves

**File Upload JSON Parsing:**
- Files: `src/App.tsx` (lines 519+)
- Why fragile:
  - Accepts any JSON structure via `rawData: any`
  - Assumes presence of fields without validation
  - No size limits on uploaded files
- Safe modification: Add JSON schema validation at upload. Reject files >50MB. Provide detailed error messages for malformed structure

**Delete/Undo Logic with Blacklist:**
- Files: `src/App.tsx` (delete handlers)
- Why fragile:
  - Deleted IDs stored separately in localStorage/API
  - No reconciliation if deleted list gets corrupted
  - "Undo delete" logic may be out of sync with actual stored state
- Safe modification: Store deletion timestamp instead of binary flag. Implement garbage collection for deletions >30 days old. Add data sync verification

## Missing Error Recovery

**API Failures in Storage:**
- Issue: If storage API down, app falls back to localStorage silently
- Files: `src/services/storage.ts` (lines 55-70)
- Current state: `apiRequest` throws, caller doesn't retry or alert user
- Impact: User thinks data saved to server, but it's only local. Confusion if switching devices
- Fix approach: Return error status to caller. Show toast warning "Saving locally only - server unreachable". Implement retry on reconnect

**Gemini Timeout Without User Feedback:**
- Issue: 90-second timeout with minimal user guidance
- Files: `src/services/geminiService.ts` (lines 115-116, 239-243)
- Current state: User sees generic timeout message after waiting 90s
- Impact: No indication of progress. User doesn't know if it's hung or still processing
- Fix approach: Add progress updates every 10s. Show "Still processing..." message. Allow manual retry with exponential backoff

**Missing Duplicate Check in Direct API Calls:**
- Issue: Extension saves bookmarks directly without duplicate check
- Files: `extension/shared/api.ts` (line 68 - saveBookmark just appends)
- Current state: Duplicate check exists in popup UI but can be bypassed
- Impact: Duplicate bookmarks easily created from extension if user clicks fast twice
- Fix approach: Backend should deduplicate by URL. Extension should lock save button during request

## Known Limitations

**Catalan-Only Internationalization:**
- Files: `src/translations.ts`
- Impact: App is hardcoded to Catalan. Non-Catalan users get mixed language experience
- Fix: Implement i18n system. Add language selector

**No Edit Functionality:**
- Files: Throughout codebase
- Impact: User must delete and re-add to change bookmark details
- Fix: Add edit modal with pre-filled fields

**No Bookmark Search/Filter on Title:**
- Files: `src/App.tsx` (search implementation)
- Current: Only filters by category
- Fix: Add full-text search across title and description

**Single API Secret for All Users:**
- Files: `extension/shared/config.ts`
- Impact: If compromised, all extension users affected. Can't revoke per-user
- Fix: Implement user-specific API tokens or move auth to extension popup login

## Test Coverage Gaps

**No Unit Tests:**
- Issue: Entire codebase lacks test files
- Files: All source files
- Risk: Regressions undetected, refactoring is risky
- Priority: High - Add tests for geminiService JSON parsing (most critical), storage layer, and API calls

**No Integration Tests:**
- Issue: Extension + backend communication not tested
- Files: `extension/`, backend (not in this repo)
- Risk: Can't verify extension correctly saves to API
- Priority: High - Add test suite that mocks backend and verifies message flow

**No E2E Tests:**
- Issue: Upload → Process → Save → Verify flow not tested
- Files: All
- Risk: Entire feature chain could break without detection
- Priority: Medium - Add Playwright tests for main user flows

## Deployment Concerns

**No Database Migrations System:**
- Issue: Backend uses JSON file (db.json) without version control
- Files: Referenced in INSTRUCCIONS-DEPLOY.md
- Current: Manual data structure changes could break old bookmarks
- Fix: Implement migration system if adding/removing fields to Bookmark

**No Build Size Monitoring:**
- Files: dist/ and extension/dist/
- Current: No indication of bundle sizes
- Fix: Add build-time size check. Warn if bundle >1MB

**Manual VPS Deployment:**
- Files: `deploy-to-vps.sh`
- Current: SSH key required, manual steps, no automated rollback
- Fix: Consider GitHub Actions for CI/CD, with automated testing before deploy

**No Monitoring/Alerts:**
- Files: Extension runs in user's browser with no telemetry
- Current: Can't detect if extension breaks due to API changes
- Fix: Add optional error reporting (user opt-in) to detect failures

---

*Concerns audit: 2026-03-12*
