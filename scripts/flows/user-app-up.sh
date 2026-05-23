#!/usr/bin/env bash
set -euo pipefail

docker compose up -d --build postgres redis user-api user-app
WAIT_TIMEOUT_MS="${WAIT_TIMEOUT_MS:-180000}" node scripts/wait-http.mjs \
  http://localhost:8080/health \
  http://localhost:8082
just db-seed || true
