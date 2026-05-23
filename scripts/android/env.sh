#!/usr/bin/env bash

set -euo pipefail

android_setup_java() {
  if [ -z "${JAVA_HOME:-}" ] && [ -d "$HOME/.local/jdk-21" ]; then
    export JAVA_HOME="$HOME/.local/jdk-21"
  fi

  if [ -n "${JAVA_HOME:-}" ]; then
    export PATH="$JAVA_HOME/bin:$PATH"
  fi
}

android_resolve_sdk() {
  local sdk_root="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"

  if [ -n "$sdk_root" ] && [ ! -d "$sdk_root" ]; then
    sdk_root=""
  fi

  if [ -z "$sdk_root" ] && [ -d "$HOME/Android/Sdk" ]; then
    sdk_root="$HOME/Android/Sdk"
  fi

  if [ -z "$sdk_root" ] && [ -d "$HOME/Android/sdk" ]; then
    sdk_root="$HOME/Android/sdk"
  fi

  printf '%s\n' "$sdk_root"
}

android_require_sdk() {
  local sdk_root
  sdk_root="$(android_resolve_sdk)"

  if [ -z "$sdk_root" ]; then
    echo "Android SDK not found. Set ANDROID_HOME/ANDROID_SDK_ROOT, or install Android SDK."
    echo "Run: just android-env-check"
    exit 1
  fi

  printf '%s\n' "$sdk_root"
}

android_require_executable() {
  local path="$1"
  local name="$2"

  if [ ! -x "$path" ]; then
    echo "$name missing at $path"
    exit 1
  fi
}

android_has_connected_device() {
  local adb="$1"

  "$adb" devices | awk 'NR > 1 && $2 == "device" { found = 1 } END { exit(found ? 0 : 1) }'
}
