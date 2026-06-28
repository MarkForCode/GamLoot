#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

if command -v just >/dev/null 2>&1; then
  echo "==> running just test"
  just test
elif command -v pnpm >/dev/null 2>&1; then
  echo "==> running pnpm test"
  pnpm test
else
  echo "neither just nor pnpm found; cannot run Node tests" >&2
  exit 127
fi

if [[ -d rust ]] && command -v cargo >/dev/null 2>&1; then
  echo "==> running Rust tests"
  (cd rust && cargo test --all)
else
  echo "cargo not found or rust/ missing; skipping Rust tests" >&2
fi

echo "test verification passed"
