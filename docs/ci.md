# CI/CD Workflows

本專案目前有三條 GitHub Actions workflow：一般程式碼 CI、LocalStack Terraform 驗證、以及真 AWS Terraform OIDC 部署流程。

## Workflow Overview

| Workflow | File | Trigger | Purpose |
| --- | --- | --- | --- |
| CI | `.github/workflows/ci.yml` | PR / push to `main`, `develop`; manual | Node 與 Rust 的 lint/test gate |
| Terraform LocalStack | `.github/workflows/terraform-localstack.yml` | manual only | 用 LocalStack 驗證 Terraform AWS 子集與 Terratest |
| Terraform AWS | `.github/workflows/terraform-aws.yml` | Terraform 相關 PR / push to `main`, `develop`; manual | 真 AWS Terraform validate/plan/apply，透過 GitHub OIDC assume role |

## CI

`CI` 是主要的程式碼品質檢查，會在 PR、`main` / `develop` push、或手動執行時觸發。

它包含：

- `node-ci`
  - 使用 Node.js 22 與 pnpm。
  - 執行 `pnpm install --frozen-lockfile`。
  - 執行 `pnpm lint`。
  - 執行 `pnpm test`。
  - 永遠嘗試上傳 `coverage/` 與 `test-results/` artifact。
- `rust-ci`
  - 使用 stable Rust toolchain，包含 `rustfmt` 與 `clippy`。
  - 使用 `Swatinem/rust-cache` 快取 `rust -> target`。
  - 執行 `cargo fmt --all --check`。
  - 執行 `cargo clippy --all-targets -- -D warnings`。
  - 執行 `cargo test --all`。
- `appium-smoke`
  - 目前以 `if: ${{ false }}` 關閉。
  - 保留給未來啟用 user-web Appium smoke test。

Concurrency 使用 `ci-${{ github.ref }}`，同一個 ref 的新 run 會取消舊 run。

## Terraform LocalStack

`Terraform LocalStack` 是手動 workflow，用來在 GitHub Actions runner 內啟動 LocalStack，驗證 local-friendly 的 AWS Terraform 子集。

它會：

- 使用 fake AWS credentials：`AWS_ACCESS_KEY_ID=test`、`AWS_SECRET_ACCESS_KEY=test`。
- 啟動 `docker-compose.localstack.yml` 的 LocalStack。
- 在 `infra/terraform-localstack` 執行：
  - `terraform init`
  - `terraform test`
  - `tflocal init`
  - `tflocal plan`
- 在 `infra/terratest` 執行 `go test ./... -v`。
- 永遠收集 LocalStack logs、Terraform state/lockfile、Terratest logs 作為 artifact。
- 結束時執行 `./scripts/terraform/localstack-down.sh` 清理 LocalStack。

這條 workflow 不使用 GitHub OIDC，也不連真 AWS。它的 fake credentials 是 LocalStack 測試所需，不應套用到真 AWS workflow。

## Terraform AWS

`Terraform AWS` 是真 AWS 的 Terraform workflow。它只在 `.github/workflows/terraform-aws.yml` 或 `infra/terraform/**` 有變更時自動觸發。

它分成兩個 job：

- `validate`
  - PR、push、manual 都會跑。
  - 不需要 AWS credentials。
  - 執行 `terraform fmt -check -recursive`。
  - 執行 `terraform init -backend=false`。
  - 執行 `terraform validate`。
- `plan`
  - PR 不會跑。
  - push 到 `develop` 時 target `dev`。
  - push 到 `main` 時 target `prod`。
  - manual `workflow_dispatch` 可選 `dev`、`staging`、`prod`。
  - 透過 GitHub OIDC 與 `aws-actions/configure-aws-credentials@v4` assume AWS IAM role。
  - 執行 remote backend init、workspace select/new、`terraform plan`。
  - 上傳 `tfplan` artifact。
  - 只有 manual run 且 `apply=true` 時才執行 `terraform apply -auto-approve tfplan`。

Concurrency 使用 target ref/environment，且 `cancel-in-progress: false`，避免正在跑的 Terraform 操作被新 run 中斷。

