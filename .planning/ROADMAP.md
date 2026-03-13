# Roadmap: AI Bookmark Manager

## Overview

This milestone replaces Gemini with Claude as the AI provider (via a local proxy server that leverages the Claude Code CLI session) and adds a bulk-tabs feature to the Chrome extension. Two phases: first make the AI layer work end-to-end with Claude, then add the new capture capability on top.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Claude Proxy** - Build local proxy server and replace Gemini with Claude across the full stack (completed 2026-03-12)
- [ ] **Phase 2: Chrome Tabs Feature** - Add bulk tab selection and AI categorization to the extension popup

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
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Claude Proxy | 4/4 | Complete   | 2026-03-13 |
| 2. Chrome Tabs Feature | 0/TBD | Not started | - |
