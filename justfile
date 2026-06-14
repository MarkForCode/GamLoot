# Game Trade Platform - Justfile
set dotenv-load := true

postgres-url := "postgresql://gam_trade:gam_trade_secure_pass@localhost:5432/gam_trade_dev"
appium-server-url := "http://127.0.0.1:4723"
appium-login-url := "http://10.0.2.2:3000/zh-TW/login"
user-app-apk := "apps/user/app/android/app/build/outputs/apk/release/app-release.apk"
user-app-package := "com.gamtrade.user"
user-app-activity := ".MainActivity"
user-app-ios-bundle-id := "com.gamtrade.user"
ios-user-api-url := "http://127.0.0.1:8080"

# Default target
default: help

# Help
help:
    @just --list

# Install dependencies
install:
    ./scripts/pnpm.sh install

ensure-node-deps:
    @bash -lc 'set -euo pipefail; \
    if ./scripts/pnpm.sh --filter @gam/user-app exec expo --version >/dev/null 2>&1; then \
      exit 0; \
    fi; \
    echo "Node dependencies are missing; installing with pnpm --frozen-lockfile --ignore-scripts..."; \
    ./scripts/pnpm.sh install --frozen-lockfile --ignore-scripts; \
    '

# Development
dev:
    ./scripts/pnpm.sh dev

dev-user-web: dev-web
dev-web:
    ./scripts/pnpm.sh --filter @gam/user-web dev

dev-user-app: dev-app
dev-app:
    ./scripts/pnpm.sh --filter @gam/user-app dev

dev-admin-web: dev-admin
dev-admin:
    ./scripts/pnpm.sh --filter @gam/admin-web dev

# Rust development
dev-rust:
    cd rust && cargo watch -x run

dev-user-api:
    cd rust && DATABASE_URL={{postgres-url}} cargo run -p user-api

dev-cms-api:
    cd rust && DATABASE_URL={{postgres-url}} cargo run -p cms-api

dev-db:
    docker compose up -d postgres redis

# Build
build:
    ./scripts/pnpm.sh build

build-rust:
    cd rust && cargo build --release

build-user-web:
    ./scripts/pnpm.sh --filter @gam/user-web build

build-user-app-android: ensure-node-deps
    @bash -lc 'set -euo pipefail; \
    if [ -z "${JAVA_HOME:-}" ] && [ -d "$HOME/.local/jdk-21" ]; then export JAVA_HOME="$HOME/.local/jdk-21"; fi; \
    if [ -n "${JAVA_HOME:-}" ]; then export PATH="$JAVA_HOME/bin:$PATH"; fi; \
    SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"; \
    if [ -z "$SDK_ROOT" ] && [ -d "$HOME/Android/Sdk" ]; then SDK_ROOT="$HOME/Android/Sdk"; fi; \
    if [ -z "$SDK_ROOT" ] && [ -d "$HOME/Android/sdk" ]; then SDK_ROOT="$HOME/Android/sdk"; fi; \
    if [ -z "$SDK_ROOT" ] && [ -d "$HOME/Library/Android/sdk" ]; then SDK_ROOT="$HOME/Library/Android/sdk"; fi; \
    if [ ! -d "$SDK_ROOT" ]; then echo "Android SDK not found. Run: just android-env-check"; exit 1; fi; \
    export ANDROID_HOME="$SDK_ROOT"; \
    export ANDROID_SDK_ROOT="$SDK_ROOT"; \
    export PATH="$SDK_ROOT/platform-tools:$SDK_ROOT/cmdline-tools/latest/bin:$PATH"; \
    if [ ! -d apps/user/app/android ]; then CI=1 ./scripts/pnpm.sh --filter @gam/user-app exec expo prebuild --platform android --no-install; fi; \
    cd apps/user/app/android; \
    NODE_ENV=production ./gradlew assembleRelease; \
    '