## AWS OIDC Setup

OIDC 資源由 `infra/terraform/github-oidc.tf` 管理。

Terraform 會建立：

- GitHub Actions OIDC provider：`https://token.actions.githubusercontent.com`
- Terraform deploy role：`<project>-<environment>-github-actions-terraform`
- Trust policy：
  - audience 必須是 `sts.amazonaws.com`
  - subject 只允許：
    - `repo:MarkForCode/GamLoot:ref:refs/heads/main`
    - `repo:MarkForCode/GamLoot:ref:refs/heads/develop`
- Terraform deploy policy，覆蓋目前 stack 需要管理的 AWS 服務。

### Bootstrap prerequisite

第一次 bootstrap 仍需要用既有 AWS identity 在本機或受信任環境執行。原因是 Terraform 會先初始化 S3 backend，之後才會建立 GitHub OIDC provider 與 IAM role；如果本機沒有 `AWS_PROFILE` 或 `AWS_*` credentials，`terraform init -backend-config=backend.hcl` 會先失敗並顯示 `No valid credential sources found`。

建議使用 AWS SSO profile bootstrap：

```bash
aws configure sso
aws sso login --profile <profile-name>

export AWS_PROFILE=<profile-name>
export AWS_REGION=us-east-1
export AWS_DEFAULT_REGION=us-east-1

cd infra/terraform
terraform init -backend-config=backend.hcl -reconfigure
terraform workspace select dev || terraform workspace new dev
terraform apply \
  -var-file=environments/dev/terraform.tfvars \
  -var 'db_password=<value>' \
  -var 'certificate_arn=<value>'
terraform output github_actions_role_arn
```

建議為 GitHub Environments `dev`、`staging`、`prod` 分別設定：

- `AWS_TERRAFORM_ROLE_ARN`
- `DB_PASSWORD`
- `CERTIFICATE_ARN`

把 `github_actions_role_arn` output 複製到對應 GitHub Environment 的 `AWS_TERRAFORM_ROLE_ARN`。`AWS_TERRAFORM_ROLE_ARN` 可以放 environment variable 或 secret；`DB_PASSWORD` 與 `CERTIFICATE_ARN` 應放 secrets。role 建好後，GitHub Actions 會透過 OIDC 取得短期 AWS credentials，不需要長期 `AWS_ACCESS_KEY_ID` 或 `AWS_SECRET_ACCESS_KEY`。

## Local Commands

常用本機對應命令：

```bash
# Node CI equivalent
pnpm install --frozen-lockfile
pnpm lint
pnpm test

# Rust CI equivalent
cd rust
cargo fmt --all --check
cargo clippy --all-targets -- -D warnings
cargo test --all

# Terraform AWS validate equivalent
cd infra/terraform
terraform fmt -check -recursive
terraform init -backend=false
terraform validate

# Terraform LocalStack equivalent
just tf-localstack-test
```

## Troubleshooting

- `Terraform AWS` 的 PR 只跑 validate，不會建立 AWS credentials；這是預期行為。
- 第一次 bootstrap 在 `terraform init` 失敗且看到 `No valid credential sources found` 時，先用 `aws sso login --profile <profile-name>` 登入，設定 `AWS_PROFILE`，再用 `terraform init -backend-config=backend.hcl -reconfigure` 重試。
- `Terraform AWS` 的 push/manual plan 若在 configure credentials 失敗，先檢查 GitHub environment 是否有正確的 `AWS_TERRAFORM_ROLE_ARN`。
- 若 OIDC assume role 失敗，確認 workflow 來源分支是 `main` 或 `develop`，且 IAM trust policy 的 repository 是 `MarkForCode/GamLoot`。
- 若 Terraform plan 缺少變數，確認 target GitHub environment 有 `DB_PASSWORD` 與 `CERTIFICATE_ARN` secrets。
- `Terraform LocalStack` 只使用 fake AWS credentials；不要把 `AWS_ACCESS_KEY_ID=test` 或 `AWS_SECRET_ACCESS_KEY=test` 複製到真 AWS workflow。
