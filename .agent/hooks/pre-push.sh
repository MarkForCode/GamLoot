#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

.agent/hooks/pre-commit.sh
.agent/hooks/verify-lint.sh
.agent/hooks/verify-tests.sh
.agent/hooks/verify-migrations.sh

echo "pre-push hook bundle passed"
