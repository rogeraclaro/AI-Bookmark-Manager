---
phase: 01-claude-proxy
plan: 01
subsystem: testing
tags: [node-test-runner, mjs, shell, tdd, wave-0, proxy]

# Dependency graph
requires: []
provides:
  - Wave 0 test scaffold for proxy server using Node.js built-in test runner
  - Unit tests for getChildEnv() env var stripping (CLAUDECODE, CLAUDE_CODE_ENTRYPOINT)
  - Integration tests for POST /categorize (success, ENOENT fallback, timeout fallback)
  - Integration tests for POST /process-tweet (success tweetSchema, claude failure fallback)
  - Plist substitution smoke test (test-install.sh)
  - Mock claude binary (mock-claude.sh) for hermetic testing
affects: [01-02, 01-03, 01-04]

# Tech tracking
tech-stack:
  added: [node:test (built-in), node:assert (built-in), node:child_process]
  patterns:
    - Wave 0 TDD scaffold — tests written before implementation, intentionally failing
    - Dynamic import per-test to isolate import failures without crashing test runner
    - Mock binary pattern — mock-claude.sh replaces real claude CLI for hermetic tests
    - createApp(config) factory pattern expected from server.js for testability

key-files:
  created:
    - proxy/test/proxy.test.mjs
    - proxy/test/mock-claude.sh
    - proxy/test/test-install.sh
  modified: []

key-decisions:
  - "Used Node.js built-in node:test runner (zero deps, Node 18+) instead of Jest/Vitest"
  - "Dynamic import per-test group so import failure is caught per-describe, not at module load"
  - "Single mock-claude.sh inspects $@ to return categorize or tweet shape (simpler than two scripts)"
  - "test-install.sh gracefully SKIPs when plist not created yet (Plan 02 creates it)"
  - "Server testability requires createApp({claudeBin, claudeTimeout}) factory in server.js"

patterns-established:
  - "Mock binary pattern: set CLAUDE_BIN or pass claudeBin config to avoid real Claude CLI"
  - "Wave 0 scaffold: failing tests committed before implementation as TDD RED baseline"

requirements-completed: [PROXY-01, PROXY-02, PROXY-04, AI-04]

# Metrics
duration: 1min
completed: 2026-03-12
---

# Phase 1 Plan 01: Proxy Test Scaffold Summary

**Wave 0 TDD scaffold using Node.js built-in test runner — 8 failing tests covering getChildEnv() stripping, /categorize and /process-tweet routes, and plist substitution smoke test**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-12T21:07:11Z
- **Completed:** 2026-03-12T21:08:52Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created `proxy/test/proxy.test.mjs` with 8 tests across 3 describe groups (all intentionally failing until Plan 02 creates server.js)
- Created `proxy/test/mock-claude.sh` — hermetic mock binary that inspects args to return categorize or tweet JSON
- Created `proxy/test/test-install.sh` — plist substitution smoke test that SKIPs cleanly when plist not yet created

## Task Commits

Each task was committed atomically:

1. **Task 1: Create proxy unit + integration test file** - `b8701a2` (test)
2. **Task 2: Create plist substitution smoke test** - `07cca8d` (feat)

**Plan metadata:** see final commit (docs)

_Note: Task 1 is TDD RED phase — tests fail by design until Plan 02 creates proxy/server.js_

## Files Created/Modified
- `proxy/test/proxy.test.mjs` - Unit + integration tests for proxy server (Wave 0 scaffold)
- `proxy/test/mock-claude.sh` - Mock claude binary for hermetic test execution
- `proxy/test/test-install.sh` - Plist __HOME__/__PROXY_DIR__ substitution smoke test

## Decisions Made
- Used `node:test` built-in runner (zero deps, Node 18+) — keeps proxy self-contained with no npm install needed
- Dynamic `import()` inside each test/describe block so a missing server.js causes per-test failures, not a module-load crash that would hide all results
- Single `mock-claude.sh` inspects `$@` to branch on output shape — simpler than maintaining two separate mock files
- Server.js must export `createApp({claudeBin, claudeTimeout})` factory function for testability — this design constraint is baked into the tests

## Deviations from Plan

None — plan executed exactly as written. The timeout test (mock-claude-timeout.sh) is created inline by the test itself using execSync rather than as a pre-committed file, which is cleaner and avoids leaving a sleep script in the repo.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Test scaffold is committed and provides the RED baseline for Plan 02
- Plan 02 (proxy server) must export `getChildEnv` and `createApp({claudeBin, claudeTimeout})` to turn these tests GREEN
- test-install.sh will automatically switch from SKIP to PASS once Plan 02 creates the plist template

---
*Phase: 01-claude-proxy*
*Completed: 2026-03-12*
