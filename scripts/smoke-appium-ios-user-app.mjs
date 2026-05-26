import { remote } from 'webdriverio';
import { writeAppiumReport } from './appium-report.mjs';

const APPIUM_SERVER_URL = process.env.APPIUM_SERVER_URL || 'http://127.0.0.1:4723';
const DEVICE_NAME = process.env.IOS_DEVICE_NAME || process.env.IOS_SIMULATOR_NAME || 'iPhone 16';
const DEVICE_UDID = process.env.IOS_DEVICE_UDID;
const PLATFORM_VERSION = process.env.IOS_PLATFORM_VERSION;
const BUNDLE_ID = process.env.IOS_APP_BUNDLE_ID || 'com.gamtrade.user';
const LOGIN_USERNAME = process.env.APP_LOGIN_USERNAME || 'flow-owner';
const LOGIN_PASSWORD = process.env.APP_LOGIN_PASSWORD || 'temporary-password-hash';
const SHOULD_TYPE_CREDENTIALS = Boolean(process.env.APP_LOGIN_USERNAME || process.env.APP_LOGIN_PASSWORD);
const SESSION_INIT_TIMEOUT_MS = Number(process.env.SESSION_INIT_TIMEOUT_MS || 300000);
const VISIBLE_PAUSE_MS = Number(process.env.VISIBLE_PAUSE_MS || 4000);
const SHOULD_KEEP_APP_OPEN = process.env.APPIUM_KEEP_APP_OPEN === '1';

async function byAccessibilityId(driver, id) {
  const element = await driver.$(`~${id}`);
  await element.waitForDisplayed({
    timeout: 30000,
    timeoutMsg: `iOS element "${id}" did not appear.`,
  });
  return element;
}

async function scrollToAccessibilityId(driver, id) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const element = await driver.$(`~${id}`);
    if (await element.isDisplayed().catch(() => false)) return element;
    await driver.execute('mobile: scroll', { direction: 'down' }).catch(() => {});
  }

  return byAccessibilityId(driver, id);
}

async function setNativeValue(element, value) {
  await element.click();
  await element.clearValue().catch(() => {});
  await element.setValue(value);
}

async function textOf(element) {
  return element.getText().catch(() => '');
}

async function textByAccessibilityId(driver, id) {
  const element = await driver.$(`~${id}`);
  return textOf(element);
}

async function clickOrTap(driver, element, didChange) {
  await element.click();
  await driver.pause(1000);
  if (await didChange()) return;
  if (!(await element.isDisplayed().catch(() => false))) return;

  const location = await element.getLocation();
  const size = await element.getSize();
  const x = Math.round(location.x + size.width / 2);
  const y = Math.round(location.y + size.height / 2);
  console.log(`[ios-app-smoke] click did not change response; tapping submit at ${x},${y}.`);
  await driver.execute('mobile: tap', { x, y }).catch(() => {});
  await driver.pause(1000);
  if (await didChange()) return;

  await driver.performActions([
    {
      type: 'pointer',
      id: 'finger1',
      parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x, y },
        { type: 'pointerDown', button: 0 },
        { type: 'pause', duration: 100 },
        { type: 'pointerUp', button: 0 },
      ],
    },
  ]);
  await driver.releaseActions();
}

