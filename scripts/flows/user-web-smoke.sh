#!/usr/bin/env bash
set -euo pipefail

docker compose up -d --build postgres redis user-api user-web
node scripts/wait-http.mjs http://localhost:8080/health http://localhost:3000/health
just db-seed || true
APP_URL="${APP_URL:-http://localhost:3000}" node scripts/smoke-user-web.mjs
