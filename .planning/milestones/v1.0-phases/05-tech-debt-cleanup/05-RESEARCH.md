# Phase 5: Tech Debt Cleanup - Research

**Researched:** 2026-03-14
**Domain:** TypeScript/React dead code removal — file deletion, npm dependency removal, type audit
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **TrialCountdown.tsx fate:** Delete the entire file — the component is dead (not imported in App.tsx) and tracks Gemini trial RPM limits/days which are meaningless with Claude. Before deleting: verify App.tsx has no import line for it (thorough check, not just grep).
- **geminiService.ts fate:** Delete the entire file — claudeService.ts fully replaced it; nothing in the active codebase imports it. Also remove the `@google/genai` npm package from package.json — deleting the service without removing the dependency leaves a dead package in the bundle. Run `npm uninstall @google/genai` (or equivalent) as part of the plan.
- **types.ts Gemini comment:** Remove the `// Gemini Service Types` comment above `ProcessedTweetResult` — it is misleading since the type is actively used by `claudeService.ts`, not Gemini. Do NOT rename or touch the type itself — it is live code.
- **GET_BOOKMARKS / dead type audit:** GET_BOOKMARKS does not exist anywhere in src/ — already gone, document as confirmed clean. Perform a full audit of all types in types.ts (TweetRaw, Bookmark, Category, ProcessedTweetResult, LogEntry) by grepping each for active usage across the codebase. Remove any type that has zero active usages outside of its own definition.
- **Build verification:** After all deletions and dependency removal, run `npm run build` (or `tsc --noEmit`) to confirm the TypeScript compile passes cleanly — this is the primary verification gate.

### Claude's Discretion
- Order of operations within the plan (delete files first or uninstall package first)
- Exact TypeScript/build command to use for verification

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

## Summary

This phase is a surgical dead code removal pass. The migration from Gemini to Claude (Phases 1–4) left three artefacts behind: `geminiService.ts` (the replaced AI service), `TrialCountdown.tsx` (a UI widget that depended on Gemini trial state), and a misleading comment in `types.ts`. All three require cleanup with zero risk to active functionality.

The codebase has been fully audited. Active type consumers are confirmed. No type in `types.ts` is dead: TweetRaw and ProcessedTweetResult are used by `claudeService.ts` and `claudeService.test.ts`; Bookmark and Category are used by `storage.ts` and `App.tsx`; LogEntry is used by `App.tsx`. The only dead symbols are the two files slated for deletion and one misleading comment.

The `@google/genai` package at `^1.30.0` exists in `package.json` dependencies and must be uninstalled. The tsconfig uses `noEmit: true` with `allowImportingTsExtensions: true`, so the build command is `npm run build` (which calls `tsc -b && vite build`). For a fast type-only check `tsc --noEmit` works but the root tsconfig has no `include` clause — use `cd src && npx tsc --noEmit -p tsconfig.json` or just run the full `npm run build` from the project root.

**Primary recommendation:** Delete `geminiService.ts` and `TrialCountdown.tsx`, uninstall `@google/genai`, remove the `// Gemini Service Types` comment from `types.ts`, then run `npm run build` to verify clean compile.

---

## Standard Stack

### Core (already present — no new installs)
| Tool | Version | Purpose | Note |
|------|---------|---------|------|
| TypeScript | ~5.9.3 | Static type checking | `tsc -b` via `npm run build` |
| Vite | ^7.2.4 | Build pipeline | runs after tsc in build script |
| vitest | ^4.1.0 | Test runner | `npm test` or `vitest run` |
| npm | bundled | Package manager | `npm uninstall` for dependency removal |

### What Gets Removed
| Package | Current Version | Reason |
|---------|-----------------|--------|
| `@google/genai` | `^1.30.0` | Only consumer was `geminiService.ts` which is being deleted |

---

## Confirmed State of Codebase (HIGH confidence — verified by direct grep)

