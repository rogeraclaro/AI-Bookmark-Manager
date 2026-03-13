# Phase 2: Chrome Tabs Feature - Research

**Researched:** 2026-03-13
**Domain:** Chrome Extensions MV3 — chrome.tabs API, chrome.tabGroups API, React popup state management, bulk async processing
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Tabs access point**
- Popup opens directly to the tabs view (tabs list is the default ViewState)
- A small 'Save this page' link/button in the yellow header navigates back to the current-page form
- The existing current-page save flow is preserved but secondary
- "Select all" checkbox in the list header selects/deselects all currently visible tabs (respects active group filter)
- Save button shows confirmation dialog ("Save X tabs?") before starting — prevents accidental bulk saves

**Tab filtering UI**
- Group filter shown as toggle buttons: [All] [Ungrouped] [Work] [Research] etc. — one per group + "All" + "Ungrouped"
- Selections persist when switching filters (user can select from Work group, switch to Research, add more — save button shows total count across all)
- Filter bar hidden entirely if the user has no Chrome tab groups (all tabs ungrouped)
- Tabs matching an existing bookmark URL show a '✓ saved' badge and are not selectable (prevents re-saves)

**Bulk save feedback**
- Per-tab inline status: each row shows its own state as processing happens (spinner → ✓ saved / ✗ failed)
- Popup stays open until all tabs are processed (no background handoff to service worker)
- After all tabs processed: summary screen shown — "X saved ✓, Y failed ✗" with failed tabs listed
- Summary screen includes a "Retry X failed" button that re-runs only failed tabs
- If all succeed with no failures: summary still shown (not auto-close)

**Tab card display**
- Each tab row: checkbox + favicon + title (bold) + truncated domain/URL on second line
- Grouped tabs show a colored left border matching the Chrome tab group color
- Popup has fixed height (approx 500px); tab list scrolls vertically within it — same pattern as category list
- 400px fixed popup width — maintain this

### Claude's Discretion
- Exact height of the popup and tab list scroll area
- Favicon fallback if Chrome doesn't provide one (letter avatar or generic icon)
- Exact wording of confirmation dialog and summary screen labels
- Order of tabs in the list (current tab first? alphabetical? browser order?)
- How to handle the chrome.tabGroups API permission if not already declared in manifest

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TABS-01 | New button or section in the extension popup to access open tabs | ViewState 'tabs' as default; existing loadData() replaced with loadTabsData() on mount |
| TABS-02 | User can filter tabs by Chrome group or view only ungrouped tabs | chrome.tabGroups.query() returns all groups with color+title; tab.groupId links tabs to groups; filter state kept in React |
| TABS-03 | User can select multiple tabs from the list | selectedTabIds: Set<number> state; checkbox per row; select-all scoped to visible filtered tabs |
| TABS-04 | Claude categorizes each selected tab and saves all as bookmarks (bulk) | Sequential callClaudeProxy() per tab in popup context; per-tab status state map; summary screen after all complete |
</phase_requirements>

---

## Summary

Phase 2 adds a Chrome tabs panel as the primary view of the extension popup. The implementation lives entirely in popup.tsx plus manifest.json permission additions — no new backend endpoints are needed. All Chrome API calls (tabs.query, tabGroups.query) run directly in the popup context, which has full access to the chrome namespace.

The two critical permission additions are `"tabs"` (to read tab URLs/titles across all windows) and `"tabGroups"` (to read group names and colors). The current manifest only has `"activeTab"`, `"storage"`, and `"scripting"` — `"activeTab"` alone is insufficient to query all tabs. Both new permissions are standard and have no exceptional approval friction on the Chrome Web Store for personal-use extensions.

The bulk save flow runs sequentially in the popup (one `callClaudeProxy()` call at a time), updating per-tab status state as each completes. This matches the locked decision that the popup stays open and no background handoff occurs. The existing `callClaudeProxy()` in `extension/shared/api.ts` is reused unchanged — it already never throws and has a 10-second timeout.

