#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"

VISIBLE=0
if [ "${1:-}" = "--visible" ]; then
  VISIBLE=1
fi

android_setup_java

SDK_ROOT="$(android_require_sdk)"
ADB="$SDK_ROOT/platform-tools/adb"
EMULATOR_BIN="$SDK_ROOT/emulator/emulator"
AVDMANAGER="$SDK_ROOT/cmdline-tools/latest/bin/avdmanager"

android_require_executable "$ADB" "adb"

"$ADB" start-server >/dev/null 2>&1 || true

if android_has_connected_device "$ADB"; then
  echo "Android device already connected."
  "$ADB" devices -l
  exit 0
fi

if [ ! -x "$EMULATOR_BIN" ]; then
  echo "No Android device connected, and emulator command is missing."
  echo "Install Android Emulator via Android Studio SDK tools, or connect a phone with USB debugging."
  exit 1
fi

AVD_NAME="${ANDROID_AVD_NAME:-}"
if [ -z "$AVD_NAME" ]; then
  AVD_NAME="$("$EMULATOR_BIN" -list-avds | head -n 1)"
fi

if ! "$EMULATOR_BIN" -list-avds | grep -qx "$AVD_NAME"; then
  if [ -x "$AVDMANAGER" ]; then
    if [ -z "$AVD_NAME" ]; then
      AVD_NAME="gam_api34"
    fi

    echo "creating AVD $AVD_NAME..."
    echo no | "$AVDMANAGER" create avd -n "$AVD_NAME" -k "system-images;android-34;google_apis;x86_64"
  fi
fi

if [ -z "$AVD_NAME" ]; then
  echo "No AVD found. Create one in Android Studio Device Manager first."
  exit 1
fi

EMULATOR_ARGS=(-avd "$AVD_NAME" -no-audio -no-boot-anim -gpu swiftshader_indirect)
if [ "$VISIBLE" -ne 1 ]; then
  EMULATOR_ARGS+=(-no-window)
fi

if [ -e /dev/kvm ]; then
  EMULATOR_ARGS+=(-accel auto)
else
  EMULATOR_ARGS+=(-accel off)
fi

nohup "$EMULATOR_BIN" "${EMULATOR_ARGS[@]}" >/tmp/gam-trade-emulator.log 2>&1 &

if [ "$VISIBLE" -eq 1 ]; then
  echo "Starting visible emulator: $AVD_NAME"
else
  echo "Starting emulator: $AVD_NAME"
fi

CONNECTED=0
for _ in $(seq 1 180); do
  if android_has_connected_device "$ADB"; then
    CONNECTED=1
    break
  fi

  sleep 1
done

if [ "$CONNECTED" -ne 1 ]; then
  echo "Emulator did not become ready in time. Check /tmp/gam-trade-emulator.log"
  exit 1
fi

if [ "$VISIBLE" -eq 1 ]; then
  echo "Visible emulator connected."
else
  echo "Emulator connected."
fi

"$ADB" devices -l
