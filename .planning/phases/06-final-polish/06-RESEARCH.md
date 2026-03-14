# Phase 6: Final Polish — Dead Code & Stale Strings - Research

**Researched:** 2026-03-14
**Domain:** TypeScript dead code removal, UI string hygiene, file system cleanup
**Confidence:** HIGH

## Summary

Phase 6 closes 4 discrete, isolated tech debt items surfaced by the v1.0 milestone audit. Each item is fully characterized — no ambiguity about what to change, where, or why. There are no dependencies between items; they can be handled in any order in a single plan.

The scope is deliberately narrow: two constant removals in extension code, one UI string replacement in App.tsx, and one `.bak` file deletion. Nothing in this phase touches business logic, test infrastructure, API contracts, or the proxy server. The build must pass before and after — that is the only verification gate.

This is a surgical hygiene phase. The highest risk is scope creep: accidentally "cleaning" adjacent code while making targeted changes.

**Primary recommendation:** One plan, four tasks, each scoped to exactly the named line(s). Run `npm run build` as the post-change gate. No new tests are needed — this phase has no testable behavior.

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| TypeScript compiler (tsc) | ~5.8.2 | Validates that removed types/constants leave no dangling references | Already in the project; `npm run build` runs `tsc -b && vite build` |
| vitest | (via npm run test) | Regression check — 28 existing tests must stay green | Already in the project; guards against accidental breakage |

### No new libraries needed
This phase installs nothing. All tooling is pre-existing.

## Architecture Patterns

### Recommended Project Structure
No structural changes. Files touched:
```
extension/shared/types.ts       # Remove GET_BOOKMARKS from Message union
extension/shared/config.ts      # Remove ERRORS.NO_CATEGORY key
src/App.tsx                     # Replace "Gemini" with "Claude" at line 1608
src/package.json.bak            # Delete entirely
```

### Pattern 1: Removing a union member in TypeScript
**What:** Remove a literal string from a discriminated union. TypeScript will error at every site that constructs or switches on that literal if any exist.
**When to use:** When auditing confirms zero senders and zero handlers.
**Example:**
```typescript
// BEFORE (extension/shared/types.ts line 23)
type: 'GET_METADATA' | 'SAVE_BOOKMARK' | 'CHECK_DUPLICATE' | 'GET_CATEGORIES' | 'ADD_CATEGORY' | 'GET_BOOKMARKS';

// AFTER — remove 'GET_BOOKMARKS' from the union
type: 'GET_METADATA' | 'SAVE_BOOKMARK' | 'CHECK_DUPLICATE' | 'GET_CATEGORIES' | 'ADD_CATEGORY';
```
The trailing `| 'GET_BOOKMARKS'` is the only occurrence of this string in the entire extension codebase (confirmed by grep — zero other matches).

### Pattern 2: Removing a key from a `const` object
**What:** Delete a key from an exported `const` object literal.
**When to use:** When grep confirms zero consumers of that key path.
**Example:**
```typescript
// BEFORE (extension/shared/config.ts)
export const ERRORS = {
  NO_TITLE: "El títol no pot estar buit",
  TITLE_TOO_LONG: "El títol no pot superar els 80 caràcters",
  NO_CATEGORY: "Selecciona almenys una categoria",   // <-- delete this line
  DUPLICATE: "Aquest enllaç ja està guardat",
  ...
};
```
`ERRORS.NO_CATEGORY` has zero references in the codebase outside its own declaration (confirmed by grep). The validation guard that used it was intentionally removed in Phase 3.

### Pattern 3: In-place JSX string replacement
**What:** Replace a hardcoded AI brand name with the correct brand name in a JSX text node.
**When to use:** One-line display string with no translation system or i18n layer involved.
**Example:**
```tsx
// BEFORE (src/App.tsx line 1608)
Gemini ha descartat {rejectedTweets.length} tweet{rejectedTweets.length !== 1 ? 's' : ''} perquè

// AFTER
Claude ha descartat {rejectedTweets.length} tweet{rejectedTweets.length !== 1 ? 's' : ''} perquè
```
The surrounding context (rejected tweets modal) references `rejectedTweets` — a variable set during Claude-driven tweet import. The string is display-only; no API call is triggered by it.

### Pattern 4: Deleting a .bak file
**What:** Remove a backup file that has no consumer.
**When to use:** Confirmed that no build tool, script, or import references the path.
**Command:**
```bash
rm src/package.json.bak
```
The active `src/package.json` was inspected — it does not exist as a real dependency manifest (the root `package.json` governs the build). The `.bak` file is a leftover artifact from the Gemini removal work in Phase 5. It retains `@google/genai: "^1.30.0"` which is misleading. Deleting it removes the confusion with zero functional impact.