build-user-app-ios: ensure-node-deps
    @bash -lc 'set -euo pipefail; \
    ./scripts/ios/env-check.sh; \
    if ! xcrun simctl help >/dev/null 2>&1; then exit 1; fi; \
    if [ ! -d apps/user/app/ios ]; then EXPO_PUBLIC_USER_API_URL={{ios-user-api-url}} CI=1 ./scripts/pnpm.sh --filter @gam/user-app exec expo prebuild --platform ios --no-install; fi; \
    if [ -d apps/user/app/ios ] && [ ! -d apps/user/app/ios/Pods ] && [ -f apps/user/app/ios/Podfile ]; then \
      if ! command -v pod >/dev/null 2>&1; then \
        echo "CocoaPods is required for iOS builds."; \
        echo "Install it first, for example: brew install cocoapods"; \
        echo "Then run: just build-user-app-ios"; \
        exit 1; \
      fi; \
      cd apps/user/app/ios; \
      pod install; \
      cd - >/dev/null; \
    fi; \
    WORKSPACE="$(find apps/user/app/ios -maxdepth 1 -name "*.xcworkspace" | head -n 1)"; \
    PROJECT="$(find apps/user/app/ios -maxdepth 1 -name "*.xcodeproj" | head -n 1)"; \
    APP_SCHEME="${IOS_SCHEME:-}"; \
    if [ -z "$APP_SCHEME" ] && [ -n "$PROJECT" ]; then APP_SCHEME="$(basename "$PROJECT" .xcodeproj)"; fi; \
    if [ -n "$WORKSPACE" ]; then \
      SCHEME="$APP_SCHEME"; \
      BUILD_TARGET=(-workspace "$WORKSPACE"); \
    elif [ -n "$PROJECT" ]; then \
      SCHEME="$APP_SCHEME"; \
      BUILD_TARGET=(-project "$PROJECT"); \
    else \
      echo "iOS project not found. Run Expo prebuild first."; \
      exit 1; \
    fi; \
    if [ -z "$SCHEME" ]; then echo "Unable to determine iOS scheme."; exit 1; fi; \
    DESTINATION=(); \
    BOOTED_UDID="$(./scripts/ios/env-check.sh | sed -n "s/^booted_simulator=//p" | head -n 1)"; \
    if [ -n "$BOOTED_UDID" ]; then DESTINATION=(-destination "platform=iOS Simulator,id=$BOOTED_UDID"); fi; \
    CONFIGURATION="${IOS_CONFIGURATION:-Release}"; \
    echo "Building iOS scheme: $SCHEME ($CONFIGURATION)"; \
    EXPO_PUBLIC_USER_API_URL={{ios-user-api-url}} xcodebuild -quiet "${BUILD_TARGET[@]}" -scheme "$SCHEME" -configuration "$CONFIGURATION" -sdk iphonesimulator "${DESTINATION[@]}" -derivedDataPath apps/user/app/ios/build ONLY_ACTIVE_ARCH=YES build; \
    APP_PATH="$(find apps/user/app/ios/build/Build/Products -maxdepth 5 -path "*iphonesimulator/*.app" | head -n 1)"; \
    if [ -z "$APP_PATH" ]; then echo "Built .app not found under apps/user/app/ios/build/Build/Products"; exit 1; fi; \
    echo "Built iOS app: $APP_PATH"; \
    '

build-admin-web:
    ./scripts/pnpm.sh --filter @gam/admin-web build

# Docker
dc: docker-up
docker-up: docker-up-all

docker-up-all:
    docker compose up --build

docker-up-backend:
    docker compose up --build postgres redis user-api cms-api order-worker payment-worker notification-worker

docker-up-web:
    docker compose up --build user-web admin-web user-app

docker-down:
    docker compose down

docker-logs:
    docker compose logs -f

docker-restart:
    docker compose restart

# Observability
obs-up:
    ./scripts/observability/up.sh

obs-smoke:
    ./scripts/observability/smoke.sh

obs-status:
    ./scripts/observability/status.sh

obs-logs:
    docker compose logs -f alloy grafana loki mimir prometheus tempo

obs-down:
    ./scripts/observability/down.sh

# Terraform LocalStack
tf-localstack-up:
    ./scripts/terraform/localstack-up.sh

