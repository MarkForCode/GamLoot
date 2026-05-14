import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const APP_URL = process.env.APP_URL || 'http://localhost:8082';
const EXPECT_TEXT = process.env.APP_EXPECT_TEXT || 'Game Trade - User App';
const CHROME_BIN = process.env.CHROME_BIN || findChrome();
const DEBUG_PORT = Number(process.env.APP_SMOKE_DEBUG_PORT || 9224);
const FINAL_PAUSE_MS = Number(process.env.APP_SMOKE_FINAL_PAUSE_MS || 8000);
const KEEP_OPEN = process.env.APP_SMOKE_KEEP_OPEN === '1';

if (!CHROME_BIN) {
  throw new Error('Chrome/Chromium not found. Set CHROME_BIN or install google-chrome/chromium.');
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function findChrome() {
  return [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].find((path) => existsSync(path));
}

async function waitForJson(url, timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {
      // Chrome may need a moment before the debugging endpoint is ready.
    }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

class CdpClient {
  constructor(wsUrl) {
    this.nextId = 1;
    this.pending = new Map();
    this.events = new Map();
    this.socket = new WebSocket(wsUrl);
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', (event) => this.onMessage(event));
  }

  onMessage(event) {
    const message = JSON.parse(event.data);
    if (message.id && this.pending.has(message.id)) {
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
      return;
    }
    if (message.method && this.events.has(message.method)) {
      for (const resolve of this.events.get(message.method)) resolve(message.params);
      this.events.delete(message.method);
    }
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  waitForEvent(method, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), timeoutMs);
      const listeners = this.events.get(method) || [];
      listeners.push((params) => {
        clearTimeout(timer);
        resolve(params);
      });
      this.events.set(method, listeners);
    });
  }

  close() {
    this.socket.close();
  }
}

async function evaluate(client, expression, timeoutMs = 15000) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    timeout: timeoutMs,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'Runtime evaluation failed');
  }
  return result.result.value;
}

async function waitForText(client, text, timeoutMs = 30000) {
  const expected = JSON.stringify(text);
  await evaluate(client, `
    new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const tick = () => {
        if ((document.body?.textContent || '').includes(${expected})) return resolve(true);
        if (Date.now() - startedAt > ${timeoutMs}) return reject(new Error('Expected text not found: ${text}'));
        setTimeout(tick, 250);
      };
      tick();
    })
  `, timeoutMs + 1000);
}

async function run() {
  console.log(`[smoke] Starting visible Chrome: ${CHROME_BIN}`);
  const userDataDir = await mkdtemp(join(tmpdir(), 'gam-app-smoke-'));
  const chrome = spawn(CHROME_BIN, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=420,900',
    '--new-window',
    APP_URL,
  ], {
    stdio: ['ignore', 'ignore', 'pipe'],
  });

  chrome.stderr.on('data', (chunk) => {
    const text = String(chunk);
    if (/ERROR|FATAL/i.test(text)) process.stderr.write(text);
  });

  let client;
  try {
    const targets = await waitForJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    const page = targets.find((target) => target.type === 'page') || targets[0];
    if (!page?.webSocketDebuggerUrl) throw new Error('Could not find Chrome page target.');

    client = new CdpClient(page.webSocketDebuggerUrl);
    await client.open();
    await client.send('Page.enable');
    await client.send('Runtime.enable');

    console.log(`[smoke] Open ${APP_URL}`);
    const load = client.waitForEvent('Page.loadEventFired', 30000).catch(() => {});
    await client.send('Page.navigate', { url: APP_URL });
    await load;

    await waitForText(client, EXPECT_TEXT);
    await evaluate(client, `
      (() => {
        document.body.style.outline = '4px solid #00f0ff';
        document.body.style.outlineOffset = '-4px';
        return true;
      })()
    `);
    console.log(`[smoke] Found app text: ${EXPECT_TEXT}`);
    console.log('[smoke] PASS visible user-app flow');

    if (KEEP_OPEN) {
      console.log('[smoke] Keeping Chrome open because APP_SMOKE_KEEP_OPEN=1');
      await new Promise(() => {});
    }
    await sleep(FINAL_PAUSE_MS);
  } finally {
    client?.close();
    if (!KEEP_OPEN) {
      chrome.kill('SIGTERM');
      await sleep(500);
      await rm(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 }).catch(() => {});
    }
  }
}

run().catch((error) => {
  console.error('[smoke] FAIL visible user-app');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
