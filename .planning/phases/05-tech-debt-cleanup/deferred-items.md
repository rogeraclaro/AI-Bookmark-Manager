# Deferred Items — Phase 05 Tech Debt Cleanup

## Out-of-Scope Issues Discovered During Execution

### 1. proxy/test/proxy.test.mjs — No vitest test suite

**Found during:** Task 2 (verify clean compile and test suite)
**Nature:** Pre-existing issue — this file uses `node:test` syntax (Phase 01 Wave 0 scaffold)
  and is picked up by vitest runner, which reports "No test suite found".
**Impact:** `npm test` exits 1 even though all 28 actual vitest tests pass.
**Out of scope because:** The file predates Phase 05 and the failure existed before any changes.
**Suggested fix:** Add `proxy/test/proxy.test.mjs` to vitest `exclude` config in vite.config.ts,
  or convert the file to vitest syntax.
