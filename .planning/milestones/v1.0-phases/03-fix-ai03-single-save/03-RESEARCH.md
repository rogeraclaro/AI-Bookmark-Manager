# Phase 3: Fix AI-03 — Wire Single-Save to Claude - Research

**Researched:** 2026-03-14
**Domain:** Chrome Extension — React popup, async state flow, Claude proxy integration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Claude overrides **title + description + categories** — same pattern as `handleBulkSave`
- Input sent to Claude: user's current form values (`title` state, `description` state), not raw page metadata
- No special casing for user-edited vs unedited fields
- Category whitelist: filter Claude's returned categories against the known list; if filtered result is non-empty → use Claude's categories; if empty → fall back to user's currently selected categories; if user had nothing selected AND Claude returns nothing valid → use 'Altres'
- **Remove** the "must select at least one category" validation guard (lines 195–198 in popup.tsx)
- Category picker becomes optional, not required
- If `callClaudeProxy` throws or proxy is unreachable → save with user's current selections (no crash, no error shown for proxy failure)

### Claude's Discretion

- Exact loading state messaging while Claude runs (vs while saving to API)
- Whether to show a brief "AI categorizing…" indicator or reuse the existing generic loading state

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AI-03 | La categorització de pàgines web al guardar des de l'extensió funciona via Claude | `callClaudeProxy` is already imported in popup.tsx (line 4). `handleBulkSave` (line 264) is the proven reference implementation. The integration point is `handleSave()` (line 183), specifically after the duplicate check (line 208-217) and before the bookmark object is built (line 220). |
</phase_requirements>

---

## Summary

Phase 3 is a surgical regression fix: the single-page save path (`handleSave()` in `extension/popup/popup.tsx`) never wired up `callClaudeProxy`, while the bulk-save path (`handleBulkSave`) introduced in Phase 2 did. The fix is a pure insertion into an existing function — no new files, no new imports, no architectural changes.

All building blocks are already in place. `callClaudeProxy` is imported on line 4. The `categories` whitelist is loaded from `loadData()` and stored in state. The `metadata.url`, `title` state, and `description` state are all available at the point of integration. The reference pattern in `handleBulkSave` (lines 298–326) can be ported almost verbatim, simplified by removing the tweet-specific branching (single-save is always a web page).

The only functional change beyond inserting the proxy call is: (1) removing the "must select at least one category" guard (lines 195–198) since Claude will assign categories, and (2) implementing the three-tier fallback chain (Claude valid categories → user `selectedCategories` → 'Altres') instead of the current direct use of `selectedCategories`.

**Primary recommendation:** Copy the Claude call + whitelist filter from `handleBulkSave`, adapt the fallback chain per CONTEXT.md decisions, remove the validation guard, and insert at line 218 (after duplicate check, before bookmark construction).

---

## Standard Stack

### Core (already installed, no changes needed)

| Library/API | Version | Purpose | Location |
|-------------|---------|---------|---------|
| React 18 | ^18.2.0 | Component state, async handlers | `extension/package.json` |
| TypeScript | ^5.3.3 | Type safety across the change | `extension/package.json` |
| `callClaudeProxy` | internal | Sends page data to local proxy, always resolves | `extension/shared/api.ts` |
| Chrome runtime messaging | MV3 | `SAVE_BOOKMARK` dispatch to background | popup.tsx line 232 |

**No new installations required.**

---

## Architecture Patterns

### Current `handleSave()` Flow (as-is)

```
handleSave()
  ├── Validation: !title → error
  ├── Validation: title > 80 chars → error
  ├── Validation: selectedCategories.length === 0 → error  ← REMOVE THIS
  ├── Validation: !metadata → error
  ├── setViewState('loading')
  ├── CHECK_DUPLICATE → if duplicate → setViewState('duplicate')
  ├── Build Bookmark object (uses selectedCategories directly)
  ├── SAVE_BOOKMARK → if error → throw
  └── setViewState('success') + setTimeout(window.close, 1000)
```

### Target `handleSave()` Flow (after fix)

