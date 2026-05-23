#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"

SDK_ROOT="$(android_require_sdk)"
ADB="$SDK_ROOT/platform-tools/adb"

android_require_executable "$ADB" "adb"

"$ADB" start-server >/dev/null
"$ADB" devices -l