tf-localstack-test:
    ./scripts/terraform/localstack-test.sh

tf-localstack-down:
    ./scripts/terraform/localstack-down.sh

# Database
db-reset:
    docker compose down -v && docker compose up --build

db-seed:
    @bash -lc 'set -euo pipefail; \
    COUNT="$(docker compose exec -T -e PGPASSWORD=gam_trade_secure_pass postgres psql -tA -U gam_trade -d gam_trade_dev -c "SELECT COUNT(*) FROM categories;" 2>/dev/null || echo 0)"; \
    if [ "${COUNT:-0}" != "0" ]; then \
      echo "Seed data already exists, skipping."; \
    else \
      echo "Applying seed SQL files..."; \
      for seed in seed/*.sql; do \
        docker compose exec -T -e PGPASSWORD=gam_trade_secure_pass postgres psql -v ON_ERROR_STOP=1 -U gam_trade -d gam_trade_dev < "$seed" >/dev/null; \
        echo "applied $seed"; \
      done; \
    fi; \
    '

db-seed-demo-users:
    docker compose exec -T -e PGPASSWORD=gam_trade_secure_pass postgres psql -v ON_ERROR_STOP=1 -U gam_trade -d gam_trade_dev < seed/02-demo-appium-users.sql

db-up: dev-db

db-validate: validate-migrations

db-apply-migrations:
    docker compose exec -T postgres mkdir -p /tmp/migrations
    docker compose cp rust/infrastructure/db/migrations/. postgres:/tmp/migrations
    for migration in rust/infrastructure/db/migrations/*.sql; do docker compose exec -T -e PGPASSWORD=gam_trade_secure_pass postgres psql -v ON_ERROR_STOP=1 -U gam_trade -d gam_trade_dev < "$migration" >/dev/null; echo "applied $migration"; done

# Lint
lint:
    ./scripts/pnpm.sh lint

lint-user-web:
    ./scripts/pnpm.sh --filter @gam/user-web lint

lint-admin-web:
    ./scripts/pnpm.sh --filter @gam/admin-web lint

# Clean
clean:
    rm -rf apps/*/dist apps/*/.next
    rm -rf packages/*/dist
    cd rust && cargo clean

# Test
test:
    ./scripts/pnpm.sh test || echo "No test command configured"

validate-migrations:
    ./scripts/validate-migrations.sh

check-rust:
    cd rust && cargo check -p user-api
    cd rust && cargo check -p cms-api

check-user-api:
    cd rust && cargo check -p user-api

check-cms-api:
    cd rust && cargo check -p cms-api

check-admin-web:
    ./scripts/pnpm.sh --filter @gam/admin-web lint
    ./scripts/pnpm.sh --filter @gam/admin-web build

check-user-web:
    ./scripts/pnpm.sh --filter @gam/user-web lint
    ./scripts/pnpm.sh --filter @gam/user-web build

check-all: validate-migrations check-rust check-user-web check-admin-web

# Load testing
k6-smoke:
    K6_PROFILE=smoke ./scripts/k6/run-local.sh

k6-baseline:
    K6_PROFILE=baseline ./scripts/k6/run-local.sh

k6-stress:
    K6_PROFILE=stress ./scripts/k6/run-local.sh

k6-docker:
    ./scripts/k6/run-docker.sh

# Type check
typecheck:
    ./scripts/pnpm.sh typecheck

# Web tests
smoke-health:
    @echo "Checking Docker services..."
    @docker ps --format '{{{{.Names}}}}' | grep -q "gam_trade" || (echo "ERROR: Docker not running" && exit 1)
    @echo "Checking user-api (8080)..."
    @curl -sf -o /dev/null http://localhost:8080/health || echo "WARNING: user-api not ready"
    @echo "Checking cms-api (8081)..."
    @curl -sf -o /dev/null http://localhost:8081/health || echo "WARNING: cms-api not ready"
    @echo "Checking user-web (3000)..."
    @curl -sf -o /dev/null http://localhost:3000/health || echo "WARNING: user-web not ready"
    @echo "Checking admin-web (3001)..."
    @curl -sf -o /dev/null http://localhost:3001/health || echo "WARNING: admin-web not ready"
    @echo "Checking user-app (Expo on 8082)..."
    @curl -sf -o /dev/null http://localhost:8082 || echo "WARNING: user-app not ready"
    @echo "Smoke health check completed"

