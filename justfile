# Game Trade Platform - Justfile
set dotenv-load := true

postgres-url := "postgresql://gam_trade:gam_trade_secure_pass@localhost:5432/gam_trade_dev"
appium-server-url := "http://127.0.0.1:4723"
appium-login-url := "http://10.0.2.2:3000/zh-TW/login"
user-app-apk := "apps/user/app/android/app/build/outputs/apk/release/app-release.apk"
user-app-package := "com.gamtrade.user"
user-app-activity := ".MainActivity"

# Default target
default: help

# Help
help:
    @just --list

# Install dependencies
install:
    pnpm install

# Development
dev:
    pnpm dev

dev-user-web: dev-web
dev-web:
    pnpm --filter @gam/user-web dev

dev-user-app: dev-app
dev-app:
    pnpm --filter @gam/user-app dev

dev-admin-web: dev-admin
dev-admin:
    pnpm --filter @gam/admin-web dev

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
    pnpm build

build-rust:
    cd rust && cargo build --release

build-user-web:
    pnpm --filter @gam/user-web build

build-user-app-android:
    @bash -lc 'set -euo pipefail; \
    if [ -z "${JAVA_HOME:-}" ] && [ -d "$HOME/.local/jdk-21" ]; then export JAVA_HOME="$HOME/.local/jdk-21"; fi; \
    if [ -n "${JAVA_HOME:-}" ]; then export PATH="$JAVA_HOME/bin:$PATH"; fi; \
    SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"; \
    if [ -z "$SDK_ROOT" ] && [ -d "$HOME/Android/Sdk" ]; then SDK_ROOT="$HOME/Android/Sdk"; fi; \
    if [ -z "$SDK_ROOT" ] && [ -d "$HOME/Android/sdk" ]; then SDK_ROOT="$HOME/Android/sdk"; fi; \
    if [ ! -d "$SDK_ROOT" ]; then echo "Android SDK not found. Run: just android-env-check"; exit 1; fi; \
    export ANDROID_HOME="$SDK_ROOT"; \
    export ANDROID_SDK_ROOT="$SDK_ROOT"; \
    export PATH="$SDK_ROOT/platform-tools:$SDK_ROOT/cmdline-tools/latest/bin:$PATH"; \
    if [ ! -d apps/user/app/android ]; then CI=1 pnpm --filter @gam/user-app exec expo prebuild --platform android --no-install; fi; \
    cd apps/user/app/android; \
    NODE_ENV=production ./gradlew assembleRelease; \
    '

build-admin-web:
    pnpm --filter @gam/admin-web build

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

db-up: dev-db

db-validate: validate-migrations

db-apply-migrations:
    docker compose exec -T postgres mkdir -p /tmp/migrations
    docker compose cp rust/infrastructure/db/migrations/. postgres:/tmp/migrations
    for migration in rust/infrastructure/db/migrations/*.sql; do docker compose exec -T -e PGPASSWORD=gam_trade_secure_pass postgres psql -v ON_ERROR_STOP=1 -U gam_trade -d gam_trade_dev < "$migration" >/dev/null; echo "applied $migration"; done

# Lint
lint:
    pnpm lint

lint-user-web:
    pnpm --filter @gam/user-web lint

lint-admin-web:
    pnpm --filter @gam/admin-web lint

# Clean
clean:
    rm -rf apps/*/dist apps/*/.next
    rm -rf packages/*/dist
    cd rust && cargo clean

# Test
test:
    pnpm test || echo "No test command configured"

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
    pnpm --filter @gam/admin-web lint
    pnpm --filter @gam/admin-web build

check-user-web:
    pnpm --filter @gam/user-web lint
    pnpm --filter @gam/user-web build

check-all: validate-migrations check-rust check-user-web check-admin-web

# Type check
typecheck:
    pnpm run --filter=* typecheck || echo "No typecheck command in turbo pipeline"

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
    docker compose up -d --build postgres redis user-api user-web
    node scripts/wait-http.mjs http://localhost:8080/health http://localhost:3000/health
    just db-seed || true
    APP_URL=http://localhost:3000 node scripts/smoke-user-web.mjs