```
handleSave()
  ├── Validation: !title → error
  ├── Validation: title > 80 chars → error
  ├── [REMOVED] selectedCategories.length === 0 guard
  ├── Validation: !metadata → error
  ├── setViewState('loading')
  ├── CHECK_DUPLICATE → if duplicate → setViewState('duplicate')
  ├── [NEW] callClaudeProxy({ url: metadata.url, title, description, categories })
  ├── [NEW] whitelist filter → validCategories → 3-tier fallback
  ├── Build Bookmark object (uses final resolved categories)
  ├── SAVE_BOOKMARK → if error → throw
  └── setViewState('success') + setTimeout(window.close, 1000)
```

### Pattern: Claude Call + Whitelist Filter (from `handleBulkSave`)

```typescript
// Source: extension/popup/popup.tsx lines 298–326 (handleBulkSave)
const aiResult = await callClaudeProxy({
  url: metadata.url,          // from metadata state
  title: title,               // from title state (user's current value)
  description: description,   // from description state (user's current value)
  categories,                 // from categories state (whitelist)
});

// Whitelist: only keep categories Claude invented that actually exist
const validCategories = aiResult.categories.filter(c => categories.includes(c));

// 3-tier fallback (AI-03 spec from CONTEXT.md):
// 1. Claude's valid categories (non-empty after whitelist)
// 2. User's selected categories (their manual picks)
// 3. 'Altres' (universal fallback)
const finalCategories =
  validCategories.length > 0
    ? validCategories
    : selectedCategories.length > 0
      ? selectedCategories
      : ['Altres'];
```

Note: `callClaudeProxy` **never throws** (catches internally, returns `{ categories: [] }` on proxy failure). The fallback chain handles this case automatically — empty Claude result → user's `selectedCategories` → 'Altres'.

### Pattern: Removing the Validation Guard

Lines 195–198 in current `handleSave()`:

```typescript
// REMOVE this block entirely:
if (selectedCategories.length === 0) {
  setError(ERRORS.NO_CATEGORY);
  return;
}
```

After removal, `ERRORS.NO_CATEGORY` string in `config.ts` becomes unused. Do not delete it (out of scope per CONTEXT.md scope discipline — project-wide grep needed first).

### Integration Point

Insert the Claude call at line 218 — the exact gap between the duplicate check return and the bookmark object construction:

```typescript
// Line 217: duplicate check block ends here
// ← INSERT callClaudeProxy block here
// Line 220: const bookmark: Bookmark = { ...
```

### Anti-Patterns to Avoid

- **Do not** use `metadata.title` as input to the proxy — the user may have edited `title` state; use `title` (the state variable).
- **Do not** use `Promise.all` — there is only one item; sequential await is correct and simpler.
- **Do not** wrap the Claude call in a try/catch for proxy errors — `callClaudeProxy` already handles this internally and always resolves.
- **Do not** add a separate `catch` branch that shows an error for proxy failure — the fallback chain is silent, per Phase 1 decision.
- **Do not** modify `loadData()` — `categories` state is already populated there via `chrome.runtime.sendMessage({ type: 'GET_CATEGORIES' })`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Proxy call with timeout + error handling | Custom fetch wrapper | `callClaudeProxy` (already imported) | Already has 30s timeout, ECONNREFUSED catch, always-resolves contract |
| Category validation | Custom filter logic | `aiResult.categories.filter(c => categories.includes(c))` — exact pattern from handleBulkSave | One-liner; battle-tested in Phase 2 |
| Fallback category selection | Custom logic | Inline ternary chain — see pattern above | Simple, readable, matches established pattern |

---

## Common Pitfalls

### Pitfall 1: Using `metadata.title` Instead of `title` State
**What goes wrong:** Claude receives the original page title, not what the user typed in the form.
**Why it happens:** Both `metadata.title` and `title` (state) exist in scope; easy to grab the wrong one.
**How to avoid:** Always use `title` (state variable) and `description` (state variable) as inputs, as specified in CONTEXT.md.
**Warning signs:** The user edits the title field → Claude categorizes with the unedited page title.

