import { remote } from 'webdriverio';
import { writeAppiumReport } from './appium-report.mjs';

// Appium 與測試目標設定：justfile 會在執行 iOS recipe 時帶入實際 simulator/app 資訊。
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
const INPUT_DELAY_MS = Number(process.env.APP_INPUT_DELAY_MS || 80);

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// 透過 React Native 的 accessibilityLabel/testID 找元素，這是 native Appium 測試最穩定的 selector。
async function byAccessibilityId(driver, id) {
  const element = await driver.$(`~${id}`);
  await element.waitForDisplayed({
    timeout: 30000,
    timeoutMsg: `iOS element "${id}" did not appear.`,
  });
  return element;
}

// 有些驗證區塊在畫面下方；先嘗試捲動，再用同一個 accessibility id 等待元素出現。
async function scrollToAccessibilityId(driver, id) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const element = await driver.$(`~${id}`);
    if (await element.isDisplayed().catch(() => false)) return element;
    await driver.execute('mobile: scroll', { direction: 'down' }).catch(() => {});
  }

  return byAccessibilityId(driver, id);
}

// 測試可使用畫面預填 demo 帳密，也可用環境變數覆寫並像人工一樣逐字輸入指定帳密。
async function setNativeValue(element, value) {
  await element.click();
  await element.clearValue().catch(() => {});

  for (const character of value) {
    await element.addValue(character);
    if (INPUT_DELAY_MS > 0) await sleep(INPUT_DELAY_MS);
  }
}

// getText 在元素尚未穩定或 session 切換時可能失敗；這裡回空字串讓 waitUntil 繼續輪詢。
async function textOf(element) {
  return element.getText().catch(() => '');
}

async function textByAccessibilityId(driver, id) {
  const element = await driver.$(`~${id}`);
  return textOf(element);
}

// iOS/XCUITest 偶爾會出現 click 已送出但 RN Button 未觸發的情況。
// 先用標準 click，再 fallback 到 mobile tap 與 W3C touch action，讓 smoke test 比較不受 simulator 狀態影響。
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

  // 報表物件會在測試過程中逐步補齊，finally 一律輸出 JSON/Markdown 方便 CI 或人工檢查。
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

  // Capabilities 告訴 Appium 要用 XCUITest 連到哪台 simulator、啟動哪個 bundle id。
  // timeout 拉長是因為第一次啟動 WebDriverAgent 或冷 simulator 常會超過預設等待時間。
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
    // 建立 Appium session；成功後 Appium 會啟動已安裝的 iOS app。
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

    // 選擇 owner 身份，這會切換畫面上的帳密欄位與登入角色。
    const ownerRole = await byAccessibilityId(driver, 'role-owner');
    await ownerRole.click();

    // 預設使用 app 內建 demo 帳密；若外部提供 APP_LOGIN_USERNAME/PASSWORD，就改用輸入值。
    const emailInput = await byAccessibilityId(driver, 'login-email');
    const passwordInput = await byAccessibilityId(driver, 'login-password');
    if (SHOULD_TYPE_CREDENTIALS) {
      await setNativeValue(emailInput, LOGIN_USERNAME);
      await setNativeValue(passwordInput, LOGIN_PASSWORD);
    } else {
      console.log('[ios-app-smoke] Using prefilled owner demo credentials.');
    }

    // 送出前先記錄 response 文字，後面用來判斷 click/tap 是否真的觸發登入流程。
    await byAccessibilityId(driver, 'login-response');
    const responseBeforeSubmit = await textByAccessibilityId(driver, 'login-response');
    await driver.hideKeyboard().catch(() => {});
    const submitButton = await byAccessibilityId(driver, 'login-submit');

    // 點擊登入後，預期 login-response 會從提示文字變成 API 回應。
    await clickOrTap(
      driver,
      submitButton,
      async () => (await textByAccessibilityId(driver, 'login-response')) !== responseBeforeSubmit,
    );
    const responseAfterSubmit = await textByAccessibilityId(driver, 'login-response');
    if (responseAfterSubmit !== responseBeforeSubmit) {
      console.log(`[ios-app-smoke] response changed after submit: ${responseAfterSubmit.split('\n')[0]}`);
    }

    // 核心驗證：API 回應必須出現 HTTP 200，代表 native app 成功連到本機 user-api 並登入。
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

    // 登入成功後畫面會顯示 session summary；確認 summary 包含本次登入帳號。
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

    // 測試結果寫回報表，console 則保留最重要的摘要給終端機與 CI log。
    report.status = 'passed';
    report.sessionSummary = summary;
    report.response = response;
    console.log(`[ios-app-smoke] session: ${summary}`);
    console.log(`[ios-app-smoke] response: ${response.split('\n')[0]}`);
    console.log('[ios-app-smoke] PASS native iOS app login');
    await driver.pause(VISIBLE_PAUSE_MS);
  } catch (error) {
    // 即使測試失敗也把錯誤寫進報表，方便看 artifact 時直接知道失敗原因。
    report.status = 'failed';
    report.error = {
      message: error instanceof Error ? error.message : String(error),
    };
    throw error;
  } finally {
    const endedAt = new Date();
    report.endedAt = endedAt.toISOString();
    report.durationMs = endedAt.getTime() - startedAt.getTime();

    // 報表產出不應該蓋掉原本測試錯誤；寫檔失敗只印 log，不改變主要測試結果。
    const paths = await writeAppiumReport(report).catch((error) => {
      console.error(`[ios-app-smoke] Failed to write Appium report: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    });
    if (paths) {
      console.log(`[ios-app-smoke] report: ${paths.latestMdPath}`);
    }

    if (!driver) return;

    // 手動檢查時保留 session/app 畫面；CI 或需要清乾淨時可設 APPIUM_KEEP_APP_OPEN=0。
    if (SHOULD_KEEP_APP_OPEN) {
      console.log('[ios-app-smoke] Leaving Appium session open; app remains on screen.');
    } else {
      await driver.deleteSession();
    }
  }
}

// 將未處理錯誤轉成非 0 exit code，讓 just/CI 能正確判斷 smoke test 失敗。
run().catch((error) => {
  console.error('[ios-app-smoke] FAIL native iOS app login');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
