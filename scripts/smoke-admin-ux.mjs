const chromeUrl = process.env.CHROME_URL || 'http://127.0.0.1:9222';
const adminUrl = process.env.ADMIN_URL || 'http://localhost:3001';
const userApiUrl = process.env.USER_API_URL || 'http://localhost:8080';
const fs = await import('node:fs/promises');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.json();
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${text}`);
  return JSON.parse(text || '{}');
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

async function navigate(client, url) {
  const loaded = client.waitForEvent('Page.loadEventFired', 15000).catch(() => undefined);
  await client.send('Page.navigate', { url });
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
  const normalizedText = text.replace(/\s+/g, ' ');
  const point = await evaluate(
    client,
    `
      (() => {
        const buttons = [...document.querySelectorAll('button')];
        const wanted = ${JSON.stringify(normalizedText)};
        const button = buttons.find((node) =>
          (
            node.innerText.replace(/\\s+/g, ' ').includes(wanted) ||
            (node.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').includes(wanted)
          ) &&
          !node.disabled &&
          node.getAttribute('aria-disabled') !== 'true' &&
          node.offsetParent !== null &&
          node.getBoundingClientRect().width > 0 &&
          node.getBoundingClientRect().height > 0
        );
        if (!button) return false;
        button.scrollIntoView({ block: 'center', inline: 'center' });
        const rect = button.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()
    `,
  );
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: point.x,
    y: point.y,
    button: 'none',
  });
  await client.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: point.x,
    y: point.y,
    button: 'left',
    buttons: 1,
    clickCount: 1,
  });
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: point.x,
    y: point.y,
    button: 'left',
    buttons: 0,
    clickCount: 1,
  });
  await sleep(250);
}

async function screenshot(client, name) {
  const result = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  const path = `/tmp/gam-admin-ux-${name}.png`;
  await fs.writeFile(path, Buffer.from(result.data, 'base64'));
  return path;
}

async function seedPendingTrialAndListing() {
  const stamp = Date.now();
  const trial = await postJson(`${userApiUrl}/trial-requests`, {
    applicant_email: `admin-ux-${stamp}@example.com`,
    applicant_name: 'Admin UX Leader',
    tenant_name: `Admin UX Tenant ${stamp}`,
    guild_name: `Admin UX Guild ${stamp}`,
  });

  const listing = await postJson(`${userApiUrl}/guilds/1/listings`, {
    tenant_id: 1,
    seller_user_id: 4,
    title: `Admin UX freeze target ${stamp}`,
    description: 'Listing created for admin UX moderation smoke test.',
    mode: 'auction_open_bid',
    visibility: 'guild_only',
    game_id: 1,
    currency_id: 1,
    start_price: '150',
    buyout_price: '360',
  });

  return { trial, listing, stamp };
}

async function run() {
  const seeded = await seedPendingTrialAndListing();
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

  await navigate(client, adminUrl);
  await evaluate(client, 'window.localStorage.removeItem("gam.admin.token"); true');
  await navigate(client, adminUrl);
  await mark('login page loaded', 'CMS sign in');

  await clickButton(client, 'Sign in');
  await mark('admin signed in', 'Signed in as Platform Admin');

  await clickButton(client, 'Load queue');
  await mark('trial queue loaded', seeded.stamp.toString());

  await clickButton(client, 'Approve selected trial');
  await mark('trial approved', `admin-ux-${seeded.stamp}@example.com · approved`);

  await clickButton(client, 'Load listings');
  await mark('listings loaded', `Admin UX freeze target ${seeded.stamp}`);

  await clickButton(client, `Freeze #${seeded.listing.id}`);
  await evaluate(
    client,
    `
      [...document.querySelectorAll('button')].some((node) =>
        node.innerText.includes(${JSON.stringify(`#${seeded.listing.id} Admin UX freeze target ${seeded.stamp}`)}) &&
        node.innerText.includes('guild_only · frozen')
      ) ? true : false
    `,
    15000,
  );
  steps.push({ name: 'listing frozen', ok: true });

  const screenshotPath = await screenshot(client, 'final');
  const finalText = await evaluate(client, 'document.body.innerText');
  client.close();

  console.log(
    JSON.stringify(
      {
        seeded,
        steps,
        screenshotPath,
        finalText,
      },
      null,
      2,
    ),
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