### Anti-Patterns to Avoid
- **Removing adjacent "similar-looking" dead code without verifying:** Only remove the four named items. Do not sweep for other stale strings or unused exports.
- **Editing the surrounding Message union members:** Only `GET_BOOKMARKS` is removed. The other five members (`GET_METADATA`, `SAVE_BOOKMARK`, `CHECK_DUPLICATE`, `GET_CATEGORIES`, `ADD_CATEGORY`) are all in use.
- **Reformatting ERRORS object:** Remove the `NO_CATEGORY` line only. Do not reorder or add trailing commas unless the existing style already uses them.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Verifying no remaining references | Custom grep script | `npm run build` (tsc) | TypeScript compiler catches dangling references to removed types/constants at build time — faster and authoritative |
| Regression check | Re-reading all affected files manually | `npm run test` (vitest) | 28 existing tests cover the impacted modules; a green run proves no behavioral regression |

**Key insight:** For dead code removal, the TypeScript compiler is the verification oracle. If `tsc` passes after removing a type or constant, it proves the item had no live consumers.

## Common Pitfalls

### Pitfall 1: Forgetting the trailing pipe character in the union
**What goes wrong:** Leaving a dangling `|` before or after `GET_BOOKMARKS` produces a TypeScript syntax error.
**Why it happens:** The member is in the middle of the union: `... | 'ADD_CATEGORY' | 'GET_BOOKMARKS'`. Removing only the string leaves `| |` or a trailing `|`.
**How to avoid:** Delete the entire ` | 'GET_BOOKMARKS'` segment including the leading pipe and space.
**Warning signs:** `tsc` error "Expression expected" or "Identifier expected".

### Pitfall 2: Treating src/package.json.bak as a real manifest
**What goes wrong:** Thinking `src/package.json.bak` controls dependencies for a `src`-level sub-project.
**Why it happens:** The `src/` directory has a backup copy that looks like a real manifest.
**How to avoid:** Confirmed: only the root `package.json` is consumed by Vite. The `src/` directory has no independent build pipeline. Deletion is safe.
**Warning signs:** None expected — `npm run build` will not change behavior after deletion.

### Pitfall 3: Neutral vs. branded replacement for App.tsx string
**What goes wrong:** Replacing "Gemini" with a neutral phrase like "El sistema" (or similar) when the audit explicitly notes the fix is to say "Claude".
**Why it happens:** Over-caution about brand naming.
**How to avoid:** The system now uses Claude throughout. The fix is a direct substitution: "Gemini ha descartat" -> "Claude ha descartat". No neutral phrasing needed.

### Pitfall 4: Scope creep during ERRORS object edit
**What goes wrong:** Noticing other constants in config.ts and "cleaning" them while editing the file.
**Why it happens:** The file is open and other items may look unused.
**How to avoid:** Only delete the `NO_CATEGORY` line. Exit the file immediately after.

## Code Examples

### Exact diff for types.ts
```diff
- type: 'GET_METADATA' | 'SAVE_BOOKMARK' | 'CHECK_DUPLICATE' | 'GET_CATEGORIES' | 'ADD_CATEGORY' | 'GET_BOOKMARKS';
+ type: 'GET_METADATA' | 'SAVE_BOOKMARK' | 'CHECK_DUPLICATE' | 'GET_CATEGORIES' | 'ADD_CATEGORY';
```

### Exact diff for config.ts
```diff
  export const ERRORS = {
    NO_TITLE: "El títol no pot estar buit",
    TITLE_TOO_LONG: "El títol no pot superar els 80 caràcters",
-   NO_CATEGORY: "Selecciona almenys una categoria",
    DUPLICATE: "Aquest enllaç ja està guardat",
```

### Exact diff for App.tsx line 1608
```diff
-   Gemini ha descartat {rejectedTweets.length} tweet{rejectedTweets.length !== 1 ? 's' : ''} perquè
+   Claude ha descartat {rejectedTweets.length} tweet{rejectedTweets.length !== 1 ? 's' : ''} perquè
```

### File deletion command
```bash
rm "/Users/rogermasellas/AI/AI Bookmark Manager/ai-bookmarks/src/package.json.bak"
```

### Build verification command
```bash
npm run build
# expects: "✓ built in Xs" with no TypeScript errors
```

