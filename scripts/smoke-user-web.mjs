import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE_URL = process.env.APP_URL || 'http://localhost:3000';
const CHROME_BIN = process.env.CHROME_BIN || findChrome();
const DEBUG_PORT = Number(process.env.WEB_SMOKE_DEBUG_PORT || 9223);
const SLOW_MS = Number(process.env.WEB_SMOKE_SLOW_MS || 650);
const FINAL_PAUSE_MS = Number(process.env.WEB_SMOKE_FINAL_PAUSE_MS || 8000);
const KEEP_OPEN = process.env.WEB_SMOKE_KEEP_OPEN === '1';
const HEADLESS = process.env.WEB_SMOKE_HEADLESS === '1';

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

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function waitForJson(url, timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      return await fetchJson(url);
    } catch {
      await sleep(250);
    }
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
    if (this.socket.readyState === WebSocket.OPEN) return;
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
      const wrappedResolve = (params) => {
        clearTimeout(timer);
        resolve(params);
      };
      const listeners = this.events.get(method) || [];
      listeners.push(wrappedResolve);
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

async function waitForSelector(client, selector, timeoutMs = 15000) {
  const escaped = JSON.stringify(selector);
  await evaluate(client, `
    new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const tick = () => {
        const element = document.querySelector(${escaped});
        if (element) return resolve(true);
        if (Date.now() - startedAt > ${timeoutMs}) return reject(new Error('Missing selector: ${selector}'));
        setTimeout(tick, 100);
      };
      tick();
    })
  `, timeoutMs + 1000);
}

async function highlight(client, selector) {
  const escaped = JSON.stringify(selector);
  await evaluate(client, `
    (() => {
      const element = document.querySelector(${escaped});
      if (!(element instanceof HTMLElement)) return false;
      element.scrollIntoView({ block: 'center', behavior: 'smooth' });
      element.style.outline = '3px solid #00f0ff';
      element.style.outlineOffset = '4px';
      return true;
    })()
  `);
  await sleep(SLOW_MS);
}

async function typeInto(client, selector, value) {
  await highlight(client, selector);
  const escaped = JSON.stringify(selector);
  await evaluate(client, `
    (() => {
      const element = document.querySelector(${escaped});
      if (!(element instanceof HTMLInputElement)) throw new Error('Input not found: ${selector}');
      element.focus();
      element.select();
      element.value = '';
      element.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()
  `);
  for (const char of value) {
    await client.send('Input.insertText', { text: char });
    await sleep(Math.max(25, Math.floor(SLOW_MS / 12)));
  }
}

async function click(client, selector) {
  await highlight(client, selector);
  const escaped = JSON.stringify(selector);
  await evaluate(client, `
    (() => {
      const element = document.querySelector(${escaped});
      if (!(element instanceof HTMLElement)) throw new Error('Clickable not found: ${selector}');
      element.click();
      return true;
    })()
  `);
  await sleep(SLOW_MS);
}

async function waitForResponseText(client) {
  return evaluate(client, `
    new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const tick = () => {
        const text = document.querySelector('[data-testid="login-response"]')?.textContent || '';
        if (/\\b(200|401|403|404|500)\\b/.test(text)) return resolve(text);
        if (Date.now() - startedAt > 20000) return reject(new Error('Login response did not update in time.'));
        setTimeout(tick, 250);
      };
      tick();
    })
  `, 21000);
}

async function run() {
  console.log(`[smoke] Starting visible Chrome: ${CHROME_BIN}`);
  const userDataDir = await mkdtemp(join(tmpdir(), 'gam-web-smoke-'));
  const chrome = spawn(CHROME_BIN, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=420,900',
    '--new-window',
    HEADLESS ? '--headless=new' : '',
    'about:blank',
  ].filter(Boolean), {
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

    const loginUrl = `${BASE_URL}/zh-TW/login`;
    console.log(`[smoke] Open ${loginUrl}`);
    const load = client.waitForEvent('Page.loadEventFired', 30000).catch(() => {});
    await client.send('Page.navigate', { url: loginUrl });
    await load;

    await waitForSelector(client, '[data-testid="role-owner"]');
    await click(client, '[data-testid="role-owner"]');
    await typeInto(client, '[data-testid="login-email"]', 'flow-owner');
    await typeInto(client, '[data-testid="login-password"]', 'temporary-password-hash');
    await click(client, '[data-testid="login-submit"]');

    const responseText = await waitForResponseText(client);
    const sessionText = await evaluate(client, `document.querySelector('[data-testid="session-summary"]')?.textContent || ''`);
    console.log(`[smoke] session: ${sessionText}`);
    console.log(`[smoke] response: ${responseText.split('\\n')[0]}`);
    console.log('[smoke] PASS visible user-web login flow');

    if (KEEP_OPEN) {
      console.log('[smoke] Keeping Chrome open because WEB_SMOKE_KEEP_OPEN=1');
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
  console.error('[smoke] FAIL visible user-web');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
