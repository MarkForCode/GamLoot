#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"

SDK_ROOT="$(android_require_sdk)"
EMULATOR_BIN="$SDK_ROOT/emulator/emulator"

android_require_executable "$EMULATOR_BIN" "emulator"

"$EMULATOR_BIN" -list-avds
