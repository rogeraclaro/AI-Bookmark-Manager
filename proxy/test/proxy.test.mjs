// Wave 0 scaffold — tests intentionally fail until proxy/server.js is created in Plan 02
import { test, after, before, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_PATH = path.resolve(__dirname, '../server.js');
const MOCK_CLAUDE_BIN = path.resolve(__dirname, 'mock-claude.sh');
const TEST_PORT = 13838;

// ---------------------------------------------------------------------------
// Unit tests: getChildEnv()
// ---------------------------------------------------------------------------

describe('getChildEnv()', () => {
  test('removes CLAUDECODE from env', async () => {
    let getChildEnv;
    try {
      ({ getChildEnv } = await import(SERVER_PATH));
    } catch (err) {
      throw new Error(`Cannot import server.js (expected until Plan 02): ${err.message}`);
    }

    const input = {
      HOME: '/Users/test',
      PATH: '/usr/bin:/bin',
      CLAUDECODE: '1',
      CLAUDE_CODE_ENTRYPOINT: 'cli',
    };
    const result = getChildEnv(input);
    assert.ok(!Object.prototype.hasOwnProperty.call(result, 'CLAUDECODE'),
      'CLAUDECODE should be removed');
  });

  test('removes CLAUDE_CODE_ENTRYPOINT from env', async () => {
    let getChildEnv;
    try {
      ({ getChildEnv } = await import(SERVER_PATH));
    } catch (err) {
      throw new Error(`Cannot import server.js (expected until Plan 02): ${err.message}`);
    }

    const input = {
      HOME: '/Users/test',
      PATH: '/usr/bin:/bin',
      CLAUDECODE: '1',
      CLAUDE_CODE_ENTRYPOINT: 'cli',
    };
    const result = getChildEnv(input);
    assert.ok(!Object.prototype.hasOwnProperty.call(result, 'CLAUDE_CODE_ENTRYPOINT'),
      'CLAUDE_CODE_ENTRYPOINT should be removed');
  });

  test('preserves other env vars (HOME, PATH)', async () => {
    let getChildEnv;
    try {
      ({ getChildEnv } = await import(SERVER_PATH));
    } catch (err) {
      throw new Error(`Cannot import server.js (expected until Plan 02): ${err.message}`);
    }

    const input = {
      HOME: '/Users/test',
      PATH: '/usr/bin:/bin',
      CLAUDECODE: '1',
    };
    const result = getChildEnv(input);
    assert.strictEqual(result.HOME, '/Users/test', 'HOME should be preserved');
    assert.strictEqual(result.PATH, '/usr/bin:/bin', 'PATH should be preserved');
  });
});

// ---------------------------------------------------------------------------
// Integration tests: POST /categorize
// ---------------------------------------------------------------------------

describe('POST /categorize', () => {
  let server;
  let baseUrl;
  let mod;

  before(async () => {
    try {
      mod = await import(SERVER_PATH);
    } catch (err) {
      throw new Error(`Cannot import server.js (expected until Plan 02): ${err.message}`);
    }

    // createApp() should accept optional config (port, claudeBin)
    const app = mod.createApp({
      claudeBin: MOCK_CLAUDE_BIN,
    });

    await new Promise((resolve, reject) => {
      server = app.listen(TEST_PORT, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    baseUrl = `http://localhost:${TEST_PORT}`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('returns {categories: [...]} for valid input when mock claude succeeds', async () => {
    const res = await fetch(`${baseUrl}/categorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://example.com',
        title: 'Example',
        description: 'A test bookmark',
      }),
    });

    assert.strictEqual(res.status, 200, 'should return 200');
    const body = await res.json();
    assert.ok(Array.isArray(body.categories), 'body.categories should be an array');
    assert.ok(body.categories.length > 0, 'categories should not be empty');
  });

  test('returns {categories: [], error: ...} when mock claude throws ENOENT', async () => {
    let enoentApp;
    try {
      enoentApp = mod.createApp({ claudeBin: '/nonexistent/claude-binary' });
    } catch (err) {
      throw new Error(`Cannot create app: ${err.message}`);
    }

    const enoentServer = await new Promise((resolve, reject) => {
      const s = enoentApp.listen(TEST_PORT + 1, (err) => {
        if (err) reject(err);
        else resolve(s);
      });
    });

    try {
      const res = await fetch(`http://localhost:${TEST_PORT + 1}/categorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com', title: 'Test', description: '' }),
      });

      assert.strictEqual(res.status, 200, 'should return 200 even on fallback');
      const body = await res.json();
      assert.deepStrictEqual(body.categories, [], 'categories should be empty array on ENOENT');
      assert.ok(body.error, 'error field should be present');
    } finally {
      await new Promise((resolve) => enoentServer.close(resolve));
    }
  });

  test('returns {categories: [], error: ...} when mock claude times out', async () => {
    // Use a shell script that sleeps longer than the server timeout
    const timeoutBin = path.resolve(__dirname, 'mock-claude-timeout.sh');
    // Write a temporary timeout script on the fly via shell
    const { execSync } = await import('node:child_process');
    execSync(`printf '#!/bin/bash\\nsleep 30\\n' > "${timeoutBin}" && chmod +x "${timeoutBin}"`);

    let timeoutApp;
    try {
      timeoutApp = mod.createApp({ claudeBin: timeoutBin, claudeTimeout: 500 });
    } catch (err) {
      throw new Error(`Cannot create app with timeout config: ${err.message}`);
    }

    const timeoutServer = await new Promise((resolve, reject) => {
      const s = timeoutApp.listen(TEST_PORT + 2, (err) => {
        if (err) reject(err);
        else resolve(s);
      });
    });

    try {
      const res = await fetch(`http://localhost:${TEST_PORT + 2}/categorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com', title: 'Timeout test', description: '' }),
      });

      assert.strictEqual(res.status, 200, 'should return 200 even on timeout');
      const body = await res.json();
      assert.deepStrictEqual(body.categories, [], 'categories should be empty array on timeout');
      assert.ok(body.error, 'error field should be present on timeout');
    } finally {
      await new Promise((resolve) => timeoutServer.close(resolve));
      execSync(`rm -f "${timeoutBin}"`);
    }
  });
});

// ---------------------------------------------------------------------------
// Integration tests: POST /process-tweet
// ---------------------------------------------------------------------------

describe('POST /process-tweet', () => {
  let server;
  let baseUrl;
  let mod;

  before(async () => {
    try {
      mod = await import(SERVER_PATH);
    } catch (err) {
      throw new Error(`Cannot import server.js (expected until Plan 02): ${err.message}`);
    }

    const app = mod.createApp({ claudeBin: MOCK_CLAUDE_BIN });

    await new Promise((resolve, reject) => {
      server = app.listen(TEST_PORT + 10, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    baseUrl = `http://localhost:${TEST_PORT + 10}`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('returns structured result matching tweetSchema when mock claude succeeds', async () => {
    const res = await fetch(`${baseUrl}/process-tweet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tweet: { id: '123', text: 'Test tweet about AI tools', author: '@testuser' },
        categories: ['IA', 'Eines'],
      }),
    });

    assert.strictEqual(res.status, 200, 'should return 200');
    const body = await res.json();

    // tweetSchema shape: { originalId, isAI, title, categories, externalLinks }
    assert.ok(typeof body.originalId === 'string', 'originalId should be a string');
    assert.ok(typeof body.isAI === 'boolean', 'isAI should be a boolean');
    assert.ok(typeof body.title === 'string', 'title should be a string');
    assert.ok(Array.isArray(body.categories), 'categories should be an array');
    assert.ok(Array.isArray(body.externalLinks), 'externalLinks should be an array');
  });

  test('returns fallback object with originalId, isAI: false, title from raw text when claude fails', async () => {
    let failApp;
    try {
      failApp = mod.createApp({ claudeBin: '/nonexistent/claude-binary' });
    } catch (err) {
      throw new Error(`Cannot create app: ${err.message}`);
    }

    const failServer = await new Promise((resolve, reject) => {
      const s = failApp.listen(TEST_PORT + 11, (err) => {
        if (err) reject(err);
        else resolve(s);
      });
    });

    try {
      const tweet = { id: 'tweet-456', text: 'Interesting AI research paper', author: '@researcher' };
      const res = await fetch(`http://localhost:${TEST_PORT + 11}/process-tweet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweet, categories: ['IA'] }),
      });

      assert.strictEqual(res.status, 200, 'should return 200 even on fallback');
      const body = await res.json();

      assert.ok(typeof body.originalId === 'string', 'fallback originalId should be a string');
      assert.strictEqual(body.isAI, false, 'fallback isAI should be false');
      assert.ok(typeof body.title === 'string', 'fallback title should be a string (from tweet text)');
    } finally {
      await new Promise((resolve) => failServer.close(resolve));
    }
  });
});
