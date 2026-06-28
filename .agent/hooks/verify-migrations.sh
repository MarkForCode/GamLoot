#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found; migration validation requires Docker" >&2
  exit 127
fi

if ! docker info >/dev/null 2>&1; then
  echo "docker is not running; migration validation requires Docker" >&2
  exit 1
fi

echo "==> validating SQL migrations against disposable Postgres"
scripts/validate-migrations.sh

echo "migration verification passed"
