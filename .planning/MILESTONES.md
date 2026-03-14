# Milestones

## v1.0 MVP (Shipped: 2026-03-14)

**Phases completed:** 6 phases, 11 plans
**Files changed:** 119 | +26,008 / -1,679 lines
**Codebase:** ~4,084 lines TypeScript/TSX
**Timeline:** 2025-12-03 → 2026-03-14 (102 days, 105 commits)

**Key accomplishments:**
- Local Claude proxy (Express + macOS LaunchAgent) replaces Gemini API — auto-starts at login on both Macs
- `claudeService.ts` drop-in replaces `geminiService.ts` — web app and extension route AI through localhost:3838
- Chrome Tabs feature — filter bar, multi-select, bulk save with per-row inline status and retry-failed flow
- AI-03 single-page save regression fixed — Claude categorization with 3-tier fallback (Claude → user selection → Altres)
- Nyquist validation compliance across Phases 1–3 (all tests documented and passing)
- Full Gemini teardown — deleted `geminiService.ts`, `TrialCountdown.tsx`, `@google/genai` (56 packages), 4 dead-code relics

---

