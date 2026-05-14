import { remote } from 'webdriverio';

const APPIUM_SERVER_URL = process.env.APPIUM_SERVER_URL || 'http://127.0.0.1:4723';
const LOGIN_URL = process.env.LOGIN_URL || 'http://10.0.2.2:3000/zh-TW/login';
const DEVICE_NAME = process.env.ANDROID_DEVICE_NAME || 'Android Emulator';
const DEVICE_UDID = process.env.ANDROID_DEVICE_UDID || 'emulator-5554';
const SESSION_INIT_TIMEOUT_MS = Number(process.env.SESSION_INIT_TIMEOUT_MS || 180000);

async function run() {
  const server = new URL(APPIUM_SERVER_URL);
  console.log(`[smoke] Creating Appium session (timeout: ${SESSION_INIT_TIMEOUT_MS}ms)...`);
  const heartbeat = setInterval(() => {
    console.log('[smoke] Waiting for Appium session...');
  }, 10000);
  const browser = await Promise.race([
    remote({
      protocol: server.protocol.replace(':', ''),
      hostname: server.hostname,
      port: Number(server.port || 4723),
      path: server.pathname === '/' ? '/' : server.pathname,
      connectionRetryTimeout: SESSION_INIT_TIMEOUT_MS,
      connectionRetryCount: 1,
      capabilities: {
        platformName: 'Android',
        browserName: 'Chrome',
        'appium:automationName': 'UiAutomator2',
        'appium:deviceName': DEVICE_NAME,
        'appium:udid': DEVICE_UDID,
        'appium:newCommandTimeout': 120,
        'appium:ignoreHiddenApiPolicyError': true,
        'appium:adbExecTimeout': 120000,
        'appium:uiautomator2ServerInstallTimeout': 180000,
        'appium:uiautomator2ServerLaunchTimeout': 180000,
        'appium:skipDeviceInitialization': true,
        'appium:chromedriverAutodownload': true,
      },
      logLevel: 'error',
    }),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Session init timeout after ${SESSION_INIT_TIMEOUT_MS}ms`)), SESSION_INIT_TIMEOUT_MS);
    }),
  ]).finally(() => clearInterval(heartbeat));

  try {
    console.log(`[smoke] Open ${LOGIN_URL}`);
    await browser.url(LOGIN_URL);

    const ownerRole = await browser.$('[data-testid="role-owner"]');
    await ownerRole.waitForDisplayed({ timeout: 10000 });
    await ownerRole.click();

    const emailInput = await browser.$('[data-testid="login-email"]');
    const passwordInput = await browser.$('[data-testid="login-password"]');
    const submitButton = await browser.$('[data-testid="login-submit"]');
    const responseBox = await browser.$('[data-testid="login-response"]');

    await emailInput.waitForDisplayed({ timeout: 10000 });
    await passwordInput.waitForDisplayed({ timeout: 10000 });
    await submitButton.waitForDisplayed({ timeout: 10000 });
    await responseBox.waitForDisplayed({ timeout: 10000 });

    await emailInput.clearValue();
    await emailInput.setValue('flow-owner');
    await passwordInput.clearValue();
    await passwordInput.setValue('temporary-password-hash');

    const before = await responseBox.getText();
    await browser.hideKeyboard().catch(() => {});
    await submitButton.scrollIntoView();
    await submitButton.click();

    await browser.waitUntil(
      async () => {
        const now = await responseBox.getText();
        return now !== before && /\b(200|401|403|404|500)\b/.test(now);
      },
      {
        timeout: 5000,
        interval: 400,
      },
    ).catch(async () => {
      await browser.execute(() => {
        const submit = document.querySelector('[data-testid="login-submit"]');
        if (submit instanceof HTMLElement) submit.click();
      });
    });

    await browser.waitUntil(
      async () => {
        const now = await responseBox.getText();
        return now !== before && /\b(200|401|403|404|500)\b/.test(now);
      },
      {
        timeout: 15000,
        interval: 400,
        timeoutMsg: 'Login response did not update in time.',
      },
    );

    const result = await responseBox.getText();
    const summary = await (await browser.$('[data-testid="session-summary"]')).getText();
    console.log(`[smoke] session: ${summary}`);
    console.log(`[smoke] response: ${result.split('\n')[0]}`);
    console.log('[smoke] PASS appium login flow');
  } finally {
    await browser.deleteSession();
  }
}

run().catch((error) => {
  console.error('[smoke] FAIL appium login flow');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