test-web-smoke:
    ./scripts/flows/user-web-smoke.sh

test-web: test-web-smoke

test-app-web-up:
    ./scripts/flows/user-app-web-up.sh

test-app-up:
    ./scripts/flows/user-app-up.sh

test-app-visible:
    ./scripts/flows/user-app-visible.sh

test-app-web-visible: test-app-visible

android-install-user-app:
    @bash -lc 'set -euo pipefail; \
    SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"; \
    if [ -z "$SDK_ROOT" ] && [ -d "$HOME/Android/Sdk" ]; then SDK_ROOT="$HOME/Android/Sdk"; fi; \
    if [ -z "$SDK_ROOT" ] && [ -d "$HOME/Android/sdk" ]; then SDK_ROOT="$HOME/Android/sdk"; fi; \
    if [ -z "$SDK_ROOT" ] && [ -d "$HOME/Library/Android/sdk" ]; then SDK_ROOT="$HOME/Library/Android/sdk"; fi; \
    ADB="$SDK_ROOT/platform-tools/adb"; \
    APK="${APP_APK_PATH:-$PWD/{{user-app-apk}}}"; \
    if [ ! -x "$ADB" ]; then echo "adb missing at $ADB"; exit 1; fi; \
    if [ ! -f "$APK" ]; then echo "APK not found: $APK"; echo "Run: just build-user-app-android"; exit 1; fi; \
    "$ADB" start-server >/dev/null; \
    "$ADB" wait-for-device; \
    "$ADB" shell pm list packages | grep -q "package:{{user-app-package}}" && "$ADB" uninstall {{user-app-package}} >/dev/null || true; \
    "$ADB" install -r -d "$APK"; \
    echo "Installed {{user-app-package}} from $APK"; \
    '

ios-install-user-app:
    @bash -lc 'set -euo pipefail; \
    ./scripts/ios/env-check.sh; \
    if ! xcrun simctl help >/dev/null 2>&1; then exit 1; fi; \
    just ios-simulator-start; \
    APP_PATH="${IOS_APP_PATH:-}"; \
    if [ -z "$APP_PATH" ] && [ -d apps/user/app/ios/build/Build/Products ]; then APP_PATH="$(find apps/user/app/ios/build/Build/Products -maxdepth 5 -path "*Release-iphonesimulator/*.app" | head -n 1)"; fi; \
    if [ -z "$APP_PATH" ] && [ -d apps/user/app/ios/build/Build/Products ]; then APP_PATH="$(find apps/user/app/ios/build/Build/Products -maxdepth 5 -path "*iphonesimulator/*.app" | head -n 1)"; fi; \
    if [ -z "$APP_PATH" ] || [ ! -d "$APP_PATH" ]; then \
      echo "iOS .app not found. Run: just build-user-app-ios"; \
      exit 1; \
    fi; \
    xcrun simctl uninstall booted {{user-app-ios-bundle-id}} >/dev/null 2>&1 || true; \
    xcrun simctl install booted "$APP_PATH"; \
    echo "Installed {{user-app-ios-bundle-id}} from $APP_PATH"; \
    '

test-app-native-login:
    just appium-start
    just android-install-user-app
    APPIUM_SERVER_URL={{appium-server-url}} ANDROID_APP_PACKAGE={{user-app-package}} ANDROID_APP_ACTIVITY={{user-app-activity}} ./scripts/pnpm.sh run smoke:appium:user-app

test-app-native:
    ./scripts/flows/user-app-native.sh

