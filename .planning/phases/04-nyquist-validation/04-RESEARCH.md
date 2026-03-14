# Phase 4: Nyquist Validation - Research

**Researched:** 2026-03-14
**Domain:** Documentation / Process compliance — VALIDATION.md authoring
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Phase 1 VALIDATION.md correction scope:**
- Full rewrite (not minimal patch) of the existing `01-VALIDATION.md`
- Correct framework: `jest 29.x` → `vitest` (the framework actually used)
- Correct test commands: jest-style patterns → real vitest commands
- Update file references to the real test file: `proxy/test/proxy.test.mjs`
- Update all task statuses to completed/green (Phase 1 is complete)
- Set `nyquist_compliant: true` in frontmatter

**Phase 2 VALIDATION.md format:**
- Post-execution style: all statuses in green from the start
- `nyquist_compliant: true` in frontmatter
- Reflects current reality: 17/17 vitest tests green, verification passed
- Real tests: `extension/tests/tabs-filter.test.ts`, `tabs-save.test.ts`, `tabs-selection.test.ts`
- Command: `npm test` (from `extension/`)

**Phase 3 VALIDATION.md — included in scope:**
- Create VALIDATION.md for Phase 3 (`03-fix-ai03-single-save`) even though the roadmap does not mention it explicitly
- Same decision: post-execution style, `nyquist_compliant: true`
- Real test: `extension/tests/single-save.test.ts`
- Phase already complete (1/1 plan executed and verified)

### Claude's Discretion

- Exact structure of the task mapping table for Phases 2 and 3
- Level of detail for Wave 0 requirements (unnecessary since everything is already green)

### Deferred Ideas (OUT OF SCOPE)

None — the discussion stayed within phase scope.
</user_constraints>

---

## Summary

Phase 4 is a documentation-only phase. No code changes, no new functionality. The sole deliverable is three VALIDATION.md files that accurately reflect the completed, tested state of Phases 1, 2, and 3.

The core problem: `01-VALIDATION.md` was generated before execution began and contains entirely wrong information (wrong framework, wrong test commands, wrong file paths, all statuses pending). Phases 2 and 3 have no VALIDATION.md at all. This phase creates correct documentation for all three.

All three phases have passing test suites and human-verified behavior. The research task is to understand the exact content each VALIDATION.md must contain by examining what was actually built and verified.

**Primary recommendation:** Rewrite Phase 1's VALIDATION.md and create Phase 2 and Phase 3 VALIDATION.md files using post-execution style — all statuses green, no Wave 0 gaps, real file paths and real commands.

---

## Standard Stack

This phase involves no library installation. The only tools are:

| Tool | Version | Purpose |
|------|---------|---------|
| vitest | ^4.1.0 (extension) | Test framework for extension tests (Phases 2 and 3) |
| node:test (built-in) | Node.js built-in | Test runner for proxy tests (Phase 1) |

**Test commands confirmed working:**

```bash
# Phase 1 — proxy tests (node built-in runner)
node --test proxy/test/proxy.test.mjs
# Result: pass 8 / fail 0

# Phase 2 + Phase 3 — extension tests (vitest)
cd extension && npm test
# Result: 23/23 passing (17 Phase 2 tests + 6 Phase 3 tests)
```

---

## Architecture Patterns

### VALIDATION.md Frontmatter (required fields)

Every VALIDATION.md must have this YAML frontmatter:

```yaml
---
phase: <number or slug>
slug: <phase-slug>
status: complete
nyquist_compliant: true
wave_0_complete: true
created: <ISO date>
---
```

For post-execution documents, `wave_0_complete: true` is always correct because all infrastructure existed before this phase runs.

### Post-Execution Document Style

Used for all three phases in this phase. All tasks already done, so:
- No `⬜ pending` statuses — only `✅ complete`
- No Wave 0 gaps section (or a section that says "None — all infrastructure exists")
- No future-tense language

### Per-Task Verification Map Structure

The table that maps tasks to tests. For Phase 1 this needs accurate vitest replacement; for Phases 2 and 3 this is created from scratch.

Key columns: Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status

---

## Don't Hand-Roll

This phase is documentation only. There is nothing to build programmatically.

| Problem | Don't Do | Do Instead |
|---------|----------|-----------|
| Determining what tests exist | Guess from PLAN files | Read actual filesystem (`proxy/test/`, `extension/tests/`) |
| Determining test counts | Infer from PLAN files | Use counts confirmed in VERIFICATION.md files |
| Determining requirement coverage | Reconstruct | Copy from VERIFICATION.md Requirements Coverage tables |

---

## Common Pitfalls

