const chromeUrl = process.env.CHROME_URL || 'http://127.0.0.1:9222';
const appUrl = process.env.APP_URL || 'http://localhost:3000/zh-TW';

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
      if (message.error) {
        reject(new Error(message.error.message));
      } else {
        resolve(message.result);
      }
    } else if (message.method && eventWaiters.has(message.method)) {
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
          return new Promise((resolve, reject) => {
            pending.set(id, { resolve, reject });
          });
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
    expression: 'document.body ? document.body.innerText.slice(0, 1000) : document.documentElement.outerHTML.slice(0, 1000)',
    returnByValue: true,
  });
  throw new Error(
    `${lastError || `Timed out evaluating: ${expression.slice(0, 120)}`}\nPage text:\n${debug.result?.value || ''}`,
  );
}

function clickButton(text) {
  return `
    (() => {
      const buttons = [...document.querySelectorAll('button')];
      const button = buttons.find((node) => node.innerText.includes(${JSON.stringify(text)}) && !node.disabled);
      if (!button) return false;
      button.click();
      return true;
    })()
  `;
}

function readText() {
  return `
    (() => ({
      bodyText: document.body.innerText,
      listingText: [...document.querySelectorAll('span,p,button')].map((node) => node.innerText).join('\\n')
    }))()
  `;
}

async function waitForText(client, text, timeoutMs = 15000) {
  return evaluate(
    client,
    `document.body.innerText.toLowerCase().includes(${JSON.stringify(text.toLowerCase())}) ? true : false`,
    timeoutMs,
  );
}

async function run() {
  const page = await getJson(`${chromeUrl}/json/new?${encodeURIComponent('about:blank')}`, {
    method: 'PUT',
  });
  if (!page) {
    throw new Error('No Chrome page target found');
  }

  const client = await connect(page.webSocketDebuggerUrl);
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  const loaded = client.waitForEvent('Page.loadEventFired', 15000);
  await client.send('Page.navigate', { url: appUrl });
  await loaded;
  await sleep(1000);
  await waitForText(client, 'Guild market');

  const steps = [];
  async function step(name, buttonText, expectedText) {
    await evaluate(client, clickButton(buttonText));
    if (expectedText) {
      await waitForText(client, expectedText);
    }
    const snapshot = await evaluate(client, readText());
    steps.push({ name, expectedText, ok: snapshot.bodyText.includes(expectedText || buttonText) });
    await sleep(400);
  }

  await step('login owner', '登入公會主', 'Logged in as flow-owner');
  await step('register buyer', '註冊 / 登入買家', 'Buyer logged in');
  await step('create auction', '建立拍賣草稿', 'drafted');
  await step('approve auction', '審核上架', 'approved');
  await step('place bid', '送出競標', 'bid 320');
  await step('settle auction', '成交審核', 'settled');

  const finalText = await evaluate(client, 'document.body.innerText');
  await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }).then((result) => {
    return import('node:fs/promises').then((fs) =>
      fs.writeFile('/tmp/gam-user-flow-smoke.png', Buffer.from(result.data, 'base64')),
    );
  });
  client.close();

  console.log(JSON.stringify({ appUrl, steps, finalText }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
