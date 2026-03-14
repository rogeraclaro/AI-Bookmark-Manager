---
phase: 6
phase_slug: final-polish
date: 2026-03-14
nyquist_compliant: false
---

# Phase 6: Final Polish — Validation Strategy

## Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest (via `npm run test`) |
| Config file | vite.config.ts (vitest config embedded) |
| Quick run | `npm run test` |
| Full suite | `npm run test` |
| Build gate | `npm run build` (runs `tsc -b`) |

## Phase Requirements → Test Map

Phase 6 has no functional requirements — it is code hygiene only. The existing test suite acts as a regression guard.

| Scope | Behavior | Test Type | Automated Command | Coverage |
|-------|----------|-----------|-------------------|----------|
| Regression: extension types | Message union change does not break tests | unit | `npm run test` | extension/__tests__/ |
| Regression: extension config | ERRORS object change does not break tests | unit | `npm run test` | extension/__tests__/ |
| Build gate: TypeScript | Removed items leave no dangling references | compile | `npm run build` | compiler (tsc -b) |

## Sampling Rate

- **Per task commit:** `npm run build` — confirms tsc passes after each individual change
- **Per wave merge:** `npm run test` — confirms 28 vitest tests still green
- **Phase gate:** Build green + 28/28 vitest green before `/gsd:verify-work`

## Wave 0 Gaps

None — existing test infrastructure covers regression detection. No new test files are needed for a dead code removal phase.

## Verification Oracle

The TypeScript compiler (`tsc -b` via `npm run build`) is the authoritative verification oracle:
- If build passes after removing a type/constant, it was genuinely unused
- If build fails, a dangling reference remains and must be resolved before committing
