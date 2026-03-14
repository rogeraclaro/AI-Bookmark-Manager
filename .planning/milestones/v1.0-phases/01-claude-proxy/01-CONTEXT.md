# Phase 1: Claude Proxy - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a local Node.js proxy server that authenticates to the Anthropic API using the Claude CLI session token, expose it on `localhost:3838`, and update both the web app and Chrome extension to route all AI calls through it instead of calling Gemini directly from the browser.

Scope: proxy server, LaunchAgent auto-start on both Macs, `claudeService.ts` as drop-in replacement for `geminiService.ts`, extension updated to call proxy. No new AI capabilities, no UI changes beyond removing Gemini-specific UI (e.g., TrialCountdown component).

</domain>

<decisions>
## Implementation Decisions

### Claude model
- Use `claude-sonnet-4-6` for all AI processing (tweet categorization and webpage bookmark categorization)
- Process one tweet at a time (BATCH_SIZE=1), same as existing Gemini approach
- 90-second timeout per request, matching existing behavior
- Retry logic on failure with fallback: if all retries exhausted, create bookmark from raw text (same fallback pattern as geminiService.ts)

### Port & discovery
- Fixed port `3838` on both Macs — same port everywhere
- Web app: set `VITE_CLAUDE_PROXY_URL=http://localhost:3838` in `.env`
- Chrome extension: hardcode proxy URL in `extension/shared/config.ts` alongside existing API URL (consistent with current pattern — extension can't read `.env`)
- No port auto-discovery needed

### Proxy server location
- Live in `proxy/` directory at project root
- Structure: `proxy/server.js`, `proxy/package.json`, `proxy/install.sh`
- Separate from React app — independent Node.js process
- The proxy is a lightweight Express (or similar) HTTP server

### LaunchAgent setup
- One-time `install.sh` script per Mac
- Script: copies plist to `~/Library/LaunchAgents/`, substitutes correct absolute paths (handles Mac mini vs MacBook Air home directory differences), runs `launchctl load`
- plist template lives in `proxy/com.ailinks.claude-proxy.plist`
- LaunchAgent runs as the user's process (not system-level root), so it can read Claude CLI token from user context

### Claude CLI token discovery
- **Researcher must investigate**: exact location of Claude CLI session token on macOS (likely `~/.claude/` config directory or macOS Keychain)
- STATE.md already flagged this as the key blocker to confirm before implementing PROXY-01
- Proxy reads token at startup (or on each request) and passes as `Authorization: Bearer {token}` to Anthropic API

### Prompt strategy
- Same output structure as Gemini: `{ originalId, isAI, title, categories, externalLinks }` — `claudeService.ts` is a drop-in replacement
- **Improved prompts**: better Catalan, more natural language (not just porting Gemini prompts verbatim)
- **Tool use (function calling)** for structured output — most reliable way to enforce JSON schema with Claude
- Prompts defined directly in `claudeService.ts` (not in `translations.ts` — prompts are Claude-specific and tool-use formatted)
- Keep title max 80 chars, description in Catalan, categories from existing list, isAI boolean

### claudeService.ts interface
- Export: `processBookmarksWithClaude(rawTweets, currentCategories, onProgress, onLog, signal)` — identical signature to `processBookmarksWithGemini`
- `App.tsx` only needs import swapped: `geminiService` → `claudeService`
- Remove `getTrialInfo()` and `TrialCountdown` component (Gemini-specific, no longer relevant)

### Extension categorization
- Webpage save flow (PROXY-04 / AI-03): extension service worker calls proxy instead of Gemini
- Proxy exposes a `/categorize` endpoint that accepts `{ url, title, description }` and returns `{ categories }`
- Graceful fallback (AI-04): if proxy unreachable (connection refused / timeout), save bookmark without AI metadata — no crash, user sees bookmark saved without categories

### Claude's Discretion
- Exact Node.js HTTP framework for proxy (Express, Fastify, or native http — keep it minimal)
- Error logging format in proxy server
- plist retry/throttle configuration for LaunchAgent
- Exact Anthropic SDK version

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `geminiService.ts`: Complete implementation to port — all retry logic, fallback pattern, onProgress/onLog callbacks, AbortSignal support. Reuse structure, replace API calls.
- `extension/shared/config.ts`: Add `CLAUDE_PROXY_URL = 'http://localhost:3838'` alongside existing `API_CONFIG`
- `extension/shared/api.ts`: Add a `callClaudeProxy()` function using existing `apiRequest` pattern
- `src/services/storage.ts`: No changes needed — storage layer is independent of AI provider
- `src/translations.ts`: `strings.prompts.systemInstruction` can be referenced but prompts will be rewritten for Claude tool-use format

### Established Patterns
- Batch processing with retry + backoff: `geminiService.ts` lines 200–283 — copy structure directly
- Fallback bookmark creation: `geminiService.ts` lines 265–279 — reuse exact pattern in `claudeService.ts`
- Message-passing in extension: `{type: 'SAVE_BOOKMARK', data: bookmark}` in `service-worker.ts` — proxy call goes here
- Error handling: try-catch → onLog callback → fallback — consistent throughout

### Integration Points
- `App.tsx`: Replace `import { processBookmarksWithGemini } from './services/geminiService'` with `claudeService`
- `App.tsx`: Remove `TrialCountdown` component import and usage
- `extension/background/service-worker.ts`: Replace direct Gemini call (if any) with proxy HTTP call
- `extension/popup/popup.tsx`: Likely calls service worker via message — no direct change needed

</code_context>

<specifics>
## Specific Ideas

- Proxy port `3838` — memorable, no conflicts with Vite (5173), the bookmark API, or common dev ports
- The proxy is intentionally dumb: it just reads the Claude CLI token, forwards requests to Anthropic API, and returns the response. No caching, no queuing — keep it minimal.
- `install.sh` should detect the current Mac's home directory automatically (`$HOME`), so the same script works on Mac mini and MacBook Air without editing
- LaunchAgent should use `StandardOutPath` / `StandardErrorPath` for log output to `~/Library/Logs/claude-proxy.log` — useful for debugging if proxy fails to start

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-claude-proxy*
*Context gathered: 2026-03-12*
