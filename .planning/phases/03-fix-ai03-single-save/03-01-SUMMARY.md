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
affects: [04-fix-ai04-categories, 05-fix-ai05 — same popup.tsx handleSave pattern applies]

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
  - "Author fallback resolves from URL hostname ('github', 'web') instead of hardcoded 'Extension' string — applied as Rule 1 fix during human verification"

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

- **Duration:** ~30 min (including human verification)
- **Started:** 2026-03-14T00:09:26Z
- **Completed:** 2026-03-14T00:11:47Z
- **Tasks:** 3 of 3 (all complete, including human-verify checkpoint)
- **Files modified:** 3 (+ additional fixes during verification)

## Accomplishments

- Created `singleSaveUtils.ts` with `resolveSaveCategories` pure helper function (3-tier fallback)
- Created `single-save.test.ts` with 6 green tests covering all fallback scenarios
- Removed the `selectedCategories.length === 0` validation guard from `handleSave()`
- Inserted `callClaudeProxy` call and wired `finalTitle`, `finalDescription`, `finalCategories` into bookmark construction
- Full test suite: 23/23 tests passing, TypeScript compiles cleanly
- Human verification passed: save with no categories selected succeeds, Claude-generated categories appear on saved bookmarks
- Additional fix: author field now resolves from URL hostname instead of hardcoded 'Extension' string

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract resolveSaveCategories helper + write tests** - `c37c91b` (feat)
2. **Task 2: Wire handleSave() to callClaudeProxy** - `2985a94` (feat)
3. **Task 3: Human verify (checkpoint — approved)** - no code commit (human verification only)
4. **Additional fix: author resolves from URL hostname** - `9db5852` + `15ad200` (fix — applied during verification)

## Files Created/Modified

- `extension/popup/singleSaveUtils.ts` - Pure `resolveSaveCategories` helper with 3-tier fallback
- `extension/tests/single-save.test.ts` - 6 unit tests for all fallback scenarios
- `extension/popup/popup.tsx` - Import added, validation guard removed, Claude call inserted, bookmark fields updated

## Decisions Made

- `resolveSaveCategories` extracted as a separate file (`singleSaveUtils.ts`) following the same testability pattern as `tabsUtils.ts`
- `ERRORS.NO_CATEGORY` left in `config.ts` — the plan explicitly noted it would become unused but a project-wide audit is needed before removal
- Reused the existing `loading` viewState during the Claude call rather than adding a new state — simplest path per CONTEXT.md

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Author field hardcoded to 'Extension' string**
- **Found during:** Task 3 (human verification)
- **Issue:** Content script was hardcoding `author: 'Extension'` instead of deriving a meaningful value from the page URL, producing low-quality data on saved bookmarks
- **Fix:** Author now resolves from URL hostname (e.g., 'github' for github.com, 'web' as generic fallback)
- **Files modified:** extension content script / popup (see commits `9db5852`, `15ad200` for exact files)
- **Verification:** Human confirmed during Task 3 end-to-end test
- **Committed in:** `9db5852`, `15ad200` (separate fix commits applied during checkpoint)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug fix in author field resolution)
**Impact on plan:** Fix improves bookmark data quality. No scope creep from core AI-03 objective.

## Issues Encountered

None during planned tasks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- AI-03 requirement is closed: single-page save now routes through Claude for categorization, matching the bulk-save path established in Phase 02
- `resolveSaveCategories` in `singleSaveUtils.ts` is available for reuse in future phases
- Any remaining AI-0x requirements (phases 4-5) can follow the same pattern: extract pure helper, write tests, wire to `callClaudeProxy`

---
*Phase: 03-fix-ai03-single-save*
*Completed: 2026-03-14*
