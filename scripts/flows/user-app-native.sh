#!/usr/bin/env bash
set -euo pipefail

docker compose up -d --build postgres redis user-api
node scripts/wait-http.mjs http://localhost:8080/health
just db-seed || true
just build-user-app-android
just android-emulator-start-visible
just appium-stop
just appium-start
just test-app-native-login
