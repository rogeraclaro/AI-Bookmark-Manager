# Phase 1: Claude Proxy - Research

**Researched:** 2026-03-12
**Domain:** Node.js proxy server, Claude CLI headless mode, macOS LaunchAgent, Anthropic SDK
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Model: `claude-sonnet-4-6` for all AI processing
- Batch size: BATCH_SIZE=1 (one tweet at a time), matching existing Gemini approach
- Timeout: 90-second per request, matching existing behavior
- Retry logic: on failure with fallback (create bookmark from raw text), same pattern as geminiService.ts
- Port: fixed `3838` on both Macs
- Web app: `VITE_CLAUDE_PROXY_URL=http://localhost:3838` in `.env`
- Chrome extension: hardcode proxy URL in `extension/shared/config.ts`
- Proxy location: `proxy/` directory at project root
- Structure: `proxy/server.js`, `proxy/package.json`, `proxy/install.sh`
- LaunchAgent: one-time `install.sh` script per Mac, copies plist to `~/Library/LaunchAgents/`, uses `$HOME` for path substitution, runs `launchctl load`
- plist template: `proxy/com.ailinks.claude-proxy.plist`
- LaunchAgent runs as user process (not root)
- Proxy exposes `/categorize` endpoint accepting `{ url, title, description }`, returns `{ categories }`
- Graceful fallback (AI-04): save bookmark without AI metadata if proxy unreachable
- claudeService.ts interface: `processBookmarksWithClaude(rawTweets, currentCategories, onProgress, onLog, signal)` — drop-in for `processBookmarksWithGemini`
- Remove `getTrialInfo()` and `TrialCountdown` component
- Tool use (function calling) for structured output
- Prompts defined directly in `claudeService.ts`, not in `translations.ts`
- Title max 80 chars, description in Catalan, categories from existing list, isAI boolean
- LaunchAgent log to `~/Library/Logs/claude-proxy.log`

### Claude's Discretion
- Exact Node.js HTTP framework for proxy (Express, Fastify, or native http — keep it minimal)
- Error logging format in proxy server
- plist retry/throttle configuration for LaunchAgent
- Exact Anthropic SDK version

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROXY-01 | Proxy server reads Claude CLI session token and authenticates to Anthropic API | **Critical finding**: OAuth token approach is blocked as of Feb 2026. Use `claude -p` CLI subprocess instead — uses subscription automatically, no token extraction needed |
| PROXY-02 | Proxy exposes HTTP local endpoint on localhost:PORT for AI requests | Standard Express server on port 3838; routes `/categorize` (extension) and `/process-tweets` (web app) |
| PROXY-03 | macOS LaunchAgent auto-start at login on both Macs | Standard plist in `~/Library/LaunchAgents/`, `launchctl load` in install.sh, `$HOME` for path portability |
| PROXY-04 | Web app and extension call proxy instead of Gemini directly | Web app: `VITE_CLAUDE_PROXY_URL` env var; extension: hardcoded URL in `config.ts` |
| AI-01 | `claudeService.ts` replaces `geminiService.ts` with same public interface | Drop-in replacement; same function signature; uses proxy HTTP call instead of Google SDK |
| AI-02 | Tweet processing (categorization, title, description, isAI) via Claude | Proxy calls `claude -p --model claude-sonnet-4-6 --output-format json --json-schema '...'` |
| AI-03 | Webpage categorization from extension via Claude | `/categorize` endpoint on proxy; same CLI subprocess approach |
| AI-04 | Graceful fallback when proxy unreachable | try/catch on fetch to proxy; `ECONNREFUSED` / timeout → save bookmark without AI metadata |
</phase_requirements>

---

## Summary

The planned proxy approach (reading Claude CLI OAuth token from macOS Keychain and forwarding as Bearer to Anthropic API) is **blocked as of February 2026**. Anthropic explicitly banned use of Claude subscription OAuth tokens in third-party applications and enforced client fingerprinting to detect unofficial use. The `~/.claude/.credentials.json` file and Keychain entry `"Claude Code-credentials"` contain tokens that Anthropic will reject for direct API calls from non-Claude-Code clients.

