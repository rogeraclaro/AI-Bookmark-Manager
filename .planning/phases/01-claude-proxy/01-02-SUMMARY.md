---
phase: 01-claude-proxy
plan: 02
subsystem: infra
tags: [express, cors, node, launchagent, plist, macos, claude-cli, proxy]

# Dependency graph
requires:
  - phase: 01-claude-proxy/01-01
    provides: Wave 0 TDD scaffold (proxy.test.mjs, mock-claude.sh, test-install.sh)
provides:
  - Express HTTP server on port 3838 with /categorize and /process-tweet routes
  - getChildEnv(input) that strips CLAUDECODE and CLAUDE_CODE_ENTRYPOINT
  - createApp({claudeBin, claudeTimeout}) factory for hermetic test isolation
  - macOS LaunchAgent plist template with __HOME__, __PROXY_DIR__, __NODE_BIN__ placeholders
  - install.sh one-time setup script that substitutes paths and loads LaunchAgent
affects: [01-03, 01-04]

# Tech tracking
tech-stack:
  added: [express@4.21.2, cors@2.8.5, node ESM modules]
  patterns:
    - createApp factory pattern — returns Express app without binding port, enabling test isolation
    - getChildEnv(input) accepts explicit env object for testability, defaults to process.env
    - Graceful fallback pattern — both routes always return HTTP 200, never crash on claude errors
    - isMain detection via fileURLToPath(import.meta.url) for ESM entry point detection

key-files:
  created:
    - proxy/server.js
    - proxy/package.json
    - proxy/package-lock.json
    - proxy/com.ailinks.claude-proxy.plist
    - proxy/install.sh
  modified:
    - proxy/test/proxy.test.mjs

key-decisions:
  - "createApp({claudeBin, claudeTimeout}) factory pattern chosen over global CLAUDE_BIN env var for test isolation"
  - "getChildEnv() accepts explicit input object (not just process.env) to match test expectations from Plan 01 scaffold"
  - "Categorize prompt uses English keyword 'Categorize this bookmark' to match mock-claude.sh detection heuristic"
  - "ESM isMain detection uses fileURLToPath(import.meta.url) — the CommonJS __filename equivalent for ES modules"
  - "install.sh uses `which node` for node binary detection to handle both Intel (/usr/local/bin) and Apple Silicon (/opt/homebrew/bin)"

patterns-established:
  - "Graceful fallback: both /categorize and /process-tweet always return HTTP 200 — callers never need to handle 5xx"
  - "Hermetic tests: mock binary injected via createApp config, real claude CLI never called in tests"

requirements-completed: [PROXY-01, PROXY-02, PROXY-03]

# Metrics
duration: 2min
completed: 2026-03-12
---

# Phase 1 Plan 02: Proxy Server Summary

**Express proxy server with createApp factory, graceful claude CLI fallbacks, and macOS LaunchAgent auto-start setup — all 8 TDD tests now GREEN**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-12T23:14:10Z
- **Completed:** 2026-03-12T23:16:51Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created `proxy/server.js` as an ES module with `createApp({claudeBin, claudeTimeout})` factory and `getChildEnv(input)` — turns all 8 Wave 0 TDD tests GREEN
- Created `proxy/package.json` and ran `npm install` for express and cors dependencies
- Created `proxy/com.ailinks.claude-proxy.plist` LaunchAgent template with all three placeholder tokens
- Created `proxy/install.sh` with node binary auto-detection and sed-based path substitution

## Task Commits

Each task was committed atomically:

1. **Task 1: Create proxy server (server.js + package.json)** - `937eab7` (feat)
2. **Task 2: Create LaunchAgent plist + install.sh** - `6de84e8` (feat)

**Plan metadata:** see final commit (docs)

_Note: Task 1 includes TDD GREEN phase — tests from Plan 01 scaffold now all pass_

## Files Created/Modified
- `proxy/server.js` - Express server with /categorize and /process-tweet routes, createApp factory, getChildEnv export
- `proxy/package.json` - Node package manifest (express, cors deps, ESM type)
- `proxy/package-lock.json` - Lockfile from npm install
- `proxy/com.ailinks.claude-proxy.plist` - LaunchAgent plist template with __HOME__, __PROXY_DIR__, __NODE_BIN__ placeholders
- `proxy/install.sh` - One-time setup script (sed substitution + launchctl load), executable
- `proxy/test/proxy.test.mjs` - Fixed execSync path quoting for spaces-in-path compatibility (auto-fix)

## Decisions Made
- `createApp()` factory pattern (not `app.listen()` at module level): matches test expectations baked into Plan 01 scaffold — tests call `mod.createApp({claudeBin: MOCK_CLAUDE_BIN})` to inject mock binary
- `getChildEnv(input)` accepts explicit env object parameter: tests pass a controlled `{HOME, PATH, CLAUDECODE, ...}` object; using `process.env` would make tests non-deterministic
- Categorize prompt uses English "Categorize this bookmark": matches mock-claude.sh detection heuristic from Plan 01, ensuring mock returns correct shape for categorize vs tweet route
- `isMain` detection via `fileURLToPath(import.meta.url)`: correct ESM pattern for detecting direct execution, avoids auto-starting server when imported in tests

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed execSync path quoting for spaces in directory name**
- **Found during:** Task 1 (running tests — TDD GREEN)
- **Issue:** `proxy.test.mjs` timeout test used unquoted path in execSync shell command: `chmod +x ${timeoutBin}` — macOS splits on spaces in "AI Bookmark Manager" path, causing chmod to fail
- **Fix:** Added double-quotes around both `${timeoutBin}` references in the execSync template literals
- **Files modified:** `proxy/test/proxy.test.mjs`
- **Verification:** All 8 tests pass (including the previously-failing timeout test)
- **Committed in:** `937eab7` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in test scaffold)
**Impact on plan:** Fix was necessary for tests to pass on any Mac with spaces in the path. No scope creep.

## Issues Encountered
None beyond the auto-fixed path quoting bug.

## User Setup Required
None during this plan. To activate the proxy as a LaunchAgent on a Mac, run `bash proxy/install.sh` once per machine (requires Node.js installed).

## Next Phase Readiness
- Proxy server is fully functional — Plans 03 and 04 can now call `http://localhost:3838/categorize` and `http://localhost:3838/process-tweet`
- LaunchAgent setup is ready for one-time installation per Mac
- All 8 proxy tests are GREEN; future changes to server.js have full test coverage

---
*Phase: 01-claude-proxy*
*Completed: 2026-03-12*

## Self-Check: PASSED

All files exist on disk. All task commits verified in git history.