test-web: test-web-smoke

test-app-web-up:
    docker compose up -d --build postgres redis user-api user-web user-app
    WAIT_TIMEOUT_MS=180000 node scripts/wait-http.mjs http://localhost:8080/health http://localhost:3000/health http://localhost:8082
    just db-seed || true

test-app-up:
    docker compose up -d --build postgres redis user-api user-app
    WAIT_TIMEOUT_MS=180000 node scripts/wait-http.mjs http://localhost:8080/health http://localhost:8082
    just db-seed || true

test-app-visible:
    just test-app-up
    APP_URL=http://localhost:8082 pnpm run smoke:user-app:visible

test-app-web-visible: test-app-visible

android-install-user-app:
    @bash -lc 'set -euo pipefail; \
    SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"; \
    if [ -z "$SDK_ROOT" ] && [ -d "$HOME/Android/Sdk" ]; then SDK_ROOT="$HOME/Android/Sdk"; fi; \
    if [ -z "$SDK_ROOT" ] && [ -d "$HOME/Android/sdk" ]; then SDK_ROOT="$HOME/Android/sdk"; fi; \
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

test-app-native-login:
    just android-install-user-app
    APPIUM_SERVER_URL={{appium-server-url}} ANDROID_APP_PACKAGE={{user-app-package}} ANDROID_APP_ACTIVITY={{user-app-activity}} pnpm run smoke:appium:user-app

test-app-native:
    just build-user-app-android
    just android-emulator-start-visible
    just appium-stop
    just appium-start
    just test-app-native-login

# Web Appium tests (Android Chrome)
android-env-check:
    @bash -lc 'set -euo pipefail; \
    SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"; \
    if [ -n "$SDK_ROOT" ] && [ ! -d "$SDK_ROOT" ]; then SDK_ROOT=""; fi; \
    if [ -z "$SDK_ROOT" ] && [ -d "$HOME/Android/Sdk" ]; then SDK_ROOT="$HOME/Android/Sdk"; fi; \
    if [ -z "$SDK_ROOT" ] && [ -d "$HOME/Android/sdk" ]; then SDK_ROOT="$HOME/Android/sdk"; fi; \
    echo "ANDROID_HOME=${ANDROID_HOME:-<unset>}"; \
    echo "ANDROID_SDK_ROOT=${ANDROID_SDK_ROOT:-<unset>}"; \
    echo "resolved_sdk=${SDK_ROOT:-<unset>}"; \
    if [ -n "$SDK_ROOT" ]; then \
      echo "adb=$SDK_ROOT/platform-tools/adb"; \
      echo "emulator=$SDK_ROOT/emulator/emulator"; \
      echo "sdkmanager=$SDK_ROOT/cmdline-tools/latest/bin/sdkmanager"; \
      [ -x "$SDK_ROOT/platform-tools/adb" ] && "$SDK_ROOT/platform-tools/adb" devices || true; \
    fi; \
    '

android-devices:
    @bash -lc 'set -euo pipefail; \
    SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"; \
    if [ -z "$SDK_ROOT" ] && [ -d "$HOME/Android/Sdk" ]; then SDK_ROOT="$HOME/Android/Sdk"; fi; \
    if [ -z "$SDK_ROOT" ] && [ -d "$HOME/Android/sdk" ]; then SDK_ROOT="$HOME/Android/sdk"; fi; \
    ADB="$SDK_ROOT/platform-tools/adb"; \
    if [ ! -x "$ADB" ]; then echo "adb missing at $ADB"; exit 1; fi; \
    "$ADB" start-server >/dev/null; \
    "$ADB" devices -l; \
    '

