const chromeUrl = process.env.CHROME_URL || 'http://127.0.0.1:9222';
const baseUrl = process.env.APP_URL || 'http://localhost:3000';
const fs = await import('node:fs/promises');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  return response.json();
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  const eventWaiters = new Map();

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
      return;
    }

    if (message.method && eventWaiters.has(message.method)) {
      const waiters = eventWaiters.get(message.method);
      eventWaiters.delete(message.method);
      waiters.forEach((resolve) => resolve(message.params || {}));
    }
  });

  return new Promise((resolve, reject) => {
    ws.addEventListener('open', () => {
      resolve({
        send(method, params = {}) {
          const id = nextId++;
          ws.send(JSON.stringify({ id, method, params }));
          return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
        },
        waitForEvent(method, timeoutMs = 10000) {
          return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), timeoutMs);
            const wrappedResolve = (params) => {
              clearTimeout(timer);
              resolve(params);
            };
            eventWaiters.set(method, [...(eventWaiters.get(method) || []), wrappedResolve]);
          });
        },
        close() {
          ws.close();
        },
      });
    });
    ws.addEventListener('error', reject);
  });
}

async function evaluate(client, expression, timeoutMs = 10000) {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < timeoutMs) {
    const result = await client.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });

    if (result.exceptionDetails) {
      lastError = result.exceptionDetails.text;
    } else if (result.result?.value !== false && result.result?.value !== undefined) {
      return result.result.value;
    }

    await sleep(250);
  }

  const debug = await client.send('Runtime.evaluate', {
    expression: 'document.body ? document.body.innerText.slice(0, 1600) : ""',
    returnByValue: true,
  });
  throw new Error(`${lastError || `Timed out evaluating: ${expression.slice(0, 120)}`}\nPage text:\n${debug.result?.value || ''}`);
}

async function navigate(client, path) {
  const loaded = client.waitForEvent('Page.loadEventFired', 15000).catch(() => undefined);
  await client.send('Page.navigate', { url: `${baseUrl}${path}` });
  await loaded;
  await sleep(800);
}

async function waitForText(client, text, timeoutMs = 15000) {
  return evaluate(
    client,
    `document.body.innerText.toLowerCase().includes(${JSON.stringify(text.toLowerCase())}) ? true : false`,
    timeoutMs,
  );
}

async function clickButton(client, text) {
  return evaluate(
    client,
    `
      (() => {
        const buttons = [...document.querySelectorAll('button')];
        const button = buttons.find((node) => node.innerText.includes(${JSON.stringify(text)}) && !node.disabled);
        if (!button) return false;
        button.click();
        return true;
      })()
    `,
  );
}

async function clickButtonAt(client, text, index) {
  return evaluate(
    client,
    `
      (() => {
        const buttons = [...document.querySelectorAll('button')]
          .filter((node) => node.innerText.includes(${JSON.stringify(text)}) && !node.disabled);
        const button = buttons[${index}];
        if (!button) return false;
        button.click();
        return true;
      })()
    `,
  );
}

async function clickButtonContaining(client, text) {
  return clickButton(client, text);
}

async function screenshot(client, name) {
  const result = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  const path = `/tmp/gam-ux-${name}.png`;
  await fs.writeFile(path, Buffer.from(result.data, 'base64'));
  return path;
}

async function run() {
  const page = await getJson(`${chromeUrl}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  const client = await connect(page.webSocketDebuggerUrl);
  await client.send('Page.enable');
  await client.send('Runtime.enable');

  const steps = [];
  const mark = async (name, expectedText) => {
    await waitForText(client, expectedText);
    const text = await evaluate(client, 'document.body.innerText');
    steps.push({ name, ok: text.toLowerCase().includes(expectedText.toLowerCase()) });
  };

  await navigate(client, '/zh-TW/login');
  await mark('login page loaded', '會員登入');
  await clickButtonAt(client, '登入', 1);
  await mark('owner login', 'flow-owner');

  await navigate(client, '/zh-TW/seller/listings');
  await mark('seller center loaded', '賣家中心');
  await clickButton(client, '建立商品');
  await mark('listing created', '200 OK');

  const listingId = await evaluate(
    client,
    `
      fetch('/api/user/tenants/1/listings')
        .then((response) => response.json())
        .then((rows) => {
          const matches = rows
            .filter((row) => row.title === 'Starter sword bundle')
            .sort((a, b) => b.id - a.id);
          return matches[0]?.id || null;
        })
    `,
  );
  if (!listingId) {
    throw new Error('Could not find created listing id');
  }

  await clickButton(client, '審核上架');
  await mark('listing approved', 'active');

  await navigate(client, `/zh-TW/listings/${listingId}`);
  await mark('listing detail loaded', '商品詳情');
  await clickButton(client, '登入 demo-buyer');
  await mark('buyer login', 'demo-buyer');
  await clickButton(client, '送出競標');
  await mark('bid placed', 'Bid #');

  await navigate(client, '/zh-TW/seller/listings');
  await mark('seller center returned', '商品操作');
  await clickButtonContaining(client, `#${listingId}`);
  await clickButton(client, '成交');
  await mark('listing settled', 'settled');

  await navigate(client, '/zh-TW/market');
  await mark('market loaded', '交易市場');
  await waitForText(client, `#${listingId}`);

  const finalText = await evaluate(client, 'document.body.innerText');
  const screenshotPath = await screenshot(client, 'multipage-final');
  client.close();

  console.log(JSON.stringify({ listingId, steps, finalUrl: `${baseUrl}/zh-TW/market`, screenshotPath, finalText }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
