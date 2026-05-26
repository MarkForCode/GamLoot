#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"

SELECTED_XCODE="$(ios_xcode_path)"

echo "xcode-select=${SELECTED_XCODE:-<unset>}"
echo "xcodebuild=$(command -v xcodebuild || echo '<missing>')"
echo "xcrun=$(command -v xcrun || echo '<missing>')"

if ios_has_simctl; then
  echo "simctl=available"
  echo "booted_simulator=${IOS_DEVICE_UDID:-$(ios_booted_simulator_udid || true)}"
  echo "default_simulator=${IOS_SIMULATOR_NAME:-$(ios_default_simulator_name || true)}"
  if ! ios_has_available_simulator; then
    ios_print_simulator_help
  fi
else
  echo "simctl=<unavailable>"
  echo "Install full Xcode and select it with:"
  echo "  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
fi
