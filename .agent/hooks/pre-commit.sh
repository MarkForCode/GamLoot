#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

.agent/hooks/verify-format.sh
.agent/hooks/verify-docs.sh

echo "pre-commit hook bundle passed"
