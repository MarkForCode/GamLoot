#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

if command -v just >/dev/null 2>&1; then
  echo "==> running just lint"
  just lint
elif command -v pnpm >/dev/null 2>&1; then
  echo "==> running pnpm lint"
  pnpm lint
else
  echo "neither just nor pnpm found; cannot run lint" >&2
  exit 127
fi

if [[ -d rust ]] && command -v cargo >/dev/null 2>&1; then
  echo "==> running Rust clippy"
  (cd rust && cargo clippy --all-targets -- -D warnings)
else
  echo "cargo not found or rust/ missing; skipping Rust clippy" >&2
fi

echo "lint verification passed"