async function run() {
  const server = new URL(APPIUM_SERVER_URL);
  const startedAt = new Date();
  const report = {
    name: 'ios-native-login',
    title: 'iOS Native Appium Login Smoke',
    status: 'failed',
    startedAt: startedAt.toISOString(),
    platform: 'iOS',
    appiumServerUrl: APPIUM_SERVER_URL,
    device: {
      name: DEVICE_NAME,
      udid: DEVICE_UDID || null,
      platformVersion: PLATFORM_VERSION || null,
    },
    app: {
      id: BUNDLE_ID,
    },
    login: {
      username: LOGIN_USERNAME,
      typedCredentials: SHOULD_TYPE_CREDENTIALS,
    },
    keepAppOpen: SHOULD_KEEP_APP_OPEN,
  };
  let driver;
  console.log(`[ios-app-smoke] Creating native iOS Appium session for ${BUNDLE_ID}...`);

  const capabilities = {
    platformName: 'iOS',
    'appium:automationName': 'XCUITest',
    'appium:deviceName': DEVICE_NAME,
    'appium:bundleId': BUNDLE_ID,
    'appium:newCommandTimeout': 120,
    'appium:wdaLaunchTimeout': 180000,
    'appium:wdaConnectionTimeout': 180000,
  };

  if (DEVICE_UDID) capabilities['appium:udid'] = DEVICE_UDID;
  if (PLATFORM_VERSION) capabilities['appium:platformVersion'] = PLATFORM_VERSION;

  try {
    driver = await remote({
    protocol: server.protocol.replace(':', ''),
    hostname: server.hostname,
    port: Number(server.port || 4723),
    path: server.pathname === '/' ? '/' : server.pathname,
    connectionRetryTimeout: SESSION_INIT_TIMEOUT_MS,
    connectionRetryCount: 1,
    capabilities,
    logLevel: 'error',
  });

    const ownerRole = await byAccessibilityId(driver, 'role-owner');
    await ownerRole.click();

    const emailInput = await byAccessibilityId(driver, 'login-email');
    const passwordInput = await byAccessibilityId(driver, 'login-password');
    if (SHOULD_TYPE_CREDENTIALS) {
      await setNativeValue(emailInput, LOGIN_USERNAME);
      await setNativeValue(passwordInput, LOGIN_PASSWORD);
    } else {
      console.log('[ios-app-smoke] Using prefilled owner demo credentials.');
    }

    await byAccessibilityId(driver, 'login-response');
    const responseBeforeSubmit = await textByAccessibilityId(driver, 'login-response');
    await driver.hideKeyboard().catch(() => {});
    const submitButton = await byAccessibilityId(driver, 'login-submit');
    await clickOrTap(
      driver,
      submitButton,
      async () => (await textByAccessibilityId(driver, 'login-response')) !== responseBeforeSubmit,
    );
    const responseAfterSubmit = await textByAccessibilityId(driver, 'login-response');
    if (responseAfterSubmit !== responseBeforeSubmit) {
      console.log(`[ios-app-smoke] response changed after submit: ${responseAfterSubmit.split('\n')[0]}`);
    }

    try {
      await driver.waitUntil(
        async () => {
          const text = await textByAccessibilityId(driver, 'login-response');
          return /\b200\b/.test(text);
        },
        {
          timeout: 30000,
          interval: 500,
          timeoutMsg: 'Login response did not become HTTP 200 in time.',
        },
      );
    } catch (error) {
      console.error(
        `[ios-app-smoke] response at failure: ${await textByAccessibilityId(driver, 'login-response') || '<unreadable>'}`,
      );
      throw error;
    }

    const sessionSummary = await scrollToAccessibilityId(driver, 'session-summary');
    await driver.waitUntil(
      async () => {
        const text = await textByAccessibilityId(driver, 'session-summary');
        return text.includes(LOGIN_USERNAME);
      },
      {
        timeout: 10000,
        interval: 500,
        timeoutMsg: `Session summary did not include "${LOGIN_USERNAME}".`,
      },
    );

    const summary = await textByAccessibilityId(driver, 'session-summary');
    const response = await textByAccessibilityId(driver, 'login-response');
    report.status = 'passed';
    report.sessionSummary = summary;
    report.response = response;
    console.log(`[ios-app-smoke] session: ${summary}`);
    console.log(`[ios-app-smoke] response: ${response.split('\n')[0]}`);
    console.log('[ios-app-smoke] PASS native iOS app login');
    await driver.pause(VISIBLE_PAUSE_MS);
  } catch (error) {
    report.status = 'failed';
    report.error = {
      message: error instanceof Error ? error.message : String(error),
    };
    throw error;
  } finally {
    const endedAt = new Date();
    report.endedAt = endedAt.toISOString();
    report.durationMs = endedAt.getTime() - startedAt.getTime();
    const paths = await writeAppiumReport(report).catch((error) => {
      console.error(`[ios-app-smoke] Failed to write Appium report: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    });
    if (paths) {
      console.log(`[ios-app-smoke] report: ${paths.latestMdPath}`);
    }

    if (!driver) return;
    if (SHOULD_KEEP_APP_OPEN) {
      console.log('[ios-app-smoke] Leaving Appium session open; app remains on screen.');
    } else {
      await driver.deleteSession();
    }
  }
}

run().catch((error) => {
  console.error('[ios-app-smoke] FAIL native iOS app login');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
