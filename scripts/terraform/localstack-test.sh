#!/usr/bin/env bash
set -euo pipefail

require_command() {
  local name="$1"
  local install_hint="$2"

  if ! command -v "$name" >/dev/null 2>&1; then
    echo "Missing required command: $name" >&2
    echo "$install_hint" >&2
    exit 127
  fi
}

require_command "terraform" "Install Terraform: https://developer.hashicorp.com/terraform/install"
require_command "tflocal" "Install tflocal: python3 -m pip install --user terraform-local"
require_command "go" "Install Go: https://go.dev/doc/install"

export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
export AWS_REGION="${AWS_REGION:-us-east-1}"

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"

"$script_dir/localstack-up.sh"

(
  cd "$repo_root/infra/terraform-localstack"
  terraform init
  terraform test
  tflocal init
  tflocal plan
)

(
  cd "$repo_root/infra/terratest"
  go test ./... -v
)
