#!/usr/bin/env bash
set -euo pipefail

services=(
  postgres
  redis
  loki
  tempo
  mimir
  prometheus
  grafana
  alloy
  user-api
  cms-api
)

docker compose up -d --build "${services[@]}"

"$(dirname "$0")/smoke.sh"