**Primary recommendation:** Add `"tabs"` and `"tabGroups"` to manifest permissions; add `"favicon"` for reliable favicon display; extend the ViewState union in popup.tsx; implement tabs load/filter/select/save/summary as new view branches within the existing pattern.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | 18.2.0 (already installed) | Popup UI — ViewState pattern, per-tab status map | Already in use; extension already built on it |
| chrome.tabs API | MV3 built-in | Query all open tabs with url/title/favIconUrl/groupId | Only API that provides this data in a Chrome extension |
| chrome.tabGroups API | Chrome 89+ built-in | Query tab group names and colors | Only API for group metadata; requires `"tabGroups"` permission |
| Tailwind CSS 3.4 | 3.4.0 (already installed) | Neo-brutalist styling consistent with existing popup | Already in use; no new dependency |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| chrome favicon helper URL | Built-in | `chrome-extension://ID/_favicon/?pageUrl=URL&size=16` | For rendering tab favicons reliably; requires `"favicon"` permission |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sequential per-tab Claude calls in popup | `Promise.all()` parallel | Sequential is simpler, avoids overwhelming the local proxy, shows real-time row-by-row progress — preferred |
| `chrome-extension://_favicon/` URL pattern | `tab.favIconUrl` directly | `tab.favIconUrl` can be empty or an `about:` URL for system pages; the `_favicon/` pattern is more reliable |
| Inline tabs ViewState in popup.tsx | Separate TabsView component file | Separate component is cleaner for 200+ lines; decision left to planner based on complexity |

**Installation:** No new npm packages needed. Only manifest.json permission additions.

---

## Architecture Patterns

### Recommended Project Structure

No new files strictly required. All new code fits within:

```
extension/
├── popup/
│   └── popup.tsx          # ViewState union extended; new 'tabs', 'tabs-saving', 'tabs-summary' states
├── shared/
│   ├── api.ts             # callClaudeProxy() reused unchanged; isDuplicate() reused
│   ├── config.ts          # New UI_STRINGS entries for tabs feature labels
│   └── types.ts           # New TabItem, TabStatus, TabGroupInfo interfaces
└── manifest.json          # Add "tabs", "tabGroups", "favicon" permissions
```

Optional split (if popup.tsx grows beyond ~500 lines):

```
extension/popup/
├── popup.tsx              # Orchestrates ViewState, delegates to sub-components
└── TabsView.tsx           # Self-contained tabs panel (load, filter, select, save, summary)
```

### Pattern 1: Extended ViewState Union

**What:** Add new view states for the tabs feature alongside existing ones.
**When to use:** All new view branches follow this exact pattern already established in popup.tsx.

```typescript
// Source: existing popup.tsx pattern, extended
type ViewState =
  | 'loading'
  | 'form'
  | 'duplicate'
  | 'success'
  | 'error'
  | 'tabs'          // NEW: tabs list with filter/select
  | 'tabs-saving'   // NEW: bulk save in progress (per-row status shown)
  | 'tabs-summary'; // NEW: all done — X saved, Y failed
```

### Pattern 2: Tab Data Shape

**What:** Normalized tab object that merges chrome.tabs.Tab with group metadata.
**When to use:** Load once on mount, pass through filter/selection/save pipeline.

```typescript
// Source: chrome.tabs API docs (developer.chrome.com/docs/extensions/reference/api/tabs)
interface TabItem {
  id: number;            // chrome.tabs.Tab.id — guaranteed non-null after query
  title: string;
  url: string;
  favIconUrl: string;    // may be empty; use _favicon/ fallback
  groupId: number;       // chrome.tabs.TAB_ID_NONE (-1) if ungrouped
  groupColor?: string;   // from TabGroup — for left border
  groupTitle?: string;   // from TabGroup — for filter button label
  alreadySaved: boolean; // checked against existing bookmarks via isDuplicate()
}
```

### Pattern 3: Load Tabs Data

**What:** On mount (when default ViewState is 'tabs'), query all tabs and all groups, then cross-reference with existing bookmarks.
**When to use:** Replaces the current `loadData()` for the primary view.