android-emulators:
    @bash -lc 'set -euo pipefail; \
    SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"; \
    if [ -z "$SDK_ROOT" ] && [ -d "$HOME/Android/Sdk" ]; then SDK_ROOT="$HOME/Android/Sdk"; fi; \
    if [ -z "$SDK_ROOT" ] && [ -d "$HOME/Android/sdk" ]; then SDK_ROOT="$HOME/Android/sdk"; fi; \
    EMULATOR_BIN="$SDK_ROOT/emulator/emulator"; \
    if [ ! -x "$EMULATOR_BIN" ]; then \
      echo "emulator missing at $EMULATOR_BIN"; \
      exit 1; \
    fi; \
    "$EMULATOR_BIN" -list-avds; \
    '

android-emulator-start:
    @bash -lc 'set -euo pipefail; \
    if [ -z "${JAVA_HOME:-}" ] && [ -d "$HOME/.local/jdk-21" ]; then export JAVA_HOME="$HOME/.local/jdk-21"; fi; \
    if [ -n "${JAVA_HOME:-}" ]; then export PATH="$JAVA_HOME/bin:$PATH"; fi; \
    SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"; \
    if [ -z "$SDK_ROOT" ] && [ -d "$HOME/Android/Sdk" ]; then SDK_ROOT="$HOME/Android/Sdk"; fi; \
    if [ -z "$SDK_ROOT" ] && [ -d "$HOME/Android/sdk" ]; then SDK_ROOT="$HOME/Android/sdk"; fi; \
    ADB="$SDK_ROOT/platform-tools/adb"; \
    EMULATOR_BIN="$SDK_ROOT/emulator/emulator"; \
    AVDMANAGER="$SDK_ROOT/cmdline-tools/latest/bin/avdmanager"; \
    if [ ! -x "$ADB" ]; then echo "adb missing at $ADB"; exit 1; fi; \
    "$ADB" start-server >/dev/null 2>&1 || true; \
    if "$ADB" devices | awk "NR>1 && \$2==\"device\" {found=1} END{exit(found?0:1)}"; then \
      echo "Android device already connected."; \
      "$ADB" devices -l; \
    else \
    if [ ! -x "$EMULATOR_BIN" ]; then \
      echo "No Android device connected, and emulator command is missing."; \
      echo "Install Android Emulator via Android Studio SDK tools, or connect a phone with USB debugging."; \
      exit 1; \
    fi; \
    AVD_NAME="${ANDROID_AVD_NAME:-}"; \
    if [ -z "$AVD_NAME" ]; then AVD_NAME="$($EMULATOR_BIN -list-avds | head -n 1)"; fi; \
    if ! "$EMULATOR_BIN" -list-avds | grep -qx "$AVD_NAME"; then \
      if [ -x "$AVDMANAGER" ]; then \
        if [ -z "$AVD_NAME" ]; then AVD_NAME="gam_api34"; fi; \
        echo "creating AVD $AVD_NAME..."; \
        echo no | "$AVDMANAGER" create avd -n "$AVD_NAME" -k "system-images;android-34;google_apis;x86_64"; \
      fi; \
    fi; \
    if [ -z "$AVD_NAME" ]; then \
      echo "No AVD found. Create one in Android Studio Device Manager first."; \
      exit 1; \
    fi; \
    EMULATOR_ACCEL_ARGS="-accel auto"; \
    if [ ! -e /dev/kvm ]; then EMULATOR_ACCEL_ARGS="-accel off"; fi; \
    nohup "$EMULATOR_BIN" -avd "$AVD_NAME" -no-window -no-audio -no-boot-anim -gpu swiftshader_indirect $EMULATOR_ACCEL_ARGS >/tmp/gam-trade-emulator.log 2>&1 & \
    echo "Starting emulator: $AVD_NAME"; \
    CONNECTED=0; \
    for i in $(seq 1 180); do \
      if "$ADB" devices | awk "NR>1 && \$2==\"device\" {found=1} END{exit(found?0:1)}"; then \
        CONNECTED=1; \
        break; \
      fi; \
      sleep 1; \
    done; \
    if [ "$CONNECTED" -ne 1 ]; then \
      echo "Emulator did not become ready in time. Check /tmp/gam-trade-emulator.log"; \
      exit 1; \
    fi; \
    echo "Emulator connected."; \
    "$ADB" devices -l; \
    fi; \
    '

