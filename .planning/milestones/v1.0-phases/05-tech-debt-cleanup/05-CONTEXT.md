# Phase 5: Tech Debt Cleanup - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove Gemini-era dead code accumulated during the Claude migration. Purely internal code hygiene — no user-visible changes. Scope is limited to deleting dead files, removing dead dependencies, and cleaning misleading comments.

</domain>

<decisions>
## Implementation Decisions

### TrialCountdown.tsx fate
- Delete the entire file — the component is dead (not imported in App.tsx) and tracks Gemini trial RPM limits/days which are meaningless with Claude
- Before deleting: verify App.tsx has no import line for it (thorough check, not just grep)
- No barrel file exists in components/ — direct delete is sufficient

### geminiService.ts fate
- Delete the entire file — claudeService.ts fully replaced it; nothing in the active codebase imports it
- Also remove the `@google/genai` npm package from package.json — deleting the service without removing the dependency leaves a dead package in the bundle
- Run `npm uninstall @google/genai` (or equivalent) as part of the plan

### types.ts Gemini comment
- Remove the `// Gemini Service Types` comment above `ProcessedTweetResult` — it is misleading since the type is actively used by `claudeService.ts`, not Gemini
- Do NOT rename or touch the type itself — it is live code

### GET_BOOKMARKS / dead type audit
- GET_BOOKMARKS does not exist anywhere in src/ — already gone, document as confirmed clean
- Perform a full audit of all types in types.ts (TweetRaw, Bookmark, Category, ProcessedTweetResult, LogEntry) by grepping each for active usage across the codebase
- Remove any type that has zero active usages outside of its own definition

### Build verification
- After all deletions and dependency removal, run `npm run build` (or `tsc --noEmit`) to confirm the TypeScript compile passes cleanly — this is the primary verification gate

### Claude's Discretion
- Order of operations within the plan (delete files first or uninstall package first)
- Exact TypeScript/build command to use for verification

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `claudeService.ts`: Active replacement for geminiService — shares `ProcessedTweetResult` type from types.ts
- `claudeService.test.ts`: Uses `ProcessedTweetResult` — confirms the type is live

### Established Patterns
- No barrel files in components/ — component files are imported directly; deleting a file is self-contained
- Services are imported directly from their path — no re-export layer to update

### Integration Points
- `types.ts` is imported by both `claudeService.ts` and `claudeService.test.ts` — edits there affect live code; only the comment and any confirmed-dead types should be touched
- `package.json` dependency on `@google/genai` must be removed after geminiService.ts is deleted

</code_context>

<specifics>
## Specific Ideas

- Build must pass clean (TypeScript compile) as the verification gate — not just "files deleted"
- App.tsx is 1843 lines — do a thorough grep check for TrialCountdown before deleting, don't rely solely on absence of direct import

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-tech-debt-cleanup*
*Context gathered: 2026-03-14*
