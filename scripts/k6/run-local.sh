#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROFILE="${1:-${K6_PROFILE:-baseline}}"
USER_API_BASE_URL="${USER_API_BASE_URL:-http://localhost:8080}"
CMS_API_BASE_URL="${CMS_API_BASE_URL:-http://localhost:8081}"
SUMMARY_PATH="${K6_SUMMARY_PATH:-reports/k6/${PROFILE}-summary.json}"

cd "$ROOT_DIR"
mkdir -p "$(dirname "$SUMMARY_PATH")"

if ! command -v k6 >/dev/null 2>&1; then
  echo "k6 is not installed."
  echo "Install k6 locally, or run: pnpm run load:k6:docker"
  exit 127
fi

if [ "${K6_SKIP_WAIT:-0}" != "1" ]; then
  node scripts/wait-http.mjs "${USER_API_BASE_URL%/}/health"
  if [ "${K6_INCLUDE_CMS:-true}" != "false" ]; then
    node scripts/wait-http.mjs "${CMS_API_BASE_URL%/}/health"
  fi
fi

echo "Running k6 profile: $PROFILE"
echo "user-api: $USER_API_BASE_URL"
if [ "${K6_INCLUDE_CMS:-true}" != "false" ]; then
  echo "cms-api: $CMS_API_BASE_URL"
else
  echo "cms-api: disabled"
fi

K6_PROFILE="$PROFILE" \
USER_API_BASE_URL="$USER_API_BASE_URL" \
CMS_API_BASE_URL="$CMS_API_BASE_URL" \
K6_SUMMARY_PATH="$SUMMARY_PATH" \
k6 run tests/k6/api-baseline.js
