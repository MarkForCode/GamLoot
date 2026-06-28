#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

echo "==> checking whitespace and patch formatting"
git diff --check

if [[ -d rust ]]; then
  if command -v cargo >/dev/null 2>&1; then
    echo "==> checking Rust formatting"
    (cd rust && cargo fmt --all --check)
  else
    echo "cargo not found; skipping Rust format check" >&2
  fi
fi

echo "format verification passed"