The correct alternative is using the Claude CLI in headless mode: `claude -p --model claude-sonnet-4-6 --output-format json --json-schema '{...}'`. This calls the actual Anthropic API through the official Claude Code client, uses the Pro/Max subscription session automatically, and supports structured JSON schema output natively. The proxy becomes a thin HTTP wrapper that spawns the `claude` CLI as a child process and returns the result.

The second key finding is that `claude -p` cannot be spawned from within an active Claude Code session (it throws an error about nested sessions). However, this is not a problem for production: the proxy runs as a LaunchAgent, which starts independently at login outside of any Claude Code session. Developers testing locally need to be aware of this limitation.

**Primary recommendation:** Proxy calls `claude -p --model claude-sonnet-4-6 --output-format json --json-schema` as a subprocess. No token extraction, no keychain reads, no Bearer header manipulation needed.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js (built-in) | 18+ (system) | Runtime for proxy | Already installed via Claude Code; LaunchAgent uses system node |
| express | ^5.x or ^4.x | HTTP server | Minimal, well-known, handles routing and middleware cleanly |
| child_process (built-in) | Node built-in | Spawn `claude -p` subprocess | No additional deps; `execFile` / `spawn` are the right primitives |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| cors | ^2.x | CORS headers for localhost | Browser-to-proxy calls need CORS; extension fetch to localhost also needs it |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Express | Native `http` module | Native is 20 lines more code, no routing; Express is a known quantity and worth the ~1MB dep for maintainability |
| Express | Fastify | Fastify is faster but overkill for a single-machine personal tool processing 1 request at a time |
| `claude -p` subprocess | `@anthropic-ai/sdk` with API key | SDK requires a separate paid API key; `claude -p` uses existing subscription transparently |

**Installation:**
```bash
cd proxy && npm install express cors
```

---

## Architecture Patterns

### Recommended Project Structure
```
proxy/
├── server.js              # Express server; main entry point
├── package.json           # {"type":"module"} or CommonJS — match existing codebase style
├── install.sh             # One-time setup: copies plist, runs launchctl load
└── com.ailinks.claude-proxy.plist  # LaunchAgent plist template (uses $HOME)
```

### Pattern 1: Claude CLI Subprocess Call

**What:** Proxy spawns `claude -p` with `--output-format json` and `--json-schema` for structured output. stdin receives the prompt; stdout returns JSON.

**When to use:** Every AI request to the proxy — both tweet processing and webpage categorization.

**Key detail:** The CLI model flag is `--model claude-sonnet-4-6` (full model name, not an alias).

**Example:**
```javascript
// Source: https://code.claude.com/docs/en/headless (official docs)
import { execFile } from 'child_process';
import { promisify } from 'util';
const execFileAsync = promisify(execFile);

const schema = JSON.stringify({
  type: 'object',
  properties: {
    categories: { type: 'array', items: { type: 'string' } }
  },
  required: ['categories']
});

const { stdout } = await execFileAsync('claude', [
  '-p', prompt,
  '--model', 'claude-sonnet-4-6',
  '--output-format', 'json',
  '--json-schema', schema
], {
  timeout: 90000,
  env: { ...process.env }
});

const response = JSON.parse(stdout);
// response.structured_output contains the schema-validated result
// response.result contains raw text output
```

### Pattern 2: LaunchAgent plist

**What:** Standard macOS user-level LaunchAgent that starts the proxy on login.

**When to use:** Single `com.ailinks.claude-proxy.plist` file, installed per Mac.

**Example:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.ailinks.claude-proxy</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>  <!-- install.sh substitutes correct path -->
    <string>__PROXY_DIR__/server.js</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>HOME</key>
    <string>__HOME__</string>
    <key>PATH</key>
    <string>/usr/local/bin:/usr/bin:/bin:__HOME__/.local/bin</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>__HOME__/Library/Logs/claude-proxy.log</string>
  <key>StandardErrorPath</key>
  <string>__HOME__/Library/Logs/claude-proxy.log</string>