test-app-ios-native-login:
    just appium-start-ios
    just ios-install-user-app
    @bash -lc 'set -euo pipefail; \
    IOS_DEVICE_UDID="$(xcrun simctl getenv booted SIMULATOR_UDID)"; \
    IOS_DEVICE_NAME="$(xcrun simctl getenv booted SIMULATOR_DEVICE_NAME)"; \
    IOS_PLATFORM_VERSION="$(xcrun simctl getenv booted SIMULATOR_RUNTIME_VERSION)"; \
    APPIUM_KEEP_APP_OPEN="${APPIUM_KEEP_APP_OPEN:-1}" APPIUM_SERVER_URL={{appium-server-url}} IOS_APP_BUNDLE_ID={{user-app-ios-bundle-id}} IOS_DEVICE_UDID="$IOS_DEVICE_UDID" IOS_DEVICE_NAME="$IOS_DEVICE_NAME" IOS_PLATFORM_VERSION="$IOS_PLATFORM_VERSION" ./scripts/pnpm.sh run smoke:appium:ios-user-app; \
    '

test-app-ios-native:
    docker compose up -d --build postgres redis user-api
    node scripts/wait-http.mjs http://localhost:8080/health
    just db-apply-migrations
    just db-seed || true
    just db-seed-demo-users
    just ios-simulator-start
    just build-user-app-ios
    just appium-stop
    just appium-start-ios
    just test-app-ios-native-login

# Web Appium tests (Android Chrome)
android-env-check:
    ./scripts/android/env-check.sh

android-devices:
    ./scripts/android/devices.sh

android-emulators:
    ./scripts/android/emulators.sh

android-emulator-start:
    ./scripts/android/emulator-start.sh

android-emulator-start-visible:
    ./scripts/android/emulator-start.sh --visible

ios-env-check:
    ./scripts/ios/env-check.sh

ios-simulators:
    ./scripts/ios/simulators.sh

ios-simulator-start:
    ./scripts/ios/simulator-start.sh

appium-start-ios:
    @bash -lc 'set -euo pipefail; \
    mkdir -p /tmp/gam-trade /tmp/gam-appium-home; \
    ./scripts/ios/env-check.sh; \
    if ! xcrun simctl help >/dev/null 2>&1; then exit 1; fi; \
    xcrun --sdk iphonesimulator --show-sdk-version >/dev/null; \
    export APPIUM_HOME=/tmp/gam-appium-home; \
    if curl -sf {{appium-server-url}}/status >/dev/null; then \
      echo "Appium already running at {{appium-server-url}}"; \
    else \
      if ./scripts/pnpm.sh exec appium driver list --installed --json | grep -q "\"xcuitest\""; then \
        echo "xcuitest driver already installed"; \
      else \
        ./scripts/pnpm.sh exec appium driver install --source=npm appium-xcuitest-driver@9.10.5; \
      fi; \
      nohup ./scripts/pnpm.sh exec appium --base-path / --address 127.0.0.1 --port 4723 >/tmp/gam-trade/appium.log 2>&1 & \
      READY=0; \
      for i in $(seq 1 30); do \
        if curl -sf {{appium-server-url}}/status >/dev/null; then READY=1; break; fi; \
        sleep 1; \
      done; \
      if [ "$READY" -ne 1 ]; then \
        echo "Appium failed to become ready. See: /tmp/gam-trade/appium.log"; \
        exit 1; \
      fi; \
      echo "Appium started for iOS at {{appium-server-url}}"; \
    fi; \
    '

