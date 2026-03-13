---
phase: 02-chrome-tabs-feature
plan: "01"
subsystem: testing
tags: [vitest, typescript, chrome-extension, tabs, types]

# Dependency graph
requires: []
provides:
  - "manifest.json with tabs, tabGroups, favicon permissions"
  - "TabItem, TabSaveStatus, TabGroupInfo types in shared/types.ts"
  - "GET_BOOKMARKS added to Message type union"
  - "All TABS_* UI_STRINGS entries in shared/config.ts (Catalan)"
  - "vitest installed and configured in extension/package.json"
  - "3 failing test files as TDD RED baseline for Plans 02-02 and 02-03"
affects: [02-02, 02-03]

# Tech tracking
tech-stack:
  added: [vitest ^1.6.1, jsdom ^24.1.3, "@vitest/ui ^1.6.1"]
  patterns:
    - "TDD RED baseline — stub functions throw 'Not implemented' for contract-first development"
    - "Interface-first design — types and strings defined before implementation"

key-files:
  created:
    - extension/vitest.config.ts
    - extension/tests/tabs-filter.test.ts
    - extension/tests/tabs-selection.test.ts
    - extension/tests/tabs-save.test.ts
  modified:
    - extension/manifest.json
    - extension/shared/types.ts
    - extension/shared/config.ts
    - extension/package.json

key-decisions:
  - "vitest chosen over jest — Vite-native, ES module compatible, already used in Phase 01"
  - "jsdom environment for tests — chrome API not needed for pure utility function tests"
  - "Tab filter functions accept 'all' | 'ungrouped' | number as discriminated union for filter state"
  - "buildTabBookmark defaults categories to ['Altres'] when empty — Catalan fallback category"

patterns-established:
  - "TabItem interface: id is non-null number (filtered at load time), groupId === -1 means ungrouped"
  - "TabSaveStatus: 'pending' | 'saving' | 'saved' | 'failed' state machine for bulk save"
  - "Test stubs: stub functions placed inline in test files, implementations go to tabsUtils.ts in Plan 02"

requirements-completed: [TABS-01, TABS-02, TABS-03, TABS-04]

# Metrics
duration: 3min
completed: "2026-03-13"
---

# Phase 2 Plan 1: Chrome Tabs Feature Foundation Summary

**Chrome API permissions, TabItem/TabSaveStatus/TabGroupInfo type contracts, Catalan UI strings, and vitest TDD RED scaffold with 17 failing tests across 3 files**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-13T12:54:07Z
- **Completed:** 2026-03-13T12:57:18Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Extended manifest.json with tabs, tabGroups, favicon permissions for Chrome Tab Groups API access
- Defined TabItem, TabSaveStatus, TabGroupInfo types and extended Message union with GET_BOOKMARKS
- Added 22 TABS_* UI_STRINGS entries (including function-type entries for dynamic strings) in Catalan
- Installed vitest + jsdom + @vitest/ui and created vitest.config.ts with jsdom environment
- Created 3 test files with 17 intentionally failing tests as TDD RED baseline for Plans 02-02 and 02-03

## Task Commits

Each task was committed atomically:

1. **Task 1: Manifest permissions + type contracts** - `6b2c2fe` (feat)
2. **Task 2: Vitest scaffold + failing tests (TDD RED)** - `4a657d7` (test)

## Files Created/Modified

- `extension/manifest.json` - Added tabs, tabGroups, favicon to permissions array
- `extension/shared/types.ts` - Added TabItem, TabSaveStatus, TabGroupInfo; extended Message union with GET_BOOKMARKS
- `extension/shared/config.ts` - Added 22 TABS_* entries to UI_STRINGS object (Catalan)
- `extension/package.json` - Added test script and vitest/jsdom/@vitest-ui devDependencies
- `extension/vitest.config.ts` - New: vitest config with jsdom environment and globals
- `extension/tests/tabs-filter.test.ts` - New: 5 failing tests for filterTabsByGroup and hasGroups
- `extension/tests/tabs-selection.test.ts` - New: 8 failing tests for toggleTabSelection, selectAllVisible, deselectAllVisible, getSelectionCount
- `extension/tests/tabs-save.test.ts` - New: 6 failing tests for buildTabBookmark and getTabSaveSummary

## Decisions Made

- vitest chosen as test framework — already installed in Phase 01 for claudeService.ts TDD, keeps toolchain consistent
- jsdom environment selected — chrome.tabs API not needed for pure utility function tests (filter/selection/save helpers)
- Test stubs inline in test files — implementations go to `popup/tabsUtils.ts` in Plan 02-02

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All type contracts ready for Plan 02-02 to import: TabItem, TabSaveStatus, TabGroupInfo from shared/types.ts
- All UI strings ready: TABS_* from shared/config.ts
- TDD RED baseline ready: run `npm test` in extension/ — 17 tests failing. Plan 02-02 implements tabsUtils.ts to turn them GREEN
- Chrome API permissions in place for chrome.tabs.query and chrome.tabGroups.get calls

---
*Phase: 02-chrome-tabs-feature*
*Completed: 2026-03-13*