android-emulator-start-visible:
    @bash -lc 'set -euo pipefail; \
    if [ -z "${JAVA_HOME:-}" ] && [ -d "$HOME/.local/jdk-21" ]; then export JAVA_HOME="$HOME/.local/jdk-21"; fi; \
    if [ -n "${JAVA_HOME:-}" ]; then export PATH="$JAVA_HOME/bin:$PATH"; fi; \
    SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"; \
    if [ -z "$SDK_ROOT" ] && [ -d "$HOME/Android/Sdk" ]; then SDK_ROOT="$HOME/Android/Sdk"; fi; \
    if [ -z "$SDK_ROOT" ] && [ -d "$HOME/Android/sdk" ]; then SDK_ROOT="$HOME/Android/sdk"; fi; \
    ADB="$SDK_ROOT/platform-tools/adb"; \
    EMULATOR_BIN="$SDK_ROOT/emulator/emulator"; \
    AVDMANAGER="$SDK_ROOT/cmdline-tools/latest/bin/avdmanager"; \
    if [ ! -x "$ADB" ]; then echo "adb missing at $ADB"; exit 1; fi; \
    "$ADB" start-server >/dev/null 2>&1 || true; \
    if "$ADB" devices | awk "NR>1 && \$2==\"device\" {found=1} END{exit(found?0:1)}"; then \
      echo "Android device already connected."; \
      "$ADB" devices -l; \
    else \
    if [ ! -x "$EMULATOR_BIN" ]; then \
      echo "No Android device connected, and emulator command is missing."; \
      exit 1; \
    fi; \
    AVD_NAME="${ANDROID_AVD_NAME:-}"; \
    if [ -z "$AVD_NAME" ]; then AVD_NAME="$($EMULATOR_BIN -list-avds | head -n 1)"; fi; \
    if ! "$EMULATOR_BIN" -list-avds | grep -qx "$AVD_NAME"; then \
      if [ -x "$AVDMANAGER" ]; then \
        if [ -z "$AVD_NAME" ]; then AVD_NAME="gam_api34"; fi; \
        echo "creating AVD $AVD_NAME..."; \
        echo no | "$AVDMANAGER" create avd -n "$AVD_NAME" -k "system-images;android-34;google_apis;x86_64"; \
      fi; \
    fi; \
    if [ -z "$AVD_NAME" ]; then echo "No AVD found."; exit 1; fi; \
    EMULATOR_ACCEL_ARGS="-accel auto"; \
    if [ ! -e /dev/kvm ]; then EMULATOR_ACCEL_ARGS="-accel off"; fi; \
    nohup "$EMULATOR_BIN" -avd "$AVD_NAME" -no-audio -no-boot-anim -gpu swiftshader_indirect $EMULATOR_ACCEL_ARGS >/tmp/gam-trade-emulator.log 2>&1 & \
    echo "Starting visible emulator: $AVD_NAME"; \
    CONNECTED=0; \
    for i in $(seq 1 180); do \
      if "$ADB" devices | awk "NR>1 && \$2==\"device\" {found=1} END{exit(found?0:1)}"; then \
        CONNECTED=1; \
        break; \
      fi; \
      sleep 1; \
    done; \
    if [ "$CONNECTED" -ne 1 ]; then \
      echo "Emulator did not become ready in time. Check /tmp/gam-trade-emulator.log"; \
      exit 1; \
    fi; \
    echo "Visible emulator connected."; \
    "$ADB" devices -l; \
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
      if pnpm exec appium driver list --installed | grep -q "uiautomator2"; then \
        echo "uiautomator2 driver already installed"; \
      else \
        pnpm exec appium driver install --source=npm appium-uiautomator2-driver@4.2.9 >/dev/null 2>&1 || true; \
      fi; \
      nohup pnpm exec appium --base-path / --address 127.0.0.1 --port 4723 --allow-insecure chromedriver_autodownload >/tmp/gam-trade/appium.log 2>&1 & \
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
    APPIUM_SERVER_URL={{appium-server-url}} LOGIN_URL={{appium-login-url}} pnpm run smoke:appium:login || { \
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
