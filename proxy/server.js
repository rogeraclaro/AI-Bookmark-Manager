import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const PORT = 3838;
const DEFAULT_CLAUDE_BIN = process.env.CLAUDE_BIN || 'claude';
const DEFAULT_TIMEOUT_MS = 90000;

// Strip Claude Code session env vars so `claude -p` works even when launched
// from within a Claude Code session (development use case).
// Accepts an optional envObject for testability; defaults to process.env.
export function getChildEnv(envObject) {
  const env = { ...(envObject ?? process.env) };
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRYPOINT;
  return env;
}

// Sanitize tweet text (port from geminiService.ts)
function sanitizeText(text) {
  return text
    .replace(/#\w+/g, '')
    .replace(/@\w+/g, '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 700);
}

const categorizeSchema = {
  type: 'object',
  properties: {
    categories: { type: 'array', items: { type: 'string' } },
  },
  required: ['categories'],
};

const tweetSchema = {
  type: 'object',
  properties: {
    originalId: { type: 'string' },
    isAI: { type: 'boolean' },
    title: { type: 'string', maxLength: 80 },
    description: { type: 'string' },
    categories: { type: 'array', items: { type: 'string' } },
    externalLinks: { type: 'array', items: { type: 'string' } },
  },
  required: ['originalId', 'isAI'],
  additionalProperties: false,
};

// Factory function — creates and configures the Express app without binding a port.
// Accepts optional config for testability (claudeBin, claudeTimeout).
export function createApp({ claudeBin = DEFAULT_CLAUDE_BIN, claudeTimeout = DEFAULT_TIMEOUT_MS } = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Invoke claude -p as a subprocess and return parsed structured_output
  async function callClaude(prompt, schema) {
    console.log('[proxy] spawning claude...');
    const result = await new Promise((resolve, reject) => {
      const child = spawn(claudeBin, [
        '-p', prompt,
        '--model', 'claude-sonnet-4-6',
        '--output-format', 'json',
        '--json-schema', JSON.stringify(schema),
        '--no-session-persistence',
      ], {
        cwd: '/tmp',
        env: getChildEnv(),
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (d) => { stdout += d; });
      child.stderr.on('data', (d) => { stderr += d; });
      child.on('error', (err) => { clearTimeout(timer); reject(err); });

      const timer = setTimeout(() => {
        child.kill();
        reject(Object.assign(new Error(`claude timeout after ${claudeTimeout}ms`), { stdout, stderr }));
      }, claudeTimeout);

      child.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          reject(Object.assign(new Error(`claude exited ${code}`), { stdout, stderr }));
        } else {
          try {
            resolve(JSON.parse(stdout));
          } catch {
            reject(Object.assign(new Error(`JSON parse failed`), { stdout: stdout.slice(0, 200), stderr }));
          }
        }
      });
    });
    return result.structured_output;
  }

  app.post('/categorize', async (req, res) => {
    const { url, title, description } = req.body;
    const prompt = `Categorize this bookmark in Catalan. Choose from existing categories.\nURL: ${url}\nTitle: ${title}\nDescription: ${description || ''}`;
    const t0 = Date.now();

    try {
      const result = await callClaude(prompt, categorizeSchema);
      res.json({ categories: result?.categories || [] });
    } catch (err) {
      console.error('[proxy] /categorize failed after', Date.now() - t0, 'ms — code:', err.code, 'signal:', err.signal, 'killed:', err.killed, '\nstdout:', err.stdout?.slice(0, 500), '\nstderr:', err.stderr);
      // Graceful fallback — never crash, bookmark saves without AI metadata
      res.json({ categories: [], error: err.message });
    }
  });

  app.post('/process-tweet', async (req, res) => {
    const { tweet, categories } = req.body;
    const sanitized = sanitizeText(tweet.text || '');
    const categoriesStr = (categories || []).join(', ');
    const prompt = `Process this tweet in Catalan. Assign categories from: ${categoriesStr}.\nID: ${tweet.id}\nText: ${sanitized}\nExternal URLs: ${(tweet.urls || []).join(', ')}`;

    try {
      const result = await callClaude(prompt, tweetSchema);
      res.json(result);
    } catch (err) {
      console.error('[proxy] /process-tweet error:', err.message);
      // Fallback: bookmark from raw text, same pattern as geminiService.ts
      const rawText = tweet.text || '';
      res.json({
        originalId: tweet.id,
        isAI: false,
        title: rawText.length > 80 ? rawText.substring(0, 77) + '...' : rawText || 'Tweet',
        categories: ['Altres'],
        externalLinks: (tweet.urls || []).filter(
          (u) => !u.includes('twitter.com') && !u.includes('x.com'),
        ),
      });
    }
  });

  return app;
}

// Start the server when run directly (not imported as a module in tests)
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const app = createApp();
  app.listen(PORT, 'localhost', () => {
    console.log(`Claude proxy listening on http://localhost:${PORT}`);
  });
}

export default createApp;
