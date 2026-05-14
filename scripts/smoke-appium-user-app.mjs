import { remote } from 'webdriverio';

const APPIUM_SERVER_URL = process.env.APPIUM_SERVER_URL || 'http://127.0.0.1:4723';
const DEVICE_NAME = process.env.ANDROID_DEVICE_NAME || 'Android Emulator';
const DEVICE_UDID = process.env.ANDROID_DEVICE_UDID || 'emulator-5554';
const APP_PACKAGE = process.env.ANDROID_APP_PACKAGE || 'com.gamtrade.user';
const APP_ACTIVITY = process.env.ANDROID_APP_ACTIVITY || '.MainActivity';
const LOGIN_USERNAME = process.env.APP_LOGIN_USERNAME || 'flow-owner';
const LOGIN_PASSWORD = process.env.APP_LOGIN_PASSWORD || 'temporary-password-hash';
const SHOULD_TYPE_CREDENTIALS = Boolean(process.env.APP_LOGIN_USERNAME || process.env.APP_LOGIN_PASSWORD);
const SESSION_INIT_TIMEOUT_MS = Number(process.env.SESSION_INIT_TIMEOUT_MS || 180000);
const VISIBLE_PAUSE_MS = Number(process.env.VISIBLE_PAUSE_MS || 4000);

async function byAccessibilityId(driver, id) {
  const element = await driver.$(`~${id}`);
  await element.waitForDisplayed({
    timeout: 30000,
    timeoutMsg: `Native element "${id}" did not appear.`,
  });
  return element;
}

async function scrollToAccessibilityId(driver, id) {
  await driver
    .$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().description("${id}"))`)
    .catch(() => {});
  return byAccessibilityId(driver, id);
}

async function setNativeValue(element, value) {
  await element.click();
  await element.clearValue().catch(() => {});
  await element.setValue(value);
}

async function run() {
  const server = new URL(APPIUM_SERVER_URL);
  console.log(`[app-smoke] Creating native Appium session for ${APP_PACKAGE}/${APP_ACTIVITY}...`);

  const driver = await remote({
    protocol: server.protocol.replace(':', ''),
    hostname: server.hostname,
    port: Number(server.port || 4723),
    path: server.pathname === '/' ? '/' : server.pathname,
    connectionRetryTimeout: SESSION_INIT_TIMEOUT_MS,
    connectionRetryCount: 1,
    capabilities: {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': DEVICE_NAME,
      'appium:udid': DEVICE_UDID,
      'appium:appPackage': APP_PACKAGE,
      'appium:appActivity': APP_ACTIVITY,
      'appium:autoGrantPermissions': true,
      'appium:newCommandTimeout': 120,
      'appium:ignoreHiddenApiPolicyError': true,
      'appium:adbExecTimeout': 120000,
      'appium:uiautomator2ServerInstallTimeout': 180000,
      'appium:uiautomator2ServerLaunchTimeout': 180000,
      'appium:skipDeviceInitialization': true,
    },
    logLevel: 'error',
  });

  try {
    const ownerRole = await byAccessibilityId(driver, 'role-owner');
    await ownerRole.click();

    const emailInput = await byAccessibilityId(driver, 'login-email');
    const passwordInput = await byAccessibilityId(driver, 'login-password');
    const submitButton = await byAccessibilityId(driver, 'login-submit');

    if (SHOULD_TYPE_CREDENTIALS) {
      await setNativeValue(emailInput, LOGIN_USERNAME);
      await setNativeValue(passwordInput, LOGIN_PASSWORD);
    } else {
      console.log('[app-smoke] Using prefilled owner demo credentials.');
    }

    await driver.hideKeyboard().catch(() => {});
    await submitButton.click();

    const responseBox = await scrollToAccessibilityId(driver, 'login-response');
    try {
      await driver.waitUntil(
        async () => {
          const text = await responseBox.getText();
          return /\b200\b/.test(text);
        },
        {
          timeout: 30000,
          interval: 500,
          timeoutMsg: 'Login response did not become HTTP 200 in time.',
        },
      );
    } catch (error) {
      console.error(`[app-smoke] response at failure: ${await responseBox.getText().catch(() => '<unreadable>')}`);
      throw error;
    }

    const sessionSummary = await scrollToAccessibilityId(driver, 'session-summary');
    await driver.waitUntil(
      async () => {
        const text = await sessionSummary.getText();
        return text.includes(LOGIN_USERNAME);
      },
      {
        timeout: 10000,
        interval: 500,
        timeoutMsg: `Session summary did not include "${LOGIN_USERNAME}".`,
      },
    );

    const summary = await sessionSummary.getText();
    const response = await responseBox.getText();
    console.log(`[app-smoke] session: ${summary}`);
    console.log(`[app-smoke] response: ${response.split('\n')[0]}`);
    console.log('[app-smoke] PASS native Android app login');
    await driver.pause(VISIBLE_PAUSE_MS);
  } finally {
    await driver.deleteSession();
  }
}

run().catch((error) => {
  console.error('[app-smoke] FAIL native Android app login');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
