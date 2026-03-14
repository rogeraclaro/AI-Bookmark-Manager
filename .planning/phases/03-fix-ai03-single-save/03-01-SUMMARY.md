---
phase: 03-fix-ai03-single-save
plan: 01
subsystem: ui
tags: [react, typescript, vitest, claude-proxy, extension]

# Dependency graph
requires:
  - phase: 01-claude-proxy
    provides: callClaudeProxy function (always resolves, never throws)
  - phase: 02-chrome-tabs-feature
    provides: handleBulkSave pattern with callClaudeProxy integration
provides:
  - resolveSaveCategories pure helper with 3-tier fallback logic
  - handleSave() wired to Claude proxy for AI categorization on single-page saves
  - 6 unit tests covering all fallback tiers for resolveSaveCategories
affects: [human-verify needed before AI-03 can be closed]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "resolveSaveCategories 3-tier fallback: Claude valid -> user selection -> Altres"
    - "Same callClaudeProxy integration pattern as handleBulkSave, applied to handleSave"

key-files:
  created:
    - extension/popup/singleSaveUtils.ts
    - extension/tests/single-save.test.ts
  modified:
    - extension/popup/popup.tsx

key-decisions:
  - "resolveSaveCategories extracted as pure helper in singleSaveUtils.ts (not inlined in popup.tsx) for testability — mirrors tabsUtils pattern"
  - "Validation guard removed: selectedCategories.length === 0 no longer blocks save — Claude assigns categories"
  - "ERRORS.NO_CATEGORY left in config.ts (not deleted) — out-of-scope project-wide audit required first"
  - "Loading state reused for Claude call duration — simplest path per CONTEXT.md"

patterns-established:
  - "Pure category resolution helpers belong in *Utils.ts files, not inlined in popup"
  - "3-tier fallback: Claude valid categories -> user selection -> Altres is the standard pattern for both save paths"

requirements-completed: [AI-03]

# Metrics
duration: 5min
completed: 2026-03-14
---

# Phase 03 Plan 01: Fix AI-03 Single Save Summary

**handleSave() in popup.tsx now calls callClaudeProxy with 3-tier category fallback (Claude -> user selection -> Altres), matching handleBulkSave parity and closing AI-03**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-14T00:09:26Z
- **Completed:** 2026-03-14T00:11:00Z
- **Tasks:** 2 of 3 (Task 3 is checkpoint:human-verify — awaiting user)
- **Files modified:** 3

## Accomplishments

- Created `singleSaveUtils.ts` with `resolveSaveCategories` pure helper function (3-tier fallback)
- Created `single-save.test.ts` with 6 green tests covering all fallback scenarios
- Removed the `selectedCategories.length === 0` validation guard from `handleSave()`
- Inserted `callClaudeProxy` call and wired `finalTitle`, `finalDescription`, `finalCategories` into bookmark construction
- Full test suite: 23/23 tests passing, TypeScript compiles cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract resolveSaveCategories helper + write tests** - `c37c91b` (feat)
2. **Task 2: Wire handleSave() to callClaudeProxy** - `2985a94` (feat)
3. **Task 3: Human verify** - awaiting checkpoint

## Files Created/Modified

- `extension/popup/singleSaveUtils.ts` - Pure `resolveSaveCategories` helper with 3-tier fallback
- `extension/tests/single-save.test.ts` - 6 unit tests for all fallback scenarios
- `extension/popup/popup.tsx` - Import added, validation guard removed, Claude call inserted, bookmark fields updated

## Decisions Made

- `resolveSaveCategories` extracted as a separate file (`singleSaveUtils.ts`) following the same testability pattern as `tabsUtils.ts`
- `ERRORS.NO_CATEGORY` left in `config.ts` — the plan explicitly noted it would become unused but a project-wide audit is needed before removal
- Reused the existing `loading` viewState during the Claude call rather than adding a new state — simplest path per CONTEXT.md

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Code changes are complete and all unit tests pass
- Awaiting human verification (Task 3 checkpoint) to confirm end-to-end behavior in the real extension:
  - Save with no categories selected succeeds
  - Saved bookmark has Claude-generated categories/title/description
  - Proxy-down fallback preserves user's selected categories (or 'Altres')

---
*Phase: 03-fix-ai03-single-save*
*Completed: 2026-03-14*
