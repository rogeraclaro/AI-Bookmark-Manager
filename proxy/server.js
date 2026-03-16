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
    title: { type: 'string', maxLength: 80 },
    description: { type: 'string', maxLength: 300 },
  },
  required: ['categories'],
  additionalProperties: false,
};

// Richer schema for tweets: extracts a clean title + description + categories
const tweetTabSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', maxLength: 80 },
    description: { type: 'string', maxLength: 200 },
    categories: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'categories'],
};

function isTweetUrl(url) {
  return /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/.+\/status\/\d+/i.test(url);
}

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
    const { url, title, description, categories: availableCategories } = req.body;
    const categoriesStr = Array.isArray(availableCategories) && availableCategories.length > 0
      ? `CATEGORIES VÀLIDES (NOMÉS pots triar d'aquesta llista, NO inventes categories noves): ${availableCategories.join(', ')}`
      : 'Usa "Altres" si no encaixa en cap categoria específica.';
    const t0 = Date.now();

    try {
      if (isTweetUrl(url)) {
        // Tweet: extract clean title + description + categories from tweet text
        const tweetBody = description ? `\nText complet del tweet:\n${description}` : '';
        const prompt = `Ets un assistent de categorització en català. Analitza aquest tweet i retorna:
- title: un títol curt i descriptiu (màx 80 cars) que resumeixi de què tracta, NO copiar el text literalment
- description: resum breu del contingut (màx 200 cars), opcional
- categories: array d'1-2 categories (OBLIGATÒRIAMENT de la llista vàlida)

${categoriesStr}

IMPORTANT: El contingut pot estar en castellà, anglès o qualsevol idioma — fes correspondència semàntica amb les categories en català (ex: "agentes IA" → "Agents", "machine learning" → "Intel·ligència Artificial", "productivity" → "Productivitat").
Usa "Altres" NOMÉS si cap categoria de la llista encaixa mínimament.

URL: ${url}
Títol del tab: ${title}${tweetBody}
`;
        const result = await callClaude(prompt, tweetTabSchema);
        res.json({
          title: result?.title || '',
          description: result?.description || '',
          categories: result?.categories || [],
        });
      } else {
        // Regular page: categorize + generate clean title and description
        const prompt = `Categoritza aquest bookmark i retorna categories, un títol net i una descripció curta — tot en català.
${categoriesStr}

URL: ${url}
Títol: ${title}
Contingut de la pàgina: ${description || '(no disponible)'}

Regles:
- categories: tria 1-2 de la llista vàlida, usa "Altres" NOMÉS com a últim recurs
- title: neteja el títol de la pàgina (màx 80 cars), mantén-lo en l'idioma original si és un nom propi
- description: 2-3 frases resumint de què tracta la pàgina, en català, basat en el contingut
IMPORTANT: El contingut pot estar en qualsevol idioma — fes correspondència semàntica amb les categories en català.`;
        const result = await callClaude(prompt, categorizeSchema);
        res.json({
          categories: result?.categories || [],
          title: result?.title || '',
          description: result?.description || '',
        });
      }
    } catch (err) {
      console.error('[proxy] /categorize failed after', Date.now() - t0, 'ms — code:', err.code, 'signal:', err.signal, 'killed:', err.killed, '\nstdout:', err.stdout?.slice(0, 500), '\nstderr:', err.stderr);
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