### Pitfall 1: Carrying Forward Wrong Framework in Phase 1
**What goes wrong:** Keeping `jest 29.x` in the Test Infrastructure table because the original VALIDATION.md used it.
**Why it happens:** The original VALIDATION.md was created before implementation chose vitest for the extension and `node:test` for the proxy.
**How to avoid:** The proxy uses `node --test` (Node.js built-in), not jest, not vitest. The extension uses vitest. These are different runners for different parts of the codebase. Phase 1 proxy tests run with `node --test`, not `npm test`.

### Pitfall 2: Wrong Test Count for Phase 2
**What goes wrong:** Writing 6 tests (only Phase 2 original count) or 17 (before Phase 3 test was added).
**Why it happens:** Phase 2 originally had 17 tests. Phase 3 added `single-save.test.ts` with 6 tests, bringing the total to 23. The `npm test` command in `extension/` runs ALL extension tests.
**How to avoid:** Phase 2 VALIDATION.md documents Phase 2 tests only (17/17); Phase 3 VALIDATION.md documents its own test (6/6). The full suite (`npm test`) reports 23 when run after Phase 3.

### Pitfall 3: Task IDs that Don't Match the PLANs
**What goes wrong:** Inventing task IDs (e.g., `2-01-01`) that don't correspond to actual plan task numbering.
**Why it happens:** VALIDATION.md was designed with task IDs in mind, but the PLANs use their own internal task structure.
**How to avoid:** Read the PLAN files for Phase 1 task IDs. For Phases 2 and 3, use the plan/wave structure from the PLAN files. Task IDs should follow the convention established in the existing Phase 1 file: `{phase}-{plan}-{task}`.

### Pitfall 4: Including Wave 0 Gaps When All Tests Exist
**What goes wrong:** Writing a Wave 0 Requirements section listing files that already exist.
**Why it happens:** The VALIDATION.md template includes a Wave 0 section by default.
**Why to avoid:** For post-execution documents, the correct entry is "None — all test infrastructure exists and is green." All test files were created during execution, not as prerequisites.

### Pitfall 5: Misidentifying the Phase 1 Test File Location
**What goes wrong:** Referencing `proxy/tests/` (plural) instead of `proxy/test/` (singular).
**How to avoid:** The real path is `proxy/test/proxy.test.mjs` (confirmed by filesystem listing).

---

## Code Examples

### Correct Phase 1 Test Infrastructure Table

```markdown
| Property | Value |
|----------|-------|
| **Framework** | node:test (Node.js built-in) |
| **Config file** | none — no config needed for node:test |
| **Quick run command** | `node --test proxy/test/proxy.test.mjs` |
| **Full suite command** | `node --test proxy/test/proxy.test.mjs` |
| **Estimated runtime** | ~5 seconds |
```

### Correct Phase 2 Test Infrastructure Table

```markdown
| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.0 |
| **Config file** | `extension/vitest.config.ts` |
| **Quick run command** | `cd extension && npm test` |
| **Full suite command** | `cd extension && npm test` |
| **Estimated runtime** | ~10 seconds |
```

### Correct Phase 3 Test Infrastructure Table

```markdown
| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.0 |
| **Config file** | `extension/vitest.config.ts` |
| **Quick run command** | `cd extension && npm test` |
| **Full suite command** | `cd extension && npm test` |
| **Estimated runtime** | ~10 seconds |
```

### Frontmatter for Phase 1 (corrected)

```yaml
---
phase: 1
slug: claude-proxy
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-12
---
```

---

## Factual Inventory (verified from source files)

This section provides the authoritative facts each VALIDATION.md must reflect. All sourced from VERIFICATION.md files and filesystem inspection.

### Phase 1 Facts

| Item | Value | Source |
|------|-------|--------|
| Test runner | `node:test` (Node.js built-in) | `proxy/test/proxy.test.mjs` line 2 |
| Test file | `proxy/test/proxy.test.mjs` | Filesystem listing |
| Test count | 8 tests, all pass | `01-VERIFICATION.md` score: 16/16 |
| Test command | `node --test proxy/test/proxy.test.mjs` | `01-VERIFICATION.md` Observable Truth #1 |
| Phase status | complete | `01-VERIFICATION.md` status |
| Requirements covered | PROXY-01, PROXY-02, PROXY-03, PROXY-04, AI-01, AI-02, AI-03, AI-04 | `01-VERIFICATION.md` Requirements Coverage |
| Plans | 01-01, 01-02, 01-03, 01-04 (4 plans) | Filesystem listing |
| Manual items | LaunchAgent auto-start (login cycle), extension end-to-end, tweet import | `01-VERIFICATION.md` Human Verification section |

### Phase 2 Facts

