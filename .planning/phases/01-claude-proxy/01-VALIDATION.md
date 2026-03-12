---
phase: 1
slug: claude-proxy
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `npm test -- --testPathPattern=proxy` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --testPathPattern=proxy`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | PROXY-01 | unit | `npm test -- --testPathPattern=proxy-server` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | PROXY-02 | unit | `npm test -- --testPathPattern=claude-subprocess` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | PROXY-03 | unit | `npm test -- --testPathPattern=launchagent` | ❌ W0 | ⬜ pending |
| 1-01-04 | 01 | 1 | PROXY-04 | unit | `npm test -- --testPathPattern=fallback` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 2 | AI-01 | integration | `npm test -- --testPathPattern=tweet-import` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 2 | AI-02 | integration | `npm test -- --testPathPattern=extension-categorize` | ❌ W0 | ⬜ pending |
| 1-02-03 | 02 | 2 | AI-03 | manual | n/a — LaunchAgent startup | n/a | ⬜ pending |
| 1-02-04 | 02 | 2 | AI-04 | integration | `npm test -- --testPathPattern=graceful-fallback` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/proxy-server.test.js` — stubs for PROXY-01 (proxy starts, listens on :3838)
- [ ] `tests/claude-subprocess.test.js` — stubs for PROXY-02 (claude -p invocation, JSON response)
- [ ] `tests/launchagent.test.js` — stubs for PROXY-03 (plist file existence, PATH includes ~/.local/bin)
- [ ] `tests/fallback.test.js` — stubs for PROXY-04 (proxy unreachable → save without AI metadata)
- [ ] `tests/tweet-import.test.js` — stubs for AI-01 (Twitter JSON → categorized via Claude)
- [ ] `tests/extension-categorize.test.js` — stubs for AI-02 (extension POSTs to proxy → categorized)
- [ ] `tests/graceful-fallback.test.js` — stubs for AI-04 (network error → bookmark saved without AI)
- [ ] `jest.config.js` — jest configuration if not present
- [ ] `npm install --save-dev jest` — if jest not in package.json

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| LaunchAgent auto-starts at login | AI-03 | Requires logout/login cycle; cannot be automated in CI | 1. Install plist to ~/Library/LaunchAgents/; 2. Logout; 3. Login; 4. Check `launchctl list | grep ai-bookmarks-proxy`; 5. Verify port 3838 listening |
| Claude processes bookmarks via subscription (not API key) | PROXY-01 | Requires live Claude subscription session | 1. Start proxy; 2. POST a categorize request; 3. Confirm response came from Claude Sonnet (check logs) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
