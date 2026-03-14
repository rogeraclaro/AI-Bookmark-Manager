# Phase 2: Chrome Tabs Feature - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a Chrome tabs section to the existing extension popup: list all currently open tabs, allow filtering by Chrome tab group, multi-select tabs via checkboxes, and bulk-save the selected tabs as AI-categorized bookmarks via Claude.

Scope: changes to popup.tsx, new service worker message types, chrome.tabs API usage, Claude proxy calls per tab. No new backend endpoints, no background processing outside the popup lifecycle.

</domain>

<decisions>
## Implementation Decisions

### Tabs access point
- Popup opens directly to the tabs view (tabs list is the default ViewState)
- A small 'Save this page' link/button in the yellow header navigates back to the current-page form
- The existing current-page save flow is preserved but secondary
- "Select all" checkbox in the list header selects/deselects all currently visible tabs (respects active group filter)
- Save button shows confirmation dialog ("Save X tabs?") before starting — prevents accidental bulk saves

### Tab filtering UI
- Group filter shown as toggle buttons: [All] [Ungrouped] [Work] [Research] etc. — one per group + "All" + "Ungrouped"
- Selections persist when switching filters (user can select from Work group, switch to Research, add more — save button shows total count across all)
- Filter bar hidden entirely if the user has no Chrome tab groups (all tabs ungrouped)
- Tabs matching an existing bookmark URL show a '✓ saved' badge and are not selectable (prevents re-saves)

### Bulk save feedback
- Per-tab inline status: each row shows its own state as processing happens (spinner → ✓ saved / ✗ failed)
- Popup stays open until all tabs are processed (no background handoff to service worker)
- After all tabs processed: summary screen shown — "X saved ✓, Y failed ✗" with failed tabs listed
- Summary screen includes a "Retry X failed" button that re-runs only failed tabs
- If all succeed with no failures: summary still shown (not auto-close)

### Tab card display
- Each tab row: checkbox + favicon + title (bold) + truncated domain/URL on second line
- Grouped tabs show a colored left border matching the Chrome tab group color
- Popup has fixed height (approx 500px); tab list scrolls vertically within it — same pattern as category list

### Claude's Discretion
- Exact height of the popup and tab list scroll area
- Favicon fallback if Chrome doesn't provide one (letter avatar or generic icon)
- Exact wording of confirmation dialog and summary screen labels
- Order of tabs in the list (current tab first? alphabetical? browser order?)
- How to handle the chrome.tabGroups API permission if not already declared in manifest

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `popup.tsx` ViewState pattern: add `'tabs'` as the new default state alongside existing `'loading' | 'form' | 'duplicate' | 'success' | 'error'`
- `extension/shared/api.ts`: `callClaudeProxy()` from Phase 1 — each tab save calls this with tab URL/title/description
- Category checkbox grid pattern (existing) — reuse the `toggleCategory` + checkbox-label pattern for tab selection
- `chrome.runtime.sendMessage` + `chrome.tabs.query` — already used in popup; chrome.tabs API available in MV3 popup context

### Established Patterns
- Neo-brutalist design: yellow header (`bg-yellow-400 border-b-2 border-black`), black borders (`border-2 border-black`), `font-bold uppercase` labels
- Error display: `bg-red-100 border-2 border-red-500 p-2 text-red-700 text-sm font-mono`
- Success display: `bg-green-400 border-2 border-black`
- Status states rendered as separate JSX returns from ViewState — add new states without breaking existing ones
- 400px fixed popup width — maintain this for tabs view

### Integration Points
- `popup.tsx`: new `'tabs'` ViewState as default; existing `'form'` ViewState reachable via header link
- `extension/background/service-worker.ts`: may need new message types (`GET_TABS`, `SAVE_BULK_TABS`) or Claude calls can happen directly in popup
- `extension/shared/config.ts`: UI strings for tabs feature labels, filter labels, confirmation/summary copy
- `extension/manifest.json`: ensure `tabs` and `tabGroups` permissions declared

</code_context>

<specifics>
## Specific Ideas

- Tabs view is the primary mode — the existing "save this page" flow becomes secondary, accessible via a small link in the header
- Confirmation before save (not after selection) — the checkbox UI already signals intent, confirmation is a last check against accidental bulk saves
- Keep selections across group filter switches — allows curating from multiple groups before saving
- Already-saved tabs shown but disabled with '✓ saved' badge — user awareness without clutter

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-chrome-tabs-feature*
*Context gathered: 2026-03-13*
