#!/usr/bin/env bash
set -euo pipefail

"$(dirname "$0")/user-app-up.sh"
APP_URL="${APP_URL:-http://localhost:8082}" ./scripts/pnpm.sh run smoke:user-app:visible