```typescript
// Source: chrome.tabs API + chrome.tabGroups API (developer.chrome.com)
async function loadTabsData() {
  // Requires "tabs" permission for url + title + favIconUrl
  const allTabs = await chrome.tabs.query({ currentWindow: true });

  // Requires "tabGroups" permission
  const allGroups = await chrome.tabGroups.query({ windowId: chrome.windows.WINDOW_ID_CURRENT });
  const groupMap = new Map(allGroups.map(g => [g.id, g]));

  // Get saved bookmark URLs for duplicate detection
  const savedResponse = await chrome.runtime.sendMessage({ type: 'GET_BOOKMARKS' });
  const savedUrls = new Set(savedResponse.data?.map((b: Bookmark) => b.originalLink) ?? []);

  const tabItems: TabItem[] = allTabs
    .filter(tab => tab.id != null && tab.url && !tab.url.startsWith('chrome://'))
    .map(tab => {
      const group = tab.groupId !== -1 ? groupMap.get(tab.groupId) : undefined;
      return {
        id: tab.id!,
        title: tab.title || tab.url!,
        url: tab.url!,
        favIconUrl: tab.favIconUrl || '',
        groupId: tab.groupId,
        groupColor: group?.color,
        groupTitle: group?.title,
        alreadySaved: savedUrls.has(tab.url!),
      };
    });

  setTabs(tabItems);
  setViewState('tabs');
}
```

### Pattern 4: Per-Tab Status Map During Bulk Save

**What:** A `Map<number, TabSaveStatus>` keyed by tab ID tracks each tab's processing state.
**When to use:** During the 'tabs-saving' ViewState. Each row renders from this map.

```typescript
// Source: established React pattern — no library needed
type TabSaveStatus = 'pending' | 'saving' | 'saved' | 'failed';

// State
const [tabStatuses, setTabStatuses] = useState<Map<number, TabSaveStatus>>(new Map());

// Update one entry without mutating
function setTabStatus(tabId: number, status: TabSaveStatus) {
  setTabStatuses(prev => new Map(prev).set(tabId, status));
}
```

### Pattern 5: Sequential Bulk Save

**What:** Process each selected tab one at a time, updating status after each.
**When to use:** The confirmation dialog confirmed, 'tabs-saving' ViewState is active.