</dict>
</plist>
```

**Critical detail:** The `PATH` in the plist environment MUST include `~/.local/bin` because that is where the `claude` binary lives on this machine (`/Users/rogermasellas/.local/bin/claude`). Without it, the subprocess call will fail with `ENOENT`.

### Pattern 3: install.sh path substitution

**What:** Shell script that replaces `__HOME__` and `__PROXY_DIR__` tokens with the current Mac's actual values.

```bash
#!/bin/bash
set -e
PROXY_DIR="$(cd "$(dirname "$0")" && pwd)"
PLIST_SRC="$PROXY_DIR/com.ailinks.claude-proxy.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/com.ailinks.claude-proxy.plist"
LOGS_DIR="$HOME/Library/Logs"

mkdir -p "$LOGS_DIR"
sed -e "s|__HOME__|$HOME|g" -e "s|__PROXY_DIR__|$PROXY_DIR|g" "$PLIST_SRC" > "$PLIST_DEST"
launchctl load "$PLIST_DEST"
echo "Proxy installed and started."
```

### Anti-Patterns to Avoid

- **Extracting OAuth token from Keychain and using as Bearer:** Blocked since February 2026 — Anthropic enforces client fingerprinting and will return 401.
- **Reading `~/.claude/.credentials.json` directly:** Same problem; tokens are tagged to Claude Code official client only.
- **Spawning `claude -p` inside a Claude Code session:** Will fail with "nested sessions" error. Only matters for local development/testing; the LaunchAgent runs outside any Claude Code session.
- **Hardcoding the node binary path:** Node path differs between Macs; use `which node` in install.sh or make `PATH` broad enough in the plist.
- **Using `KeepAlive: false`:** The proxy should restart if it crashes; use `KeepAlive: true`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Structured JSON output from Claude | Custom regex/JSON parser on text responses | `--json-schema` flag with `--output-format json` | CLI enforces schema compliance natively; no parse errors |
| HTTP routing | Custom request parsing | Express (minimal) | Even for 2 routes, manual routing is fragile with body parsing edge cases |
| Process management / auto-restart | Custom watchdog script | `KeepAlive: true` in LaunchAgent plist | launchd handles restart, crash recovery, and logging natively |
| CORS headers | Manual header injection | `cors` npm package | Gets the preflight OPTIONS handling right automatically |

**Key insight:** The `claude -p --json-schema` combination eliminates the entire class of JSON parsing problems that `geminiService.ts` had to work around (contaminated titles, truncated JSON, trailing commas, control characters). With schema enforcement, the output is always valid.

---

## Common Pitfalls

### Pitfall 1: `claude` binary not on PATH in LaunchAgent context

**What goes wrong:** The proxy starts via LaunchAgent but subprocess calls to `claude -p` fail with `ENOENT` or `spawn ENOENT`.

**Why it happens:** LaunchAgents run with a minimal environment. The PATH they inherit is not the interactive shell PATH. The `claude` binary lives at `~/.local/bin/claude` (confirmed: `/Users/rogermasellas/.local/bin/claude`) — a non-standard location.

**How to avoid:** Set the `PATH` in the plist `EnvironmentVariables` to explicitly include `__HOME__/.local/bin`. Alternatively, detect the full path to `claude` in `install.sh` and write the absolute path into the plist's ProgramArguments or into a config file that `server.js` reads.

**Warning signs:** `Error: spawn ENOENT` or `ENOENT: no such file or directory` in `~/Library/Logs/claude-proxy.log`.

### Pitfall 2: `CLAUDECODE=1` env var leaks into subprocess

**What goes wrong:** If the proxy server is ever launched manually from within a Claude Code session (for development/testing), the `CLAUDECODE=1` env var is inherited by child processes, and `claude -p` refuses to run with "nested session" error.

**Why it happens:** Claude Code sets `CLAUDECODE=1` and `CLAUDE_CODE_ENTRYPOINT=cli`. When spawning subprocesses, Node.js inherits the parent's environment by default.

**How to avoid:** In the `execFile` / `spawn` call, delete these variables from the child env:
```javascript
const childEnv = { ...process.env };
delete childEnv.CLAUDECODE;
delete childEnv.CLAUDE_CODE_ENTRYPOINT;
```

**Warning signs:** `Error: Claude Code cannot be launched inside another Claude Code session` in proxy logs or HTTP response.

### Pitfall 3: `launchctl load` vs `launchctl bootstrap` on modern macOS

**What goes wrong:** On macOS 12+, `launchctl load` is technically deprecated in favor of `launchctl bootstrap`. However, `launchctl load` still works for user-level LaunchAgents and is simpler.

**Why it happens:** Apple deprecated the load/unload subcommands in favor of bootstrap/bootout in macOS Monterey (12.0).

**How to avoid:** Use `launchctl load` in `install.sh` — it still works. Alternatively, use `launchctl bootstrap gui/$(id -u) $PLIST_DEST` for forward compatibility. Document the difference in a comment.

**Warning signs:** Deprecation warnings in terminal output from `install.sh` — not a functional failure.

### Pitfall 4: Extension `fetch` to `localhost` blocked by Chrome extension security

**What goes wrong:** Chrome extensions with Manifest V3 need explicit `host_permissions` to fetch from `localhost`. Without it, the fetch to `http://localhost:3838` is silently blocked.

