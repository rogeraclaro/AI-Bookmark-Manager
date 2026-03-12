---
phase: 01-claude-proxy
plan: 03
subsystem: api
tags: [claude, proxy, typescript, fetch, vitest, tdd, react]

requires:
  - phase: 01-claude-proxy/01-01
    provides: LaunchAgent infrastructure for running the local Claude proxy daemon
  - phase: 01-claude-proxy/01-02
    provides: Node.js proxy server exposing POST /process-tweet at localhost:3838

provides:
  - claudeService.ts - Drop-in replacement for geminiService.ts that proxies tweet processing to local Claude proxy
  - App.tsx wired to claudeService - Gemini trial UI removed, Claude pipeline active
  - Test suite for claudeService with 5 vitest tests (RED+GREEN TDD verified)

affects:
  - 02 (any phase using tweet processing pipeline)

tech-stack:
  added: [vitest]
  patterns:
    - "Proxy HTTP service pattern: fetch POST with AbortSignal.timeout, MAX_RETRIES=3, DELAY_MS=2000"
    - "Fallback bookmark pattern: isAI=false, categories=['Altres'] when all retries exhausted"
    - "TDD RED-GREEN cycle with vitest for service modules"

key-files:
  created:
    - src/services/claudeService.ts
    - src/services/claudeService.test.ts
  modified:
    - src/App.tsx
    - vite.config.ts
    - package.json

key-decisions:
  - "vitest chosen as test framework (Vite-native, zero config for ES modules)"
  - "sanitizeText ported directly from geminiService.ts (identical logic)"
  - "VITE_CLAUDE_PROXY_URL env var with fallback to http://localhost:3838 for resilience"
  - ".env is gitignored - VITE_CLAUDE_PROXY_URL documented as required local config"

patterns-established:
  - "claudeService pattern: fetch /process-tweet, forward AbortSignal, fallback on all retries"

requirements-completed: [AI-01, AI-02, AI-04]

duration: 2min
completed: 2026-03-12
---

# Phase 1 Plan 3: claudeService.ts + App.tsx Claude Wiring Summary

**`claudeService.ts` drop-in replaces Gemini with proxy HTTP calls to localhost:3838, App.tsx wired to Claude pipeline with TrialCountdown UI removed — verified via 5 vitest tests (TDD) and clean tsc**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-12T23:15:15Z
- **Completed:** 2026-03-12T23:17:01Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created `claudeService.ts` with identical TypeScript signature to `processBookmarksWithGemini`, using fetch POST to local proxy with 90s timeout, 3 retries, and fallback bookmark creation
- Wired App.tsx to `processBookmarksWithClaude`, removed `TrialCountdown` import and JSX, added `VITE_CLAUDE_PROXY_URL` to `.env`
- Installed vitest and established TDD test suite: 5 tests exercising exports, success path, fallback path, and abort signal — all GREEN after implementation

## Task Commits

1. **Task 1: Create claudeService.ts** - `e0c2c53` (feat + test, TDD RED→GREEN)
2. **Task 2: Wire App.tsx to claudeService + add env var** - `6f68aef` (feat)

## Files Created/Modified

- `src/services/claudeService.ts` - Drop-in replacement for geminiService.ts; calls proxy POST /process-tweet; retry/fallback logic; sanitizeText helper
- `src/services/claudeService.test.ts` - 5 vitest tests covering exports, success, fallback, abort
- `src/App.tsx` - Import switched to claudeService, TrialCountdown removed from import and JSX
- `vite.config.ts` - Added `test: { environment: 'node' }` for vitest
- `package.json` - Added vitest devDependency and `test` script
- `.env` (local only, gitignored) - Added `VITE_CLAUDE_PROXY_URL=http://localhost:3838`

## Decisions Made

- Used vitest (not jest) — Vite project, ES module native, zero additional config required
- Kept `sanitizeText` implementation identical to geminiService.ts (same purpose, same 700 char limit)
- `VITE_CLAUDE_PROXY_URL` has fallback `'http://localhost:3838'` hardcoded so app works even if env var is missing at runtime
- `.env` is gitignored: the new env var is documented here rather than committed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added vitest test infrastructure not in plan**
- **Found during:** Task 1 (TDD setup)
- **Issue:** No test framework existed in the project; TDD flag required one
- **Fix:** Installed vitest, added `test` script to package.json, configured `vite.config.ts`
- **Files modified:** package.json, package-lock.json, vite.config.ts
- **Verification:** `npm test` runs all 5 tests successfully
- **Committed in:** `e0c2c53` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (infrastructure addition for TDD requirement)
**Impact on plan:** Required for `tdd="true"` compliance. No scope creep beyond test tooling.

## Issues Encountered

- `proxy/test/proxy.test.mjs` appears in vitest scan with "No test suite found" error — this is a pre-existing empty file from plan 02 (plan 02 work was done without a test runner). Out of scope; deferred to plan 02 or cleanup.
- `.env` is gitignored so `VITE_CLAUDE_PROXY_URL=http://localhost:3838` was not committed. This is correct behavior; env files should not be in version control.

## User Setup Required

Add the following to your local `.env` (already done locally, not committed):

```
VITE_CLAUDE_PROXY_URL=http://localhost:3838
```

This is required for the tweet import pipeline to reach the Claude proxy.

## Next Phase Readiness

- Claude pipeline is fully wired: proxy (plan 02) + frontend service (plan 03) + LaunchAgent (plan 01) complete
- Web app's tweet import now uses Claude instead of Gemini; TypeScript compiles cleanly
- Remaining: plan 04 (integration testing / end-to-end verification of the full stack)

---
*Phase: 01-claude-proxy*
*Completed: 2026-03-12*
