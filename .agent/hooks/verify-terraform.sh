#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

if ! command -v terraform >/dev/null 2>&1; then
  echo "terraform not found; install Terraform to run infrastructure validation" >&2
  exit 127
fi

run_terraform_root() {
  local root="$1"

  if [[ ! -d "$root" ]]; then
    return 0
  fi

  echo "==> terraform fmt: $root"
  terraform -chdir="$root" fmt -check -recursive

  echo "==> terraform init -backend=false: $root"
  terraform -chdir="$root" init -backend=false

  echo "==> terraform validate: $root"
  terraform -chdir="$root" validate
}

run_terraform_root "infra/terraform"
run_terraform_root "infra/terraform-localstack"

echo "terraform verification passed"
