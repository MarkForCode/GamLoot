import { remote } from 'webdriverio';

const APPIUM_SERVER_URL = process.env.APPIUM_SERVER_URL || 'http://127.0.0.1:4723';
const DEVICE_NAME = process.env.ANDROID_DEVICE_NAME || 'Android Emulator';
const DEVICE_UDID = process.env.ANDROID_DEVICE_UDID || 'emulator-5554';
const APP_PACKAGE = process.env.ANDROID_APP_PACKAGE || 'com.gamtrade.user';
const APP_ACTIVITY = process.env.ANDROID_APP_ACTIVITY || '.MainActivity';
const SESSION_INIT_TIMEOUT_MS = Number(process.env.SESSION_INIT_TIMEOUT_MS || 180000);
const VISIBLE_PAUSE_MS = Number(process.env.VISIBLE_PAUSE_MS || 4000);

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
    const title = await driver.$('android=new UiSelector().textContains("Game Trade - User App")');
    await title.waitForDisplayed({
      timeout: 30000,
      timeoutMsg: 'Native user app title did not appear.',
    });

    console.log(`[app-smoke] visible text: ${await title.getText()}`);
    console.log('[app-smoke] PASS native Android app smoke');
    await driver.pause(VISIBLE_PAUSE_MS);
  } finally {
    await driver.deleteSession();
  }
}

run().catch((error) => {
  console.error('[app-smoke] FAIL native Android app smoke');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