### Test verification command
```bash
npm run test
# expects: 28/28 vitest tests pass (proxy TAP exit-1 is pre-existing, not caused by this phase)
```

## State of the Art

| Old State | Current State | When Changed | Impact |
|-----------|---------------|--------------|--------|
| `GET_BOOKMARKS` in Message union | Dead — no handler, no sender | Phase 2 (loadTabsData uses direct HTTP) | Type union lies about the protocol |
| `ERRORS.NO_CATEGORY` defined | Dead — guard removed | Phase 3 (category optional) | Exported constant that serves no consumer |
| "Gemini ha descartat..." in UI | Stale brand name | Phase 1 (AI provider switched) | User sees wrong AI name |
| `src/package.json.bak` with @google/genai | Stale backup artifact | Phase 5 (genai uninstalled) | Misleading file in repo |

**Deprecated/outdated:**
- `GET_BOOKMARKS` message type: was planned for a feature that was implemented differently (direct HTTP call)
- `ERRORS.NO_CATEGORY`: was used by the category validation guard removed in Phase 3

## Open Questions

1. **Is there a `src/package.json` (non-.bak) that is a real manifest?**
   - What we know: The git status shows `D src/package.json` (deleted) and `?? src/package.json.bak` (untracked). The active `.bak` is the only file at that path.
   - What's unclear: The `D src/package.json` in git status means a tracked `src/package.json` was deleted in a previous uncommitted change. The `.bak` is untracked. The root `package.json` governs the build.
   - Recommendation: Delete `src/package.json.bak` only. The deleted `src/package.json` is already gone from the working tree and not in use — the planner need not restore it.

2. **Should the App.tsx replacement use "Claude" or a more neutral phrase?**
   - What we know: The audit says "replace 'Gemini' with 'Claude' or a neutral phrase". The system uses Claude throughout.
   - What's unclear: Whether "Claude" is the right brand to surface in the UI (some teams prefer neutral AI references).
   - Recommendation: Use "Claude" — it is already named throughout the extension UI (button labels reference Claude proxy), and consistency with the actual system is more accurate than a neutral phrase.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (via npm run test) |
| Config file | vite.config.ts (vitest config embedded) |
| Quick run command | `npm run test` |
| Full suite command | `npm run test` |

### Phase Requirements -> Test Map
Phase 6 has no functional requirements — it is code hygiene only. The existing test suite acts as a regression guard:

| Scope | Behavior | Test Type | Automated Command | File Exists? |
|-------|----------|-----------|-------------------|-------------|
| Regression: extension types | Message union change does not break tests | unit | `npm run test` | Yes (extension/__tests__/) |
| Regression: extension config | ERRORS object change does not break tests | unit | `npm run test` | Yes (extension/__tests__/) |
| Build gate: TypeScript | Removed items leave no dangling references | compile | `npm run build` | N/A (compiler check) |

### Sampling Rate
- **Per task commit:** `npm run build` (confirms tsc passes after each individual change)
- **Per wave merge:** `npm run test` (confirms 28 vitest tests still green)
- **Phase gate:** Build green + 28/28 vitest green before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers regression detection. No new test files are needed for a dead code removal phase.

## Sources

### Primary (HIGH confidence)
- Direct file inspection: `extension/shared/types.ts` — confirmed `GET_BOOKMARKS` appears only at line 23 (union declaration)
- Direct file inspection: `extension/shared/config.ts` — confirmed `NO_CATEGORY` appears only at line 15 (object key declaration)
- Direct file inspection: `src/App.tsx:1608` — confirmed "Gemini ha descartat" string
- Direct file inspection: `src/package.json.bak` — confirmed `@google/genai: "^1.30.0"` present
- Grep verification: zero additional references to `GET_BOOKMARKS` or `NO_CATEGORY` outside their declarations
- `.planning/v1.0-MILESTONE-AUDIT.md` — authoritative source for all 4 tech debt items

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` Decisions log — confirms Phase 3 removed the `selectedCategories.length === 0` guard (explains why `NO_CATEGORY` is dead)
- Git status — confirms `src/package.json.bak` is untracked (never committed, safe to delete without git history implications)

### Tertiary (LOW confidence)
None.

## Metadata

**Confidence breakdown:**
- All four items: HIGH — directly verified by file inspection and grep
- Build gate approach: HIGH — `npm run build` runs `tsc -b` which is the authoritative dead-code detector
- Test regression approach: HIGH — 28 vitest tests exist and are green

**Research date:** 2026-03-14
**Valid until:** No expiry — this is a point-in-time inventory of static files. The findings are frozen until the files change.
