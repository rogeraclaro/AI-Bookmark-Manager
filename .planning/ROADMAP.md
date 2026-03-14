# Roadmap: AI Bookmark Manager

## Overview

This milestone replaces Gemini with Claude as the AI provider (via a local proxy server that leverages the Claude Code CLI session) and adds a bulk-tabs feature to the Chrome extension. Two phases: first make the AI layer work end-to-end with Claude, then add the new capture capability on top.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Claude Proxy** - Build local proxy server and replace Gemini with Claude across the full stack (completed 2026-03-12)
- [x] **Phase 2: Chrome Tabs Feature** - Add bulk tab selection and AI categorization to the extension popup (completed 2026-03-13)

## Phase Details

### Phase 1: Claude Proxy
**Goal**: All AI processing (tweet imports and webpage categorization) runs through a local Claude proxy instead of Gemini
**Depends on**: Nothing (first phase)
**Requirements**: PROXY-01, PROXY-02, PROXY-03, PROXY-04, AI-01, AI-02, AI-03, AI-04
**Success Criteria** (what must be TRUE):
  1. User can import a Twitter JSON export and all tweets are categorized, titled, and described by Claude (not Gemini)
  2. User can save a webpage from the Chrome extension and it is automatically categorized by Claude
  3. The proxy server starts automatically at login on both Macs via LaunchAgent without manual intervention
  4. When the proxy is unreachable, bookmarks are saved without AI metadata (graceful fallback, no crash)
**Plans**: 4 plans

Plans:
- [ ] 01-01-PLAN.md — Test scaffold (proxy unit tests + plist smoke test)
- [ ] 01-02-PLAN.md — Proxy server: Express /categorize + /process-tweet + LaunchAgent setup
- [ ] 01-03-PLAN.md — claudeService.ts drop-in replacement + App.tsx wiring
- [ ] 01-04-PLAN.md — Extension: callClaudeProxy + manifest host_permissions + human verify

### Phase 2: Chrome Tabs Feature
**Goal**: User can select multiple open Chrome tabs and save them all as AI-categorized bookmarks in one action
**Depends on**: Phase 1
**Requirements**: TABS-01, TABS-02, TABS-03, TABS-04
**Success Criteria** (what must be TRUE):
  1. User sees a tabs section in the extension popup showing all currently open Chrome tabs
  2. User can filter the tab list by Chrome group or view only ungrouped tabs
  3. User can select multiple tabs via checkboxes and trigger a single bulk-save action
  4. All selected tabs are saved as bookmarks with Claude-generated categories and titles
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md — Manifest permissions + type contracts + vitest scaffold (TDD RED baseline)
- [x] 02-02-PLAN.md — tabsUtils.ts pure functions (tests GREEN) + popup.tsx tabs view (load/filter/select)
- [x] 02-03-PLAN.md — Bulk save loop + tabs-saving + tabs-summary views + human verify

### Phase 3: Fix AI-03 — Wire Single-Save to Claude
**Goal:** Restore Claude categorization for the single-page save form in the extension (regression from Phase 2 commit 0352d1b)
**Depends on:** Phase 2
**Requirements:** AI-03
**Gap Closure:** Closes AI-03 requirement gap, integration gap (handleSave -> callClaudeProxy), and broken E2E flow "Extension single-page save with Claude categorization"
**Plans**: 1 plan

Plans:
- [ ] 03-01-PLAN.md — resolveSaveCategories helper (TDD) + wire handleSave() to callClaudeProxy + human verify

### Phase 4: Nyquist Validation
**Goal:** Phases 1, 2, and 3 all achieve Nyquist validation compliance
**Depends on:** Phase 3
**Requirements:** (non-functional — process compliance)
**Gap Closure:** Phase 1 VALIDATION.md fixed (nyquist_compliant: false -> true); Phase 2 and Phase 3 VALIDATION.md created
**Plans**: 1 plan

Plans:
- [ ] 04-01-PLAN.md — Rewrite Phase 1 VALIDATION.md + create Phase 2 and Phase 3 VALIDATION.md files

### Phase 5: Tech Debt Cleanup
**Goal:** Remove Gemini-era dead code and unused type dead code accumulated during migration
**Depends on:** Phase 4
**Requirements:** (non-functional — code hygiene)
**Gap Closure:** TrialCountdown.tsx Gemini import removed; GET_BOOKMARKS dead type pruned from types.ts

Plans:
- [ ] 05-01-PLAN.md — Remove TrialCountdown Gemini import + GET_BOOKMARKS dead type

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Claude Proxy | 4/4 | Complete   | 2026-03-13 |
| 2. Chrome Tabs Feature | 3/3 | Complete   | 2026-03-13 |
| 3. Fix AI-03 — Wire Single-Save to Claude | 1/1 | Complete   | 2026-03-14 |
| 4. Nyquist Validation | 0/1 | Pending | — |
| 5. Tech Debt Cleanup | 0/1 | Pending | — |