### Pitfall 2: Forgetting to Remove the Validation Guard
**What goes wrong:** User can never save without selecting a category manually, defeating the purpose of the fix.
**Why it happens:** Guard is at lines 195–198, before the Claude call insertion point — easy to miss since it's in a different block.
**How to avoid:** Remove the `selectedCategories.length === 0` guard as the first edit, before adding the Claude call.
**Warning signs:** Clicking Save with no categories selected still shows "Selecciona almenys una categoria" error.

### Pitfall 3: Incorrect Fallback Order
**What goes wrong:** User's manual category selections are ignored even when Claude fails.
**Why it happens:** Copying `handleBulkSave`'s `validCategories.length > 0 ? validCategories : ['Altres']` pattern directly — it uses 'Altres' as immediate fallback, not user selections.
**How to avoid:** Add the intermediate tier: `validCategories.length > 0 ? validCategories : selectedCategories.length > 0 ? selectedCategories : ['Altres']`.
**Warning signs:** User pre-selects categories → proxy is down → bookmark saved with 'Altres' instead of user's selection.

### Pitfall 4: aiResult.title/description Handling
**What goes wrong:** Claude's improved title/description are not applied to the saved bookmark.
**Why it happens:** In `handleBulkSave`, `aiResult.title || base.title` applies the override. Easy to forget in the single-save path.
**How to avoid:** Per CONTEXT.md decision, Claude overrides title + description + categories — all three fields must be pulled from `aiResult`.
**Warning signs:** Bookmark saved with user's draft title/description even when Claude returned improvements.

---

## Code Examples

### Complete Integration Block (ready for insertion at line 218)

```typescript
// Source: derived from handleBulkSave pattern (popup.tsx line 298-326)
const aiResult = await callClaudeProxy({
  url: metadata.url,
  title,
  description,
  categories,
});

const validCategories = aiResult.categories.filter(c => categories.includes(c));
const finalCategories =
  validCategories.length > 0
    ? validCategories
    : selectedCategories.length > 0
      ? selectedCategories
      : ['Altres'];

// Apply Claude's title and description overrides
const finalTitle = aiResult.title || title.trim();
const finalDescription = aiResult.description || description.trim();
```

Then the bookmark construction becomes:

```typescript
const bookmark: Bookmark = {
  id: `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  title: finalTitle,
  description: finalDescription,
  author: metadata.author || 'Extension',
  originalLink: metadata.url,
  externalLinks: [],
  categories: finalCategories,
  createdAt: Date.now()
};
```

### `callClaudeProxy` Signature (for reference)

```typescript
// Source: extension/shared/api.ts lines 90-109
callClaudeProxy(data: {
  url: string;
  title: string;
  description: string;
  categories?: string[];
}): Promise<{ categories: string[]; title?: string; description?: string }>
// Always resolves. Returns { categories: [] } when proxy is unreachable.
```

---

## State of the Art

| Old Approach | Current Approach | Status |
|--------------|-----------------|--------|
| `handleSave` uses selectedCategories directly | `handleSave` calls Claude, then applies whitelist + fallback | This phase fixes the regression |
| Category picker required before save | Category picker optional — Claude assigns | This phase removes the guard |
| Gemini categorization | Claude via local proxy | Already done in Phase 1 |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest ^1.6.1 |
| Config file | `extension/vitest.config.ts` |
| Quick run command | `cd extension && npm test` |
| Full suite command | `cd extension && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-03 | Claude proxy is called for single-page save | unit | `cd /Users/rogermasellas/AI/AI\ Bookmark\ Manager/ai-bookmarks/extension && npm test -- tests/single-save.test.ts` | ❌ Wave 0 |
| AI-03 | Whitelist filter: Claude categories validated against known list | unit | `cd /Users/rogermasellas/AI/AI\ Bookmark\ Manager/ai-bookmarks/extension && npm test -- tests/single-save.test.ts` | ❌ Wave 0 |
| AI-03 | Fallback chain: empty Claude → user selection → 'Altres' | unit | `cd /Users/rogermasellas/AI/AI\ Bookmark\ Manager/ai-bookmarks/extension && npm test -- tests/single-save.test.ts` | ❌ Wave 0 |
| AI-03 | Removed validation guard: save allowed with 0 selected categories | unit | `cd /Users/rogermasellas/AI/AI\ Bookmark\ Manager/ai-bookmarks/extension && npm test -- tests/single-save.test.ts` | ❌ Wave 0 |