**Why it happens:** MV3 extensions require declarative `host_permissions` in manifest.json for all domains, including localhost.

**How to avoid:** Add `"http://localhost:3838/*"` to `host_permissions` in `extension/manifest.json`.

**Warning signs:** Network error in extension with no response, or console error about blocked request.

### Pitfall 5: `claude -p` startup time causes timeout on first request

**What goes wrong:** The first invocation of `claude -p` takes 2–5 seconds for process startup (especially if Claude Code initializes workspace scanning). The 90-second timeout is generous, but the *per-request* startup overhead adds up when processing many tweets.

**Why it happens:** The `claude` CLI does workspace initialization on every invocation, even with `--no-session-persistence`.

**How to avoid:** Use `--no-session-persistence` to skip session saving. Set working directory to `/tmp` or a simple neutral directory (not the project root) to avoid workspace scanning. Also add `--allowedTools ''` or avoid prompts that might trigger tool use.

**Warning signs:** Processing 100 tweets taking 200+ seconds total instead of expected 100 × 2s = 200s (acceptable) vs 100 × 10s = 1000s (bad).

---

## Code Examples

Verified patterns from official sources:

### Proxy server entry point (proxy/server.js)
```javascript
// Source: Express docs + Node.js child_process docs
import express from 'express';
import cors from 'cors';
import { execFile } from 'child_process';
import { promisify } from 'util';
const execFileAsync = promisify(execFile);

const app = express();
app.use(cors());
app.use(express.json());

const CLAUDE_BIN = process.env.CLAUDE_BIN || 'claude';
const TIMEOUT_MS = 90000;

// Remove nested-session env vars so claude -p works even if launched manually
function getChildEnv() {
  const env = { ...process.env };
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRYPOINT;
  return env;
}

app.post('/categorize', async (req, res) => {
  const { url, title, description } = req.body;
  const schema = JSON.stringify({ /* see full schema in Code Examples below */ });
  const prompt = `Categorize this bookmark: URL: ${url}\nTitle: ${title}\nDescription: ${description}`;

  try {
    const { stdout } = await execFileAsync(CLAUDE_BIN, [
      '-p', prompt,
      '--model', 'claude-sonnet-4-6',
      '--output-format', 'json',
      '--json-schema', schema,
      '--no-session-persistence'
    ], { timeout: TIMEOUT_MS, env: getChildEnv() });

    const parsed = JSON.parse(stdout);
    res.json({ categories: parsed.structured_output?.categories || [] });
  } catch (err) {
    // Fallback: return empty categories
    res.json({ categories: [], error: err.message });
  }
});

app.listen(3838, 'localhost', () => {
  console.log('Claude proxy listening on http://localhost:3838');
});
```