appium-start:
    @bash -lc 'set -euo pipefail; \
    mkdir -p /tmp/gam-trade /tmp/gam-appium-home; \
    SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"; \
    if [ -n "$SDK_ROOT" ] && [ ! -d "$SDK_ROOT" ]; then \
      echo "Configured SDK path not found: $SDK_ROOT"; \
      SDK_ROOT=""; \
    fi; \
    if [ -z "$SDK_ROOT" ] && [ -d "$HOME/Android/Sdk" ]; then SDK_ROOT="$HOME/Android/Sdk"; fi; \
    if [ -z "$SDK_ROOT" ] && [ -d "$HOME/Android/sdk" ]; then SDK_ROOT="$HOME/Android/sdk"; fi; \
    if [ -z "$SDK_ROOT" ] && [ -d "$HOME/Library/Android/sdk" ]; then SDK_ROOT="$HOME/Library/Android/sdk"; fi; \
    if [ -z "$SDK_ROOT" ] && command -v adb >/dev/null 2>&1; then SDK_ROOT="$(cd "$(dirname "$(command -v adb)")/.." && pwd)"; fi; \
    if [ ! -d "$SDK_ROOT" ]; then \
      echo "Android SDK not found. Set ANDROID_HOME/ANDROID_SDK_ROOT, or install Android SDK + platform-tools."; \
      echo "Run: just android-env-check"; \
      exit 1; \
    fi; \
    if [ ! -x "$SDK_ROOT/platform-tools/adb" ] && ! command -v adb >/dev/null 2>&1; then \
      echo "adb not found. Install Android platform-tools or fix SDK path: $SDK_ROOT"; \
      echo "Run: just android-env-check"; \
      exit 1; \
    fi; \
    export ANDROID_HOME="$SDK_ROOT"; \
    export ANDROID_SDK_ROOT="$SDK_ROOT"; \
    export APPIUM_HOME=/tmp/gam-appium-home; \
    if curl -sf {{appium-server-url}}/status >/dev/null; then \
      echo "Appium already running at {{appium-server-url}}"; \
    else \
      if ./scripts/pnpm.sh exec appium driver list --installed | grep -q "uiautomator2"; then \
        echo "uiautomator2 driver already installed"; \
      else \
        ./scripts/pnpm.sh exec appium driver install --source=npm appium-uiautomator2-driver@4.2.9 >/dev/null 2>&1 || true; \
      fi; \
      if command -v xcrun >/dev/null 2>&1 && xcrun simctl help >/dev/null 2>&1; then \
        if ./scripts/pnpm.sh exec appium driver list --installed --json | grep -q "\"xcuitest\""; then \
          echo "xcuitest driver already installed"; \
        else \
          ./scripts/pnpm.sh exec appium driver install --source=npm appium-xcuitest-driver@9.10.5 >/dev/null 2>&1 || true; \
        fi; \
      fi; \
      nohup ./scripts/pnpm.sh exec appium --base-path / --address 127.0.0.1 --port 4723 --allow-insecure chromedriver_autodownload >/tmp/gam-trade/appium.log 2>&1 & \
      READY=0; \
      for i in $(seq 1 30); do \
        if curl -sf {{appium-server-url}}/status >/dev/null; then READY=1; break; fi; \
        sleep 1; \
      done; \
      if [ "$READY" -ne 1 ]; then \
        echo "Appium failed to become ready. See: /tmp/gam-trade/appium.log"; \
        exit 1; \
      fi; \
      echo "Appium started at {{appium-server-url}} (SDK: $SDK_ROOT)"; \
    fi; \
    '

appium-stop:
    @bash -lc 'set -e; \
    PIDS=$(lsof -ti tcp:4723 2>/dev/null || true); \
    if [ -n "$PIDS" ]; then \
      kill $PIDS >/dev/null 2>&1 || true; \
      sleep 1; \
      kill -9 $PIDS >/dev/null 2>&1 || true; \
    fi; \
    '
    @echo "Appium stopped"

appium-logs:
    @tail -n 120 -f /tmp/gam-trade/appium.log

appium-status:
    @bash -lc 'set -e; \
    READY=0; \
    for i in $(seq 1 5); do \
      if curl -sf {{appium-server-url}}/status >/dev/null; then READY=1; break; fi; \
      sleep 1; \
    done; \
    if [ "$READY" -ne 1 ]; then echo "Appium not ready"; exit 1; fi; \
    curl -sf {{appium-server-url}}/status; \
    '

