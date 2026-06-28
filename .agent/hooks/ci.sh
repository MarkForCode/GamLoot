#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

.agent/hooks/pre-push.sh
.agent/hooks/verify-terraform.sh

echo "ci hook bundle passed"
