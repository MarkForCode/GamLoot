# iOS Appium 測試流程

這份文件整理 GamLoot 專案目前的 iOS native Appium 測試安裝需求、環境檢核、測試資料、執行步驟與報表位置。測試目標是用 Appium XCUITest 在 iOS Simulator 上啟動 `com.gamtrade.user`，操作登入畫面並驗證 user-api 回傳 HTTP 200。

## 安裝需求

- macOS，需要安裝完整 Xcode，不是只有 Command Line Tools。
- Xcode 需完成第一次啟動設定：
  ```bash
  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
  sudo xcodebuild -runFirstLaunch
  ```
- Xcode 需安裝可用的 iOS Simulator runtime。可從 Xcode > Settings > Platforms 安裝。
- 需要 CocoaPods：
  ```bash
  arch -arm64 brew install cocoapods
  ```
- 需要 Node/pnpm 與專案依賴：
  ```bash
  pnpm install
  ```
- 需要 Docker，測試會啟動 `postgres`、`redis`、`user-api`。
- Appium 與 WebdriverIO 由專案 devDependencies 提供；iOS 測試會使用 XCUITest driver。

## 環境檢核

先確認 Xcode、simctl、simulator 狀態：

```bash
just ios-env-check
just ios-simulators
```

啟動 iOS Simulator：

```bash
just ios-simulator-start
```

啟動或檢查 Appium：

```bash
just appium-start-ios
just appium-status
```

查看 Appium log：

```bash
just appium-logs
```

停止 Appium：

```bash
just appium-stop
```

## 測試資料需求

iOS native login smoke 會使用下列 demo 帳密：

```text
username: flow-owner
password: temporary-password-hash
```

完整測試流程會先準備後端服務與資料：

- 啟動 `postgres`、`redis`、`user-api`
- 等待 `http://localhost:8080/health`
- 套用 DB migrations
- 執行原本 seed
- 執行 `seed/02-demo-appium-users.sql`，補齊 Appium/login smoke 需要的 `flow-owner`、`demo-buyer`、tenant、guild

iOS Simulator 內的 native app 會呼叫 Mac host 上的 user-api，因此 iOS app 預設 API URL 是：

```text
http://127.0.0.1:8080
```

Android emulator 則仍使用：

```text
http://10.0.2.2:8080
```

## 測試步驟

第一次或需要完整重跑時，使用：

```bash
just test-app-ios-native
```

這個 recipe 會依序執行：

1. 啟動 Docker 後端服務。
2. 等待 user-api health check。
3. 套用 migrations。
4. 補 demo seed users。
5. 啟動 iOS Simulator。
6. 建置 Expo iOS simulator app。
7. 重啟 Appium iOS server。
8. 安裝 app 到目前 booted simulator。
9. 執行 iOS native login smoke。

若 app 已經 build 好、後端與資料也已準備好，只想重跑登入測試：

```bash
just test-app-ios-native-login
```

測試成功時會看到類似輸出：

```text
[ios-app-smoke] session: flow-owner · user #4 · tenant 1 · guild 1
[ios-app-smoke] response: 200
[ios-app-smoke] PASS native iOS app login
```

## App 保留行為

目前 `just test-app-ios-native-login` 預設：

```text
APPIUM_KEEP_APP_OPEN=1
```

也就是測試完成後不會呼叫 `deleteSession()`，app 會保留在 simulator 畫面上，方便人工檢查登入後狀態。

如果要測完關閉 Appium session：

```bash
APPIUM_KEEP_APP_OPEN=0 just test-app-ios-native
```

或：

```bash
APPIUM_KEEP_APP_OPEN=0 just test-app-ios-native-login
```

## 測試報表

測試會輸出兩種報表到 `reports/appium/`：

- `latest-ios-native-login.md`：人可讀的測試摘要
- `latest-ios-native-login.json`：機器可讀的測試結果

報表內容包含：

- 測試狀態
- 開始與結束時間
- 執行時間
- platform、device、bundle id
- Appium server URL
- 登入帳號
- session summary
- API response

`reports/appium/*.md` 與 `reports/appium/*.json` 是本機測試產物，預設不納入 git。repo 只保留 `reports/appium/.gitkeep` 以保留目錄結構。

## 常見問題

### `xcode-select` 指到 Command Line Tools

錯誤通常會類似：

```text
xcodebuild requires Xcode, but active developer directory is a command line tools instance
simctl=<unavailable>
```

處理方式：

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch
just ios-env-check
```

### 沒有可用 iOS Simulator

先檢查：

```bash
just ios-simulators
```

如果沒有 iPhone simulator，從 Xcode > Settings > Platforms 安裝 iOS Simulator runtime，或嘗試：

```bash
xcodebuild -downloadPlatform iOS
```

### `pnpm: command not found`

確認 shell 環境可找到 pnpm，或先安裝依賴：

```bash
corepack enable
pnpm install
```

專案 recipe 會透過 `scripts/pnpm.sh` 包一層，降低非互動 shell 找不到 pnpm 的機率。

### Homebrew / CocoaPods 在 Apple Silicon 上遇到 Rosetta 錯誤

若看到：

```text
Cannot install under Rosetta 2 in ARM default prefix (/opt/homebrew)
```

用 ARM 模式安裝：

```bash
arch -arm64 brew install cocoapods
```

### App 點登入後沒有 200

優先檢查三件事：

```bash
curl -i http://127.0.0.1:8080/health
just db-apply-migrations
just db-seed-demo-users
```

也可以直接測試 demo 帳密：

```bash
curl -i -X POST http://127.0.0.1:8080/auth/login \
  -H 'content-type: application/json' \
  --data '{"username_or_email":"flow-owner","password_hash":"temporary-password-hash"}'
```

應該回傳 HTTP 200，且 body 內包含 `flow-owner`、`tenant_id`、`guild_id`。