```typescript
async function handleBulkSave(selectedIds: Set<number>) {
  setViewState('tabs-saving');
  const init = new Map([...selectedIds].map(id => [id, 'pending' as TabSaveStatus]));
  setTabStatuses(init);

  for (const tabId of selectedIds) {
    const tab = tabs.find(t => t.id === tabId)!;
    setTabStatus(tabId, 'saving');
    try {
      const { categories } = await callClaudeProxy({
        url: tab.url,
        title: tab.title,
        description: '',
      });
      const bookmark: Bookmark = {
        id: `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: tab.title,
        description: '',
        author: 'Extension',
        originalLink: tab.url,
        externalLinks: [],
        categories: categories.length > 0 ? categories : ['Altres'],
        createdAt: Date.now(),
      };
      await chrome.runtime.sendMessage({ type: 'SAVE_BOOKMARK', data: bookmark });
      setTabStatus(tabId, 'saved');
    } catch {
      setTabStatus(tabId, 'failed');
    }
  }
  setViewState('tabs-summary');
}
```

### Pattern 6: Favicon Display

**What:** Use Chrome's built-in `_favicon/` endpoint rather than `tab.favIconUrl` directly.
**When to use:** Every tab row that needs to render a favicon icon.

```typescript
// Source: https://developer.chrome.com/docs/extensions/how-to/ui/favicons
// Requires "favicon" in manifest permissions
function getFaviconUrl(pageUrl: string, size = 16): string {
  return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=${size}`;
}

// Fallback: letter avatar when favicon errors (onError handler)
function getLetterAvatar(title: string): string {
  return (title || '?')[0].toUpperCase();
}
```

### Anti-Patterns to Avoid

- **Querying all windows instead of currentWindow:** `chrome.tabs.query({})` returns tabs from ALL Chrome windows. Always pass `{ currentWindow: true }` unless the spec explicitly says otherwise. The CONTEXT.md says "all currently open Chrome tabs" — interpret as current window.
- **Calling callClaudeProxy in parallel for all tabs:** `Promise.all()` would send simultaneous requests to the local proxy subprocess; the proxy is single-threaded (one `claude -p` spawn at a time). Sequential is the correct pattern.
- **Forgetting to filter `chrome://` and `chrome-extension://` URLs:** These system tabs cannot be saved as bookmarks and will confuse Claude. Filter them out during `loadTabsData()`.
- **Using `tab.url` without the `"tabs"` permission:** Without the permission, `tab.url` and `tab.title` are `undefined`. The query returns tab objects but the sensitive fields are absent.
- **Mutating state Map directly:** `setTabStatuses(prev => { prev.set(id, status); return prev; })` does NOT trigger a re-render because the Map reference is the same. Always create a new Map.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Favicon image loading | Custom favicon fetch/cache | `chrome-extension://ID/_favicon/?pageUrl=URL` | Chrome handles redirect, caching, and size; custom fetch requires host permissions per-domain |
| Duplicate URL detection | New message type + logic | Existing `isDuplicate()` in `api.ts` via `GET_BOOKMARKS` message | Already implemented and tested in Phase 1 |
| Tab-to-group mapping | Custom groupId tracking | `chrome.tabGroups.query()` returns full group objects | API provides everything needed; no custom data structure required |
| Save per-tab bookmark | Custom save logic | Existing `SAVE_BOOKMARK` message handler in service-worker.ts | Already handles Claude proxy call + API save + cache invalidation |

**Key insight:** The service worker already does `callClaudeProxy() → saveBookmark()` for the single-tab flow. The bulk save in the popup is structurally identical — just called N times sequentially. Do not add a new `SAVE_BULK_TABS` message type; the existing `SAVE_BOOKMARK` message covers each tab individually.

---

## Common Pitfalls

### Pitfall 1: Missing "tabs" Permission — Silent Data Loss
**What goes wrong:** `chrome.tabs.query({ currentWindow: true })` succeeds but returns Tab objects with `url: undefined`, `title: undefined`, `favIconUrl: undefined`. No error thrown.
**Why it happens:** These four fields are "sensitive" and silently omitted without the permission. The extension currently only has `"activeTab"`.
**How to avoid:** Add `"tabs"` to the manifest `"permissions"` array. Verify after build that `tab.url` is populated.
**Warning signs:** Tab list renders with empty titles and no URLs.

### Pitfall 2: chrome.tabGroups.query() Fails on Ungrouped-Only Windows
**What goes wrong:** If Chrome has no tab groups in the current window, `chrome.tabGroups.query()` returns an empty array — that's fine. BUT if `"tabGroups"` is not in the manifest, the call throws `"chrome.tabGroups is undefined"`.
**Why it happens:** `chrome.tabGroups` is gated behind the `"tabGroups"` permission; the namespace itself doesn't exist without it.
**How to avoid:** Add `"tabGroups"` to manifest permissions. The CONTEXT.md decision (filter bar hidden when no groups) still applies — the query result being empty is the normal case.
**Warning signs:** Runtime error on popup open: `Cannot read properties of undefined (reading 'query')`.

### Pitfall 3: Popup Stays Open — No Auto-Close During Bulk Save
**What goes wrong:** If the developer accidentally adds `window.close()` after save (following the existing single-tab success pattern), the popup closes mid-processing.
**Why it happens:** The existing single-tab success path calls `setTimeout(() => window.close(), 1000)`. This pattern must NOT be copied into the bulk save path.
**How to avoid:** The 'tabs-saving' and 'tabs-summary' ViewStates must never call `window.close()`. Only a user-initiated "Close" button on the summary screen closes the popup.
**Warning signs:** Popup disappears before all tabs are processed.

### Pitfall 4: `chrome://` Tabs Cause Claude Proxy Errors
**What goes wrong:** Tabs like `chrome://newtab/`, `chrome://settings/`, `chrome-extension://...` appear in `chrome.tabs.query()` results. Sending them to Claude or the API produces meaningless categories.
**Why it happens:** `chrome.tabs.query()` returns ALL tabs including Chrome system pages.
**How to avoid:** Filter during `loadTabsData()`: `tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')`.
**Warning signs:** Tabs labeled "New Tab" or "Extensions" appear in the list; Claude returns empty/odd categories.

### Pitfall 5: selectedTabIds Includes Already-Saved or Filtered-Out Tabs
**What goes wrong:** If a user has selected tabs, then the filter narrows the view, and they hit "Save", the save loop processes tabs not visible in the current filter.
**Why it happens:** The CONTEXT.md decision says selections persist across filter switches (intentional). But "Select All" must only apply to currently visible tabs.
**How to avoid:** The "Select All" checkbox header applies `selectAll(visibleTabIds)`. The Save button count and the save loop both operate on `selectedTabIds` globally (all selected, regardless of current filter). This is correct per spec — document it clearly.
**Warning signs:** User confusion about why more tabs were saved than visible.

### Pitfall 6: Service Worker Bulk Save Race Condition
**What goes wrong:** If multiple `SAVE_BOOKMARK` messages are dispatched simultaneously (e.g., using `Promise.all`), `saveBookmark()` in `api.ts` does GET-all → append → POST-all. Two concurrent calls both GET the same list, both append their item, and one overwrites the other.
**Why it happens:** `saveBookmark()` is a read-modify-write operation; it is not atomic.
**How to avoid:** Sequential processing (one `await chrome.runtime.sendMessage(SAVE_BOOKMARK)` at a time) prevents this. Never parallelize. This is an existing architectural constraint.
**Warning signs:** Fewer bookmarks saved than expected; some tabs' bookmarks disappear.

---

## Code Examples

Verified patterns from official sources:

### Query All Tabs in Current Window
```typescript
// Source: https://developer.chrome.com/docs/extensions/reference/api/tabs
// Requires "tabs" permission in manifest for url/title/favIconUrl fields
const tabs = await chrome.tabs.query({ currentWindow: true });
// tab.groupId === -1 (chrome.tabs.TAB_ID_NONE) means the tab is ungrouped
```

### Query All Tab Groups in Current Window
```typescript
// Source: https://developer.chrome.com/docs/extensions/reference/api/tabGroups
// Requires "tabGroups" permission in manifest
const groups = await chrome.tabGroups.query({ windowId: chrome.windows.WINDOW_ID_CURRENT });
// TabGroup: { id, windowId, title?, color, collapsed, shared? }
// Colors: "grey"|"blue"|"red"|"yellow"|"green"|"pink"|"purple"|"cyan"|"orange"
```

### Favicon URL Pattern
```typescript
// Source: https://developer.chrome.com/docs/extensions/how-to/ui/favicons
// Requires "favicon" permission in manifest
const faviconUrl = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(tab.url)}&size=16`;
```

### Manifest Permissions Addition
```json
// Source: https://developer.chrome.com/docs/extensions/reference/permissions-list
"permissions": [
  "activeTab",
  "storage",
  "scripting",
  "tabs",
  "tabGroups",
  "favicon"
]
```

### Tab Group Color to Tailwind CSS Border
```typescript
// Maps TabGroup.color values to Tailwind border color classes
// Source: chrome.tabGroups color enum (developer.chrome.com)
const GROUP_COLOR_MAP: Record<string, string> = {
  grey:   'border-l-gray-400',
  blue:   'border-l-blue-500',
  red:    'border-l-red-500',
  yellow: 'border-l-yellow-400',
  green:  'border-l-green-500',
  pink:   'border-l-pink-400',
  purple: 'border-l-purple-500',
  cyan:   'border-l-cyan-400',
  orange: 'border-l-orange-500',
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `activeTab` only (current state of manifest) | `"tabs"` permission for all-tabs access | Must add in Phase 2 | Enables querying all open tab URLs/titles |
| `chrome.tabGroups` (MV2 not available) | `chrome.tabGroups` stable in Chrome 89+ MV3 | Chrome 89 (2021) | Tab group name/color accessible via API |
| `chrome-extension://_favicon/` undocumented internal | `"favicon"` permission + documented URL pattern | Chrome 119+ formalized | Reliable favicon access without host permissions |

**Deprecated/outdated:**
- Direct `tab.favIconUrl` for display: unreliable (empty for system pages, blob URLs on some sites); use the `_favicon/` pattern instead.
- `chrome.tabGroups` in MV2: does not exist there; only MV3.

---

## Open Questions

1. **Should `GET_BOOKMARKS` be added as a new service worker message type?**
   - What we know: The service worker currently handles `CHECK_DUPLICATE` (checks one URL) but there is no message to get the full bookmark list for bulk pre-checking.
   - What's unclear: Whether to add `GET_BOOKMARKS` to the service worker, or to call the API directly from the popup via `getBookmarks()` from `api.ts`.
   - Recommendation: Call `getBookmarks()` from `api.ts` directly in the popup's `loadTabsData()` — it's already exported and avoids adding a new message type. This is the simpler path.

2. **Tab ordering in the list**
   - What we know: CONTEXT.md marks this as Claude's discretion.
   - What's unclear: Chrome's `chrome.tabs.query()` returns tabs in their current window order (left to right by position). The active tab is not necessarily first.
   - Recommendation: Use browser tab order (the default query result order). It is the most natural and requires no sorting. Optionally move the active tab to the top — it is the most recently focused and contextually relevant.

3. **Popup height constraint with many tabs**
   - What we know: Popup has fixed 400px width; CONTEXT.md says ~500px height with scrollable tab list.
   - What's unclear: Chrome's maximum popup height is 600px. A `max-height` on the tab list container with `overflow-y-auto` is the correct approach.
   - Recommendation: Set popup wrapper to `max-h-[580px]`; tab list scroll area to `flex-1 overflow-y-auto` within a flex column layout.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | No test framework installed in the extension package (no vitest/jest in extension/package.json) |
| Config file | None — Wave 0 must add vitest if tests are needed |
| Quick run command | `cd extension && npx vitest run --reporter=verbose` (after Wave 0 install) |
| Full suite command | `cd extension && npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TABS-01 | Popup loads with 'tabs' as default ViewState, not 'form' | unit (component) | manual-only — requires Chrome extension context | ❌ Wave 0 |
| TABS-02 | Filter by group shows only tabs with matching groupId | unit | `npx vitest run extension/tests/tabs-filter.test.ts` | ❌ Wave 0 |
| TABS-03 | Checkbox selection; select-all scoped to visible; count updates | unit | `npx vitest run extension/tests/tabs-selection.test.ts` | ❌ Wave 0 |
| TABS-04 | Bulk save calls callClaudeProxy per tab sequentially; summary shows correct counts | unit | `npx vitest run extension/tests/tabs-save.test.ts` | ❌ Wave 0 |

**Note on TABS-01:** The default ViewState change is trivially verified by code inspection; the test value is low. The filter, selection, and save logic (TABS-02/03/04) are pure functions that can be unit tested without a real Chrome context by mocking `chrome.tabs.query` and `callClaudeProxy`.

### Sampling Rate
- **Per task commit:** `cd extension && npx vitest run --reporter=verbose` (if Wave 0 scaffold exists)
- **Per wave merge:** `cd extension && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `extension/tests/tabs-filter.test.ts` — covers TABS-02 (filter logic as pure function)
- [ ] `extension/tests/tabs-selection.test.ts` — covers TABS-03 (toggle, select-all, count)
- [ ] `extension/tests/tabs-save.test.ts` — covers TABS-04 (sequential save, status updates, summary counts)
- [ ] Framework install: `cd extension && npm install --save-dev vitest @vitest/ui jsdom` — vitest not present in extension/package.json

---

## Sources

### Primary (HIGH confidence)
- [chrome.tabs API — developer.chrome.com](https://developer.chrome.com/docs/extensions/reference/api/tabs) — Tab object shape, groupId field, permissions required for sensitive properties, TAB_ID_NONE
- [chrome.tabGroups API — developer.chrome.com](https://developer.chrome.com/docs/extensions/reference/api/tabGroups) — TabGroup interface, color enum, query method, required `"tabGroups"` permission
- [Fetching favicons — developer.chrome.com](https://developer.chrome.com/docs/extensions/how-to/ui/favicons) — `chrome-extension://_favicon/` URL pattern, `"favicon"` permission requirement

### Secondary (MEDIUM confidence)
- Existing codebase: `extension/popup/popup.tsx` — ViewState pattern, checkbox-label pattern, neo-brutalist styling conventions
- Existing codebase: `extension/shared/api.ts` — `callClaudeProxy()`, `getBookmarks()`, `isDuplicate()` — all reusable unchanged
- Existing codebase: `extension/background/service-worker.ts` — `SAVE_BOOKMARK` message handler already does Claude proxy + save + cache invalidation

### Tertiary (LOW confidence)
- None — all critical claims verified with official Chrome extension documentation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all APIs are official Chrome MV3; no third-party dependencies added
- Architecture: HIGH — ViewState pattern and service worker message pattern directly observed in existing code
- Pitfalls: HIGH — permissions issue verified against official docs; race condition is structural/documented

**Research date:** 2026-03-13
**Valid until:** 2026-09-13 (Chrome extension APIs are stable; `chrome.tabGroups` has been stable since Chrome 89)