### Files to Delete
| File | Status | Evidence |
|------|--------|---------|
| `src/services/geminiService.ts` | Dead — safe to delete | No import in App.tsx, no import in claudeService.ts or claudeService.test.ts. Only self-contained usages within its own body. |
| `src/components/TrialCountdown.tsx` | Dead — safe to delete | No import in App.tsx. Grep across all src/*.{ts,tsx} confirms zero references outside its own file. |

### File to Edit (comment removal only)
| File | Change | Line |
|------|--------|------|
| `src/types.ts` | Remove `// Gemini Service Types` comment on line 32 | One-line delete |

### Dependency to Uninstall
| Package | Location | Action |
|---------|----------|--------|
| `@google/genai` | `package.json` dependencies (root) | `npm uninstall @google/genai` |

### GET_BOOKMARKS Status
Confirmed absent: grep across all of `src/` returns zero matches. Already gone before this phase. Document as clean — no action required.

### Full Type Audit Results (HIGH confidence)

| Type | Used In (active files) | Status |
|------|----------------------|--------|
| `TweetRaw` | `claudeService.ts`, `claudeService.test.ts`, `App.tsx` | LIVE — keep |
| `Bookmark` | `storage.ts`, `App.tsx` | LIVE — keep |
| `Category` | `storage.ts`, `App.tsx` | LIVE — keep |
| `ProcessedTweetResult` | `claudeService.ts`, `claudeService.test.ts`, `App.tsx` | LIVE — keep |
| `LogEntry` | `App.tsx` | LIVE — keep |

No dead types found. The `// Gemini Service Types` comment above `ProcessedTweetResult` is the only cleanup item in `types.ts`.

Note: `geminiService.ts` also imports `TweetRaw` and `ProcessedTweetResult`, but those references disappear when the file is deleted — both types remain live via their other consumers.

---

## Architecture Patterns

### Safe Deletion Pattern for This Codebase
- No barrel files exist in `src/components/` — components are imported directly; deleting a component file requires only confirming zero import sites.
- No barrel files exist in `src/services/` — same rule applies.
- Direct import verification is sufficient: grep the filename and the exported symbols.

### Order of Operations (Claude's Discretion — recommended order)
1. Audit App.tsx (already done — confirms TrialCountdown and geminiService absent).
2. Delete `src/components/TrialCountdown.tsx`.
3. Delete `src/services/geminiService.ts`.
4. Edit `src/types.ts` — remove `// Gemini Service Types` comment (line 32).
5. Run `npm uninstall @google/genai` — updates `package.json` and `package-lock.json`.
6. Run `npm run build` — primary verification gate.

Rationale for deleting files before uninstalling: if the build is run accidentally mid-way, having geminiService.ts present but the package uninstalled would surface a cleaner error (missing package) than having the package present but the file already deleted (potential orphan imports that don't compile). Deleting first keeps each step atomic.

### Anti-Patterns to Avoid
- **Deleting types.ts content beyond the comment:** `ProcessedTweetResult` is actively used by claudeService.ts and claudeService.test.ts. The CONTEXT.md is explicit: remove only the comment, touch nothing else.
- **Using `tsc --noEmit` as the sole gate:** The root `package.json` build script is `tsc -b && vite build`. The tsconfig has `allowImportingTsExtensions: true` which is a Vite-bundler-mode option. Run the full `npm run build` to catch any Vite-layer issues as well.
- **Forgetting package-lock.json:** `npm uninstall` updates both `package.json` and `package-lock.json`. Both files should be committed.
- **Assuming App.tsx.bak2 is irrelevant:** The `.bak2` file in src/ contains stale imports (`processBookmarksWithGemini`, `TrialCountdown` references visible in git status). It is not compiled — TypeScript does not pick up `.bak2` files — but confirm this does not affect the build. The `tsconfig.json` does not have an explicit `include` list, so TypeScript uses default include rules (`.ts`, `.tsx`, `.d.ts` — not `.bak2`). Safe to ignore in this phase.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Verifying no imports after deletion | Manual file scanning | `npm run build` | TypeScript compiler is the authoritative import checker — it will fail loudly on any missed import |
| Dependency graph analysis | Custom grep scripts | TypeScript compiler errors | Compiler resolves module graph; grep is verification, not the gate |

---

## Common Pitfalls

### Pitfall 1: Assuming App.tsx is the only consumer
**What goes wrong:** Deleting a file because App.tsx doesn't import it, then the build fails because another file (e.g., a test or a utility) does.
**Why it happens:** App.tsx is the obvious entry point, but services import from services.
**How to avoid:** Grep for the filename AND all exported symbols across the full src tree. Done in this research — confirmed clean.
**Warning signs:** Build error citing "Cannot find module '../services/geminiService'"

### Pitfall 2: `@google/genai` in node_modules vs package.json
**What goes wrong:** Deleting `geminiService.ts` without running `npm uninstall` — the package stays in `node_modules` and `package.json`, inflating the bundle.
**Why it happens:** The file is gone so the build passes, but the dead dependency isn't cleaned up.
**How to avoid:** `npm uninstall @google/genai` explicitly. Verify it is removed from `package.json` "dependencies" before committing.

### Pitfall 3: claudeService.test.ts and the getTrialInfo assertion
**What goes wrong:** Misreading the test file and thinking `getTrialInfo` must be preserved.
**Why it happens:** The test at line 19 says "does NOT export getTrialInfo" — it asserts the absence of the Gemini function from claudeService.ts. This is a positive signal: the test already confirms the clean separation. Deleting geminiService.ts does not affect this test.
**How to avoid:** Read the test assertion carefully. It tests `claudeService`, not `geminiService`.

### Pitfall 4: tsconfig.json `noEmit: true` confusion
**What goes wrong:** Running `npx tsc` alone from the project root fails with "option allowImportingTsExtensions requires noEmit or emitDeclarationOnly" — or alternatively generates no output.
**Why it happens:** The tsconfig is configured for bundler-mode use; the actual compilation is done by Vite via `tsc -b`.
**How to avoid:** Always use `npm run build` (the project's defined build command) as the verification gate, not raw `tsc`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.0 |
| Config file | `src/vite.config.ts` (vitest configured inline) |
| Quick run command | `npm test` (runs `vitest run`) |
| Full suite command | `npm test && npm run build` |

### Phase Requirements → Test Map

This phase is non-functional code hygiene — there are no functional requirements. Verification is structural (compile gate) rather than behavioral.

| Check | Behavior | Type | Automated Command | Status |
|-------|----------|------|-------------------|--------|
| Build clean | TypeScript compile passes after deletions | smoke | `npm run build` | Will confirm at task end |
| Tests still pass | Existing vitest suite green after type cleanup | regression | `npm test` | Existing suite covers this |
| No getTrialInfo export | claudeService does not expose Gemini API | unit | `npm test` (claudeService.test.ts line 19) | Existing test |
| @google/genai absent | Package removed from package.json | manual | Inspect package.json after uninstall | Post-task check |

### Sampling Rate
- **Per task commit:** `npm test` (4 tests, fast)
- **Per wave merge:** `npm test && npm run build`
- **Phase gate:** Full `npm run build` clean before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements. No new test files needed for this hygiene phase.

---

## Code Examples

### Removing a single-line comment in types.ts
```typescript
// BEFORE (line 32 in src/types.ts):
// Gemini Service Types
export interface ProcessedTweetResult {

// AFTER:
export interface ProcessedTweetResult {
```
Source: Direct inspection of `src/types.ts`

### Verifying no references remain after deletion
```bash
# Run from project root after deleting files — should return zero matches
grep -r "geminiService\|TrialCountdown\|getTrialInfo\|processBookmarksWithGemini" src/ --include="*.ts" --include="*.tsx"
```

### Build verification command
```bash
npm run build
# Equivalent to: tsc -b && vite build
# Expected: zero errors, dist/ output generated
```

### Dependency removal
```bash
npm uninstall @google/genai
# Removes from node_modules AND updates package.json + package-lock.json
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `geminiService.ts` with `@google/genai` | `claudeService.ts` with local proxy | Phase 1 | This phase finalizes the migration by removing the old service |
| `TrialCountdown.tsx` showing Gemini RPM limits | Removed — Claude proxy has no RPM trial UI | Phase 1 | Frees lucide-react icons from dead JSX |

**Deprecated/outdated:**
- `geminiService.ts`: Replaced by `claudeService.ts`. Export `processBookmarksWithGemini` has no callers.
- `TrialCountdown.tsx`: Depended on `getTrialInfo()` from `geminiService.ts`. Has no callers in active code.
- `// Gemini Service Types` comment: Misleading — `ProcessedTweetResult` is used by Claude service.
- `@google/genai ^1.30.0`: Dead dependency — will be removed.

---

## Open Questions

None. All artefacts are confirmed via direct grep. The cleanup scope is fully bounded.

---

## Sources

### Primary (HIGH confidence)
- Direct inspection of `src/types.ts` — type definitions confirmed, comment at line 32 confirmed
- Direct inspection of `src/services/geminiService.ts` — export names confirmed, no active callers found
- Direct inspection of `src/components/TrialCountdown.tsx` — imports geminiService, confirmed not imported by App.tsx
- Direct inspection of `src/services/claudeService.ts` — active replacement service confirmed
- Direct inspection of `src/services/claudeService.test.ts` — test suite uses TweetRaw, ProcessedTweetResult
- Direct inspection of `package.json` — `@google/genai: ^1.30.0` in dependencies confirmed
- Grep across full `src/` tree — all type usage and import chains verified

### Secondary (MEDIUM confidence)
- N/A — no external research required for this phase

---

## Metadata

**Confidence breakdown:**
- Files to delete: HIGH — confirmed by direct grep; zero active importers
- Types to keep: HIGH — confirmed by direct grep; all five types have live consumers
- Build command: HIGH — verified from package.json scripts
- Dependency removal: HIGH — `@google/genai` present in package.json dependencies, sole consumer is the file being deleted

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable codebase — no fast-moving dependencies in scope)