Note: `handleSave` is a React component method in popup.tsx. The most effective test approach for Phase 2's pattern was testing pure utility functions extracted from the component (`tabsUtils.ts`). For this phase, the fallback logic can be extracted to a pure helper function in a similar `singleSaveUtils.ts` to enable unit testing, or tested inline via mocks.

### Sampling Rate

- **Per task commit:** `cd /Users/rogermasellas/AI/AI\ Bookmark\ Manager/ai-bookmarks/extension && npm test`
- **Per wave merge:** `cd /Users/rogermasellas/AI/AI\ Bookmark\ Manager/ai-bookmarks/extension && npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `extension/tests/single-save.test.ts` — covers AI-03 fallback logic and whitelist filtering
  - Option A: Extract `resolveSaveCategories(aiResult, categories, selectedCategories)` to a pure helper in `singleSaveUtils.ts` (same pattern as `tabsUtils.ts`) and test that function directly
  - Option B: Test inline via vitest mocks of `callClaudeProxy` (heavier setup but tests the full handler path)
  - Recommendation: Option A — pure function extraction keeps tests simple and fast, consistent with Phase 2 pattern

---

## Open Questions

1. **Loading state messaging during Claude call**
   - What we know: `handleBulkSave` uses `tabs-saving` view state with per-tab status indicators. Single-save currently uses generic `'loading'` view state before the duplicate check.
   - What's unclear: Should the loading message change while Claude is running (e.g., "AI categoritzant...") vs while saving to API ("Carregant..."), or reuse the single generic state?
   - Recommendation: Claude's discretion per CONTEXT.md. Simplest path is reuse the existing `'loading'` state — one less ViewState value, no new UI. The Claude call adds ~1-3s latency but user already sees the loading spinner.

2. **Whether to add `AI_CATEGORIZING` string to `ERRORS`/`UI_STRINGS`**
   - What we know: `UI_STRINGS.LOADING` = "Carregant informació..." is the current message during all loading states.
   - What's unclear: Whether to add a distinct Catalan string for the AI categorization phase.
   - Recommendation: Only add if the planner decides to show a distinct loading message. Avoid string additions unless the UI change is confirmed.

---

## Sources

### Primary (HIGH confidence — direct source code inspection)

- `extension/popup/popup.tsx` — Full file read; `handleSave()` at line 183, `handleBulkSave()` at line 264, `callClaudeProxy` import at line 4
- `extension/shared/api.ts` — Full file read; `callClaudeProxy` signature and always-resolves contract at lines 90-109
- `extension/shared/config.ts` — Full file read; `ERRORS.NO_CATEGORY` at line 15, `UI_STRINGS` at lines 27-66
- `extension/vitest.config.ts` — Test framework confirmed: vitest + jsdom
- `extension/tests/tabs-save.test.ts` — Reference test pattern (pure function extraction)
- `.planning/phases/03-fix-ai03-single-save/03-CONTEXT.md` — All locked decisions

### Secondary (HIGH confidence — project history)

- `.planning/STATE.md` — Accumulated decisions from Phases 1 and 2 confirming proxy always-resolves contract and sequential save pattern

---

## Metadata

**Confidence breakdown:**

- Integration point location: HIGH — confirmed by direct source read (line 218, after duplicate check block ends at line 217)
- Reference pattern: HIGH — `handleBulkSave` at line 264 is the exact template
- Fallback chain: HIGH — specified verbatim in CONTEXT.md decisions
- `callClaudeProxy` contract: HIGH — source code in api.ts confirms always-resolves
- Test approach: MEDIUM — pure function extraction is recommended pattern but planner has discretion on Option A vs B

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable codebase, no third-party churn risk)
