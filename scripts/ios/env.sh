#!/usr/bin/env bash

set -euo pipefail

ios_xcode_path() {
  xcode-select -p 2>/dev/null || true
}

ios_has_simctl() {
  xcrun simctl help >/dev/null 2>&1
}

ios_require_xcode() {
  local selected_path
  selected_path="$(ios_xcode_path)"

  if [ -z "$selected_path" ]; then
    echo "Xcode developer directory is not selected."
    echo "Install Xcode from the App Store, then run: sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
    exit 1
  fi

  if ! ios_has_simctl; then
    echo "xcrun simctl is not available from the selected developer directory: $selected_path"
    echo "Install full Xcode, open it once to finish setup, then run:"
    echo "  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
    echo "  sudo xcodebuild -runFirstLaunch"
    exit 1
  fi
}

ios_default_simulator_name() {
  xcrun simctl list devices available | awk -F '[()]' '/iPhone/ && /Shutdown|Booted/ { print $1; exit }' | sed 's/^[[:space:]]*//; s/[[:space:]]*$//'
}

ios_booted_simulator_udid() {
  xcrun simctl list devices booted | awk -F '[()]' '/Booted/ { print $2; exit }'
}

ios_has_available_simulator() {
  [ -n "$(ios_default_simulator_name)" ]
}

ios_print_simulator_help() {
  echo "No available iPhone simulator was found."
  echo "Open Xcode > Settings > Platforms and install an iOS Simulator runtime,"
  echo "or try: xcodebuild -downloadPlatform iOS"
}
