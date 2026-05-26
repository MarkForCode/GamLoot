#!/usr/bin/env bash

set -euo pipefail

if command -v pnpm >/dev/null 2>&1; then
  exec pnpm "$@"
fi

if command -v corepack >/dev/null 2>&1; then
  exec corepack pnpm "$@"
fi

echo "pnpm not found. Install pnpm, or install Node.js with corepack enabled." >&2
exit 127
