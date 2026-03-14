# Phase 3: Fix AI-03 — Wire Single-Save to Claude - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Restore Claude categorization for the single-page save form in `handleSave()` (popup.tsx). This is a regression fix — the bulk-save path (`handleBulkSave`) already calls `callClaudeProxy` correctly; the single-save path was not wired up. No new UI, no new endpoints, no new features.

</domain>

<decisions>
## Implementation Decisions

### Claude output scope
- Claude overrides **title + description + categories** — same pattern as `handleBulkSave`
- Input sent to Claude: user's current form values (`title` state, `description` state), not raw page metadata — user edits serve as context for Claude
- No special casing for user-edited vs unedited fields

### Category whitelist validation
- Filter Claude's returned categories against the known category list (same as bulk save)
- If filtered result is non-empty → use Claude's categories
- If filtered result is empty (all unknown) → fall back to **user's currently selected categories** (not 'Altres') — preserves the user's manual selection as the last resort
- If user had nothing selected AND Claude returns nothing valid → use 'Altres'

### Category picker gate
- **Remove** the "must select at least one category" validation guard (currently line 195–198)
- User can click Save with 0 categories selected — Claude will assign them
- Category picker in the form becomes optional, not required

### Proxy fallback (carried from Phase 1)
- If `callClaudeProxy` throws or proxy is unreachable → save with user's current selections (no crash, no error shown for proxy failure)
- This fallback was already decided in Phase 1 context — same behavior applies here

### Claude's Discretion
- Exact loading state messaging while Claude runs (vs while saving to API)
- Whether to show a brief "AI categorizing…" indicator or reuse the existing generic loading state

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `handleBulkSave()` (popup.tsx line 264): Reference implementation — call `callClaudeProxy({ url, title, description, categories })`, validate categories, apply `aiResult.title + description + categories`, send `SAVE_BOOKMARK`
- `callClaudeProxy` already imported in popup.tsx (line 4) — no new imports needed
- `buildTabBookmark` not needed for single-save — `handleSave()` builds the bookmark inline

### Established Patterns
- Category whitelist filtering: `aiResult.categories.filter(c => categories.includes(c))` — reuse exactly
- Fallback to 'Altres': `validCategories.length > 0 ? validCategories : ['Altres']` — adapt with user selection fallback
- Sequential async: single save doesn't need sequential loop (only one item)

### Integration Points
- `handleSave()` (line 183): Add `callClaudeProxy` call between duplicate check and bookmark construction
- `metadata` state contains the page URL needed for the proxy call (`metadata.url`)
- `categories` state (loaded in `loadData()`) is the whitelist for filtering
- Validation block at lines 195–198 (`if (selectedCategories.length === 0)`) — **remove this guard**

</code_context>

<specifics>
## Specific Ideas

- Claude call goes in `handleSave()`, after the duplicate check, before building the bookmark object — same position as bulk save
- Use `title` and `description` from React state (the user's form values) as inputs to `callClaudeProxy`, not `metadata.title`
- Fallback chain: Claude valid categories → user's `selectedCategories` → 'Altres'

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-fix-ai03-single-save*
*Context gathered: 2026-03-14*
