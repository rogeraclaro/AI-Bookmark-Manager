---
phase: 02-chrome-tabs-feature
plan: "02"
subsystem: extension-popup
tags: [tabs, react, vitest, tdd, chrome-api]
dependency_graph:
  requires: [02-01]
  provides: [tabsUtils-pure-functions, tabs-viewstate-ui]
  affects: [extension/popup/popup.tsx, extension/popup/tabsUtils.ts]
tech_stack:
  added: [tabsUtils.ts]
  patterns: [pure-function-module, tdd-red-green, functional-state-immutability]
key_files:
  created:
    - extension/popup/tabsUtils.ts
  modified:
    - extension/popup/popup.tsx
    - extension/tests/tabs-filter.test.ts
    - extension/tests/tabs-selection.test.ts
    - extension/tests/tabs-save.test.ts
decisions:
  - "void operator used to satisfy TS strict unused-variable check for Plan 03 forward-imports (callClaudeProxy, tabStatuses) inside handleBulkSave stub"
metrics:
  duration: ~3min
  completed: "2026-03-13"
  tasks_completed: 2
  files_modified: 5
---

# Phase 02 Plan 02: Tabs View Implementation Summary

**One-liner:** Tabs ViewState as popup default — pure helper module (tabsUtils.ts) with all 17 vitest tests GREEN, plus full tabs UI in popup.tsx with filter bar, multi-select, and favicon rows.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | tabsUtils.ts pure helper functions (RED→GREEN) | 31585c6 | extension/popup/tabsUtils.ts, 3 test files |
| 2 | popup.tsx tabs ViewState as default with UI | b7a7e5a | extension/popup/popup.tsx |

## What Was Built

### tabsUtils.ts
Pure function module with zero React/Chrome API dependencies:
- `filterTabsByGroup(tabs, filter)` — 'all', 'ungrouped', or groupId number
- `hasGroups(tabs)` — true when any tab has groupId !== -1
- `toggleTabSelection(selectedIds, id)` — immutable Set toggle
- `selectAllVisible(visibleIds, selectedIds)` — Set union
- `deselectAllVisible(visibleIds, selectedIds)` — Set subtraction
- `getSelectionCount(selectedIds)` — selectedIds.size
- `buildTabBookmark(tab)` — Bookmark with ext_ id, Altres category default
- `getTabSaveSummary(statuses)` — { saved, failed } counts from Map
- `getFaviconUrl(pageUrl, size)` — chrome-extension favicon URL constructor
- `GROUP_COLOR_MAP` — TabGroupColor → Tailwind border-l-* class

### popup.tsx tabs view
- ViewState extended: `'tabs' | 'tabs-saving' | 'tabs-summary'` added
- `loadTabsData()` called on mount (tabs is default entry point, not form)
- Queries `chrome.tabs.query` + `chrome.tabGroups.query` + `getBookmarks()`
- Filters out `chrome://` and `chrome-extension://` URLs
- Marks tabs whose URL matches an existing bookmark as `alreadySaved`
- Group filter bar: hidden when no groups; shows [Totes][Sense grup][GroupName...] buttons
- Select-all checkbox: scopes to currently visible selectable tabs only
- Tab rows: checkbox + favicon (with letter-avatar fallback) + title/URL + ✓ guardat badge
- Colored left border (4px) for grouped tabs using GROUP_COLOR_MAP
- Save footer: disabled when 0 selected; confirm dialog before committing
- `handleBulkSave()` stub ready for Plan 03

## Verification Results

- 17/17 vitest tests pass (tabs-filter, tabs-selection, tabs-save)
- `npx tsc --noEmit` → zero errors
- `npm run build` → success (153.94 kB popup bundle)
- All pre-existing ViewState branches (loading, duplicate, success, error, form) preserved unchanged

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TS strict unused-variable errors for Plan 03 forward-imports**
- **Found during:** Task 2 verification (tsc --noEmit)
- **Issue:** Plan instructed importing `callClaudeProxy` and declaring `tabStatuses`/`setTabStatuses` for Plan 03, but TS strict mode (`TS6133`) flags them as unused
- **Fix:** Added `void tabStatuses; void setTabStatuses; void callClaudeProxy;` inside `handleBulkSave()` stub — minimal, non-breaking, makes intent explicit
- **Files modified:** extension/popup/popup.tsx
- **Commit:** b7a7e5a

## Self-Check: PASSED

- extension/popup/tabsUtils.ts: FOUND
- extension/popup/popup.tsx: FOUND
- .planning/phases/02-chrome-tabs-feature/02-02-SUMMARY.md: FOUND
- Commit 31585c6: FOUND
- Commit b7a7e5a: FOUND