### JSON schema for tweet processing
```javascript
// Schema matching geminiService.ts output structure
const tweetSchema = {
  type: 'object',
  properties: {
    originalId: { type: 'string' },
    isAI: { type: 'boolean' },
    title: { type: 'string', maxLength: 80 },
    description: { type: 'string' },
    categories: { type: 'array', items: { type: 'string' } },
    externalLinks: { type: 'array', items: { type: 'string' } }
  },
  required: ['originalId', 'isAI'],
  additionalProperties: false
};
```

### Extension graceful fallback (extension/shared/api.ts)
```typescript
// Source: established pattern in existing api.ts
export async function callClaudeProxy(data: {url: string; title: string; description: string}): Promise<{categories: string[]}> {
  try {
    const response = await fetch(`${CLAUDE_PROXY_URL}/categorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(10000) // 10s timeout for proxy reachability check
    });
    if (!response.ok) return { categories: [] };
    return await response.json();
  } catch {
    // Proxy unreachable — graceful fallback, bookmark saved without AI metadata
    return { categories: [] };
  }
}
```

### claudeService.ts fetch to proxy
```typescript
// Web app calling proxy for tweet processing
const response = await fetch(`${import.meta.env.VITE_CLAUDE_PROXY_URL}/process-tweet`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tweet: simplifiedTweet, categories: currentCategories }),
  signal // AbortSignal forwarded from App.tsx
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Claude Code OAuth token as Bearer header | Blocked — Anthropic banned it | February 2026 | Proxy must use `claude -p` subprocess instead of direct API calls |
| `launchctl load` | `launchctl bootstrap gui/$(id -u) <plist>` | macOS 12 (2021) | `launchctl load` still works but is deprecated; either works |
| Gemini `responseMimeType: 'application/json'` | Claude `--json-schema` + `--output-format json` | N/A (different API) | Claude's schema enforcement eliminates JSON parsing hacks in geminiService.ts |
| Gemini structured output via responseSchema | Claude native structured outputs (GA Nov 2025) | Nov 2025 (GA) | `output_config.format` with `type: json_schema` if using SDK directly; but `--json-schema` CLI flag is simpler here |

**Deprecated/outdated:**
- Keychain OAuth token reading approach: rejected at API level since Feb 2026
- Nested `claude -p` calls (must unset `CLAUDECODE` env var for local dev)

---

## Open Questions

1. **`claude -p` startup time per invocation**
   - What we know: The CLI initializes workspace context on each run. With `--no-session-persistence`, session saving is skipped.
   - What's unclear: Whether running from `/tmp` or an empty directory meaningfully reduces startup time vs. the project root.
   - Recommendation: In `server.js`, set `cwd: '/tmp'` in the `execFile` options to avoid workspace scanning entirely. Test with a small batch before committing to the architecture.

2. **Node.js path in plist on Mac mini vs MacBook Air**
   - What we know: Node is typically at `/usr/local/bin/node` (Homebrew Intel) or `/opt/homebrew/bin/node` (Homebrew Apple Silicon).
   - What's unclear: Which architecture each Mac uses and where node lives.
   - Recommendation: `install.sh` should detect the node path with `which node` and substitute it into the plist, not hardcode `/usr/local/bin/node`.

3. **`claude -p` behavior with `--model claude-sonnet-4-6` against subscription quota**
   - What we know: Claude Pro/Max subscriptions have usage limits (not per-request costs), and `claude -p` uses the authenticated subscription session.
   - What's unclear: Whether processing hundreds of tweets in a session will hit rate limits.
   - Recommendation: Keep BATCH_SIZE=1 with the existing 2s inter-request delay from geminiService.ts. Add a check in the proxy response for any rate-limit error messages from the CLI.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | No test framework currently exists in this project |
| Config file | None — Wave 0 must create it |
| Quick run command | `node --test proxy/test/proxy.test.mjs` (Node.js built-in test runner) |
| Full suite command | `node --test proxy/test/` |