test-web-appium-login:
    just appium-start
    @bash -lc 'set -euo pipefail; \
    SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"; \
    if [ -z "$SDK_ROOT" ] && [ -d "$HOME/Android/Sdk" ]; then SDK_ROOT="$HOME/Android/Sdk"; fi; \
    if [ -z "$SDK_ROOT" ] && [ -d "$HOME/Android/sdk" ]; then SDK_ROOT="$HOME/Android/sdk"; fi; \
    if [ -z "$SDK_ROOT" ] && [ -d "$HOME/Library/Android/sdk" ]; then SDK_ROOT="$HOME/Library/Android/sdk"; fi; \
    ADB="$SDK_ROOT/platform-tools/adb"; \
    if [ ! -x "$ADB" ]; then \
      echo "adb missing at $ADB"; \
      exit 1; \
    fi; \
    "$ADB" start-server >/dev/null; \
    if ! "$ADB" devices | awk "NR>1 && \$2==\"device\" {found=1} END{exit(found?0:1)}"; then \
      echo "No Android device connected right now, trying to start/recover emulator..."; \
      just android-emulator-start >/dev/null; \
      "$ADB" start-server >/dev/null; \
      RECOVERED=0; \
      for i in $(seq 1 90); do \
        if "$ADB" devices | awk "NR>1 && \$2==\"device\" {found=1} END{exit(found?0:1)}"; then \
          RECOVERED=1; \
          break; \
        fi; \
        sleep 1; \
      done; \
      if [ "$RECOVERED" -ne 1 ]; then \
        echo "No Android device connected. Start emulator or connect phone first."; \
        echo "Tip: run just android-devices"; \
        exit 1; \
      fi; \
    fi; \
    "$ADB" wait-for-device; \
    STABLE=1; \
    for i in $(seq 1 20); do \
      if ! "$ADB" devices | awk "NR>1 && \$2==\"device\" {found=1} END{exit(found?0:1)}"; then \
        STABLE=0; \
        break; \
      fi; \
      sleep 1; \
    done; \
    if [ "$STABLE" -ne 1 ]; then \
      echo "Android device connection is unstable (flapping)."; \
      echo "Run: just android-emulator-start && just android-devices"; \
      exit 1; \
    fi; \
    READY=0; \
    for i in $(seq 1 360); do \
      BOOTED=$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d "\r"); \
      BOOTANIM=$("$ADB" shell getprop init.svc.bootanim 2>/dev/null | tr -d "\r"); \
      SETTINGS_OK=$("$ADB" shell "cmd settings get global airplane_mode_on >/dev/null 2>&1; echo \$?" 2>/dev/null | tr -d "\r"); \
      if [ "$BOOTED" = "1" ] || { [ "$BOOTANIM" = "stopped" ] && [ "$SETTINGS_OK" = "0" ]; }; then \
        READY=1; \
        break; \
      fi; \
      sleep 1; \
    done; \
    if [ "$READY" -ne 1 ]; then \
      echo "Android device is connected but not fully booted."; \
      echo "boot_completed=$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d "\r") bootanim=$("$ADB" shell getprop init.svc.bootanim 2>/dev/null | tr -d "\r")"; \
      exit 1; \
    fi; \
    APPIUM_SERVER_URL={{appium-server-url}} LOGIN_URL={{appium-login-url}} ./scripts/pnpm.sh run smoke:appium:login || { \
      echo "---- appium log tail ----"; \
      tail -n 120 /tmp/gam-trade/appium.log || true; \
      exit 1; \
    }; \
    '

test-web-appium-login-up: appium-start test-web-appium-login

test-web-appium:
    just test-app-web-up
    just android-emulator-start
    just appium-stop
    just appium-start
    just test-web-appium-login

test-web-appium-visible:
    just test-app-web-up
    just android-emulator-start-visible
    just appium-stop
    just appium-start
    just test-web-appium-login

# Native app smoke (installs the Android APK into the visible emulator)
test-app: test-app-native
test-app-ios: test-app-ios-native

# Default smoke runs web only. App/Appium tests need Android tooling.
smoke: smoke-health test-web

# Backward-compatible aliases
smoke-user-web: test-web-smoke
smoke-user-ui: test-web-smoke
smoke-appium-login: test-web-appium-login
smoke-appium-login-up: test-web-appium-login-up
smoke-appium-e2e: test-web-appium
test-app-login: test-web-appium-login
test-app-login-up: test-web-appium-login-up
test-app-smoke: test-app-native