| Item | Value | Source |
|------|-------|--------|
| Test runner | vitest ^4.1.0 | `02-VERIFICATION.md` |
| Test files | `extension/tests/tabs-filter.test.ts` (5), `tabs-selection.test.ts` (8), `tabs-save.test.ts` (6) | `02-VERIFICATION.md` Required Artifacts |
| Test count | 17/17 all pass | `02-VERIFICATION.md` Observable Truth #14 |
| Test command | `cd extension && npm test` | `02-VERIFICATION.md` |
| Phase status | complete (passed) | `02-VERIFICATION.md` status |
| Requirements covered | TABS-01, TABS-02, TABS-03, TABS-04 | `02-VERIFICATION.md` Requirements Coverage |
| Plans | 02-01, 02-02, 02-03 (3 plans) | Filesystem listing |
| Manual items | Visual full flow end-to-end in Chrome (already approved 2026-03-13) | `02-VERIFICATION.md` Human Verification |

### Phase 3 Facts

| Item | Value | Source |
|------|-------|--------|
| Test runner | vitest ^4.1.0 | `03-01-VERIFICATION.md` |
| Test files | `extension/tests/single-save.test.ts` (6 tests) | `03-01-VERIFICATION.md` Required Artifacts |
| Test count | 6/6 all pass; full suite 23/23 | `03-01-VERIFICATION.md` Gaps Summary |
| Test command | `cd extension && npm test` | `03-01-VERIFICATION.md` |
| Phase status | complete (passed) | `03-01-VERIFICATION.md` status |
| Requirements covered | AI-03 | `03-01-VERIFICATION.md` Requirements Coverage |
| Plans | 03-01 (1 plan) | Filesystem listing |
| Manual items | Claude proxy end-to-end single-page save, proxy-down fallbacks (already approved 2026-03-14) | `03-01-VERIFICATION.md` Human Verification |

---

## Validation Architecture

> nyquist_validation is `true` in `.planning/config.json`, so this section is included.

Phase 4 itself is documentation-only with no code artifacts to test. The "validation" for this phase is structural: do the three VALIDATION.md files exist, are they well-formed, and do they have `nyquist_compliant: true`?

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None (documentation phase — no automated tests) |
| Config file | n/a |
| Quick run command | Manual inspection of created files |
| Full suite command | Manual inspection of created files |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| (non-functional) | `01-VALIDATION.md` has `nyquist_compliant: true` and correct vitest content | manual-inspect | n/a | ❌ (must be rewritten) |
| (non-functional) | `02-VALIDATION.md` exists with `nyquist_compliant: true` | manual-inspect | n/a | ❌ (must be created) |
| (non-functional) | `03-VALIDATION.md` exists with `nyquist_compliant: true` | manual-inspect | n/a | ❌ (must be created) |

### Wave 0 Gaps
None — this phase creates documentation, not code. No test infrastructure gaps.

---

## Open Questions

1. **Phase 1 task IDs in the per-task verification map**
   - What we know: The original file used IDs like `1-01-01`. Plans 01-01 through 01-04 exist.
   - What's unclear: The exact mapping of each requirement to each plan task number is not in the VERIFICATION.md (it reports on requirements, not task IDs).
   - Recommendation: Use requirement-level rows (one row per requirement) rather than task-level rows for Phases 1-3 VALIDATION.md files. The VERIFICATION.md Requirements Coverage tables provide exactly this mapping. This avoids inventing task IDs that may not match plan internals.

2. **Sampling Rate section for Phase 1**
   - The original had jest-style commands. The corrected version should reference `node --test proxy/test/proxy.test.mjs` for both quick and full runs.
   - Note: there is no separate "quick run" for the proxy — the full test file is small and runs in ~5 seconds.

---

## Sources

### Primary (HIGH confidence)
- `.planning/phases/01-claude-proxy/01-VALIDATION.md` — Existing file with known errors; full content read
- `.planning/phases/01-claude-proxy/01-VERIFICATION.md` — Ground truth for Phase 1 actual state; 8 tests pass, all requirements satisfied
- `.planning/phases/02-chrome-tabs-feature/02-VERIFICATION.md` — Ground truth for Phase 2 actual state; 17 tests pass, 4 requirements satisfied
- `.planning/phases/03-fix-ai03-single-save/03-01-VERIFICATION.md` — Ground truth for Phase 3 actual state; 6 tests pass, AI-03 satisfied
- `.planning/phases/04-nyquist-validation/04-CONTEXT.md` — Locked user decisions for this phase
- Filesystem listing of `proxy/test/` and `extension/tests/` — Confirmed actual test file names and paths

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — Project history and accumulated decisions; confirms vitest decision origin
- `.planning/REQUIREMENTS.md` — Requirement IDs and their phase assignments

---

## Metadata

**Confidence breakdown:**
- What each VALIDATION.md must contain: HIGH — sourced directly from VERIFICATION.md files
- Correct test commands: HIGH — confirmed by VERIFICATION.md Observable Truths sections
- Frontmatter format: HIGH — sourced from existing 01-VALIDATION.md structure
- Task ID mapping: MEDIUM — requirement-level mapping is clear; task-level IDs require reading PLAN files

**Research date:** 2026-03-14
**Valid until:** Indefinite — this is a documentation task against a frozen codebase
