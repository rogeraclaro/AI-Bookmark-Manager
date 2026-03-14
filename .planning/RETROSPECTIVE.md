# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-14
**Phases:** 6 | **Plans:** 11 | **Timeline:** 102 days (2025-12-03 → 2026-03-14)

### What Was Built
- Local Claude proxy (Express + macOS LaunchAgent) replacing Gemini API — auto-starts at login
- `claudeService.ts` drop-in replacing `geminiService.ts` across web app and extension
- Chrome Tabs feature: filter bar, multi-select, bulk save with per-row inline status and retry-failed
- AI-03 single-page save regression fixed — 3-tier category fallback (Claude → user → Altres)
- Nyquist validation compliance across Phases 1–3
- Full Gemini teardown: deleted `geminiService.ts`, `TrialCountdown.tsx`, `@google/genai` (56 packages), 4 dead-code relics

### What Worked
- TDD-first approach caught critical bugs early (e.g., `execFile` → `spawn` fix before any manual testing)
- Wave-based parallel execution kept phases moving — Phases 3–6 were each single-plan phases, fast to execute
- Audit + gap closure cycle (Phases 3–6) was effective: the audit surfaced concrete items with zero ambiguity
- Verification agents (6/6 scores) gave high confidence at each phase boundary

### What Was Inefficient
- Phases 3–6 were all gap-closure phases inserted after the original 2-phase roadmap — the initial scope underestimated the Gemini→Claude migration depth (AI-03 regression, dead code, stale strings)
- Some SUMMARY.md files lack structured `one_liner` fields — the `summary-extract` CLI returned empty results, requiring manual extraction
- `src/App.tsx.bak2` still tracked in git — old backup artifact, never cleaned up

### Patterns Established
- Decimal phase numbering (3, 4, 5, 6 inserted as gap closure) worked cleanly — no phase renumbering needed
- `callClaudeProxy` with 10s timeout + graceful fallback is the established pattern for all AI calls
- Vitest for extension unit tests; `node:test` TAP for proxy integration tests (separate runners, separate invocations)
- `resolveSaveCategories` helper pattern for testable category resolution logic

### Key Lessons
1. **Scope the migration fully upfront.** Gemini → Claude touched more than the service layer: dead types, dead constants, stale UI strings, backup files. A pre-migration audit would have collapsed Phases 3–6 into Phase 1.
2. **TDD catches infrastructure bugs before manual testing.** The `execFile` hanging bug was caught by tests, not by running the proxy manually.
3. **Verify each phase before continuing.** The AI-03 regression (Phase 2 broke single-save) was caught by the Phase 3 gap closure cycle, not during Phase 2 execution. Phase-level verification would have caught it sooner.
4. **LaunchAgent persistence needs human verification** — automated tests cannot confirm cross-login behavior. Document this explicitly as a human-verify checkpoint.

### Cost Observations
- Model mix: ~100% sonnet (all executor and verifier agents ran on sonnet)
- Sessions: multiple across 102 days (project started Dec 2025, most execution in Mar 2026)
- Notable: 6-phase milestone with 11 plans executed cleanly; verifier consistently scored 6/6

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 6 | 11 | First milestone — established proxy architecture and GSD workflow |

### Cumulative Quality

| Milestone | Tests | Build |
|-----------|-------|-------|
| v1.0 | 28/28 vitest green | Clean tsc, 1691 modules |

### Top Lessons (Verified Across Milestones)

1. Audit before claiming done — gap closure phases are normal, not failure
2. TDD-first catches infrastructure surprises before manual testing
