#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROFILE="${1:-${K6_PROFILE:-baseline}}"
IMAGE="${K6_DOCKER_IMAGE:-grafana/k6:0.54.0}"
USER_API_BASE_URL="${USER_API_BASE_URL:-http://localhost:8080}"
CMS_API_BASE_URL="${CMS_API_BASE_URL:-http://localhost:8081}"
SUMMARY_PATH="${K6_SUMMARY_PATH:-/reports/k6/${PROFILE}-summary.json}"

cd "$ROOT_DIR"
mkdir -p reports/k6

if [ "${K6_SKIP_WAIT:-0}" != "1" ]; then
  node scripts/wait-http.mjs "${USER_API_BASE_URL%/}/health"
  if [ "${K6_INCLUDE_CMS:-true}" != "false" ]; then
    node scripts/wait-http.mjs "${CMS_API_BASE_URL%/}/health"
  fi
fi

echo "Running k6 Docker profile: $PROFILE"
echo "image: $IMAGE"
echo "user-api: $USER_API_BASE_URL"
if [ "${K6_INCLUDE_CMS:-true}" != "false" ]; then
  echo "cms-api: $CMS_API_BASE_URL"
else
  echo "cms-api: disabled"
fi

docker run --rm \
  --network host \
  -v "$ROOT_DIR/tests/k6:/scripts:ro" \
  -v "$ROOT_DIR/reports/k6:/reports/k6" \
  -e K6_PROFILE="$PROFILE" \
  -e USER_API_BASE_URL="$USER_API_BASE_URL" \
  -e CMS_API_BASE_URL="$CMS_API_BASE_URL" \
  -e USER_LOGIN_ID="${USER_LOGIN_ID:-}" \
  -e USER_PASSWORD_HASH="${USER_PASSWORD_HASH:-}" \
  -e CMS_LOGIN_EMAIL="${CMS_LOGIN_EMAIL:-}" \
  -e CMS_PASSWORD_HASH="${CMS_PASSWORD_HASH:-}" \
  -e K6_INCLUDE_CMS="${K6_INCLUDE_CMS:-true}" \
  -e K6_INCLUDE_AUTH_FAILURE="${K6_INCLUDE_AUTH_FAILURE:-true}" \
  -e K6_THINK_TIME_SECONDS="${K6_THINK_TIME_SECONDS:-1}" \
  -e K6_BASELINE_TARGET_VUS="${K6_BASELINE_TARGET_VUS:-}" \
  -e K6_STRESS_TARGET_VUS="${K6_STRESS_TARGET_VUS:-}" \
  -e K6_VUS="${K6_VUS:-}" \
  -e K6_DURATION="${K6_DURATION:-}" \
  -e K6_RAMP_UP="${K6_RAMP_UP:-}" \
  -e K6_HOLD="${K6_HOLD:-}" \
  -e K6_RAMP_DOWN="${K6_RAMP_DOWN:-}" \
  -e K6_HTTP_FAIL_RATE="${K6_HTTP_FAIL_RATE:-}" \
  -e K6_HTTP_P95="${K6_HTTP_P95:-}" \
  -e K6_HTTP_P99="${K6_HTTP_P99:-}" \
  -e K6_LOGIN_SUCCESS_RATE="${K6_LOGIN_SUCCESS_RATE:-}" \
  -e K6_SUMMARY_PATH="$SUMMARY_PATH" \
  "$IMAGE" run /scripts/api-baseline.js