**Rationale:** The project has no existing test infrastructure. Node.js 18+ has a built-in test runner (`node:test` module) that requires zero dependencies — appropriate for a personal tool with a simple proxy.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROXY-01 | `getChildEnv()` removes CLAUDECODE env vars | unit | `node --test proxy/test/proxy.test.mjs` | ❌ Wave 0 |
| PROXY-02 | `/categorize` returns `{categories}` on valid input | integration (mock claude) | `node --test proxy/test/proxy.test.mjs` | ❌ Wave 0 |
| PROXY-02 | `/process-tweet` returns structured result on valid input | integration (mock claude) | `node --test proxy/test/proxy.test.mjs` | ❌ Wave 0 |
| PROXY-03 | `install.sh` produces valid plist with correct HOME substitution | smoke | `bash proxy/test/test-install.sh` | ❌ Wave 0 |
| PROXY-04 | `VITE_CLAUDE_PROXY_URL` env var is read by claudeService.ts | unit | (TypeScript; manual verify) | ❌ Wave 0 |
| AI-01 | `claudeService.ts` exports `processBookmarksWithClaude` with correct signature | type check | `tsc --noEmit` | ❌ Wave 0 |
| AI-04 | Fetch to proxy with connection refused returns empty categories | unit | `node --test proxy/test/proxy.test.mjs` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test proxy/test/proxy.test.mjs` (unit tests only, mocked claude)
- **Per wave merge:** Full proxy test suite
- **Phase gate:** All tests green + manual end-to-end before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `proxy/test/proxy.test.mjs` — unit + integration tests with mocked `claude` binary
- [ ] `proxy/test/test-install.sh` — validates plist substitution output
- [ ] Node test runner built-in — no install needed (Node 18+)

---

## Sources

### Primary (HIGH confidence)
- [code.claude.com/docs/en/headless](https://code.claude.com/docs/en/headless) — `claude -p` flags, `--json-schema`, `--output-format json`, `--model` flag
- [code.claude.com/docs/en/authentication](https://code.claude.com/docs/en/authentication) — credential storage on macOS Keychain under "Claude Code-credentials"
- Live system verification: `security find-generic-password -s "Claude Code-credentials" -w` returns `{"claudeAiOauth":{"accessToken":"sk-ant-oat01-..."}}` — token format confirmed
- Live system verification: `CLAUDECODE=1` env var confirmed set in active Claude Code sessions
- Live system verification: `claude` binary at `/Users/rogermasellas/.local/bin/claude`, version 2.1.74
- [platform.claude.com/docs/en/build-with-claude/structured-outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) — structured outputs GA for claude-sonnet-4-6

### Secondary (MEDIUM confidence)
- [winbuzzer.com — Anthropic Bans Claude Subscription OAuth in Third-Party Apps](https://winbuzzer.com/2026/02/19/anthropic-bans-claude-subscription-oauth-in-third-party-apps-xcxwbn/) — Feb 2026 OAuth ban confirmed
- [github.com/anthropics/claude-code/issues/29816](https://github.com/anthropics/claude-code/issues/29816) — `~/.claude/.credentials.json` fallback when Keychain unavailable (SSH)
- [github.com/anthropics/claude-code/issues/9403](https://github.com/anthropics/claude-code/issues/9403) — macOS Keychain storage for Claude Code confirmed
- [betterprogramming.pub — Schedule Node.js scripts with launchd](https://betterprogramming.pub/schedule-node-js-scripts-on-your-mac-with-launchd-a7fca82fbf02) — LaunchAgent plist structure for Node.js

### Tertiary (LOW confidence)
- [dev.to — How to Recover Claude Code OAuth Token in 30 Seconds](https://dev.to/anicca_301094325e/how-to-recover-claude-code-oauth-token-in-30-seconds-1hd) — token format details (flagged: may no longer work as of Feb 2026)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Express + Node.js built-ins confirmed; `claude -p` subprocess approach verified with live CLI
- Architecture: HIGH — `claude -p` docs are current official docs; LaunchAgent plist is standard macOS; env var pitfall verified live
- Pitfalls: HIGH — OAuth ban verified from multiple sources; `CLAUDECODE=1` nested session error verified live; `~/.local/bin` path verified live
- Validation architecture: MEDIUM — no existing tests, Wave 0 gaps identified, Node built-in test runner confirmed available

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (30 days; Claude Code CLI interface is stable but Anthropic OAuth policy is fast-moving)
