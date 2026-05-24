#!/usr/bin/env bash
set -euo pipefail

docker compose -f docker-compose.localstack.yml up -d --remove-orphans localstack

started_at="$(date +%s)"
timeout="${LOCALSTACK_READY_TIMEOUT:-90}"
until curl -fs http://localhost:4566/_localstack/health >/dev/null 2>&1; do
  if [ $(( "$(date +%s)" - started_at )) -ge "$timeout" ]; then
    echo "LocalStack did not become ready within ${timeout}s" >&2
    docker compose -f docker-compose.localstack.yml logs localstack >&2 || true
    exit 1
  fi
  sleep 2
done

echo "LocalStack is ready at http://localhost:4566"
