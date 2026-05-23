#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"

SDK_ROOT="$(android_resolve_sdk)"

echo "ANDROID_HOME=${ANDROID_HOME:-<unset>}"
echo "ANDROID_SDK_ROOT=${ANDROID_SDK_ROOT:-<unset>}"
echo "resolved_sdk=${SDK_ROOT:-<unset>}"

if [ -n "$SDK_ROOT" ]; then
  ADB="$SDK_ROOT/platform-tools/adb"

  echo "adb=$ADB"
  echo "emulator=$SDK_ROOT/emulator/emulator"
  echo "sdkmanager=$SDK_ROOT/cmdline-tools/latest/bin/sdkmanager"

  if [ -x "$ADB" ]; then
    "$ADB" devices || true
  fi
fi
