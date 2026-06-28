#!/usr/bin/env bash
set -euo pipefail

mode="${1:---docs-only}"

run_if_available() {
  local label="$1"
  shift

  echo "==> ${label}"
  "$@"
}

case "$mode" in
  --docs-only)
    run_if_available "verify docs" .agent/hooks/verify-docs.sh
    ;;
  --pre-commit)
    run_if_available "pre-commit bundle" .agent/hooks/pre-commit.sh
    ;;
  --pre-push)
    run_if_available "pre-push bundle" .agent/hooks/pre-push.sh
    ;;
  --ci)
    run_if_available "ci bundle" .agent/hooks/ci.sh
    ;;
  --full)
    run_if_available "ci bundle" .agent/hooks/ci.sh
    ;;
  *)
    echo "usage: $0 [--docs-only|--pre-commit|--pre-push|--ci|--full]" >&2
    exit 2
    ;;
esac
