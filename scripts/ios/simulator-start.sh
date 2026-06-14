#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"

ios_require_xcode

if [ -n "$(ios_booted_simulator_udid)" ]; then
  echo "iOS simulator already booted: $(ios_booted_simulator_udid)"
  exit 0
fi

SIMULATOR_NAME="${IOS_SIMULATOR_NAME:-$(ios_default_simulator_name)}"

if [ -z "$SIMULATOR_NAME" ]; then
  ios_print_simulator_help
  echo "After installing a runtime, run: just ios-simulators"
  exit 1
fi

echo "Booting iOS simulator: $SIMULATOR_NAME"
xcrun simctl boot "$SIMULATOR_NAME"
open -a Simulator

BOOTED=0
for _ in $(seq 1 120); do
  if [ -n "$(ios_booted_simulator_udid)" ]; then
    BOOTED=1
    break
  fi
  sleep 1
done

if [ "$BOOTED" -ne 1 ]; then
  echo "iOS simulator did not boot in time."
  exit 1
fi

xcrun simctl bootstatus booted -b
echo "iOS simulator booted: $(ios_booted_simulator_udid)"
