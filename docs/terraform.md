# Terraform Infrastructure

這份文件介紹目前 repo 裡的 Terraform 架構。詳細 AWS root module 操作仍以 `infra/terraform/README.md` 為準；這裡偏向總覽、責任邊界與日常工作流。

## Overview

目前有兩套 Terraform root module：

| Root module | Purpose | Backend | Target |
| --- | --- | --- | --- |
| `infra/terraform` | 真 AWS 多環境平台基礎設施 | S3 remote backend | `dev`、`staging`、`prod` workspaces |
| `infra/terraform-localstack` | LocalStack-friendly AWS 子集驗證 | local backend | 本機/CI LocalStack |

真 AWS stack 管理完整平台資源。LocalStack stack 只保留能穩定在 LocalStack 測的核心資源形狀，作為快速驗證與 CI smoke test。

## AWS Stack

`infra/terraform` 是主要基礎設施入口。命名規則使用：

```hcl
local.name_prefix = "${var.project_name}-${var.environment}"
```

預設專案名是 `gamloot`，所以 `dev` 環境資源會使用 `gamloot-dev-*` 或相近命名。

目前 AWS stack 建立：

- VPC：public/private subnets，依環境決定 NAT gateway 形態。
- ALB：HTTPS listener、service target groups、path rules。
- ECS/Fargate：`user-api`、`cms-api`、`worker-order`、`worker-payment`、`worker-notification`。
- ECR：每個 service 一個 repository。
- RDS PostgreSQL：含 `DATABASE_URL` SSM SecureString。
- ElastiCache Redis：含 `REDIS_URL` SSM parameter。
- Cloud Map：私有 service discovery namespace，供服務互相尋址。
- CloudWatch：log groups、alarms、dashboard。
- Runtime S3 buckets：預設建立 `runtime` bucket。
- Observability：Amazon Managed Grafana、AMP、X-Ray、ADOT collector。
- GitHub Actions OIDC：供 Terraform AWS workflow assume role。

Public services 目前是：

| Service | Port | ALB paths |
| --- | --- | --- |
| `user-api` | `8080` | `/api/user/*`、`/user/*`、`/health` |
| `cms-api` | `8081` | `/api/cms/*`、`/cms/*` |

Workers 沒有接 ALB，只跑 private ECS services。

## Modules

`infra/terraform/main.tf` 組合以下 modules：

- `modules/alb`：ALB security group、load balancer、target groups、HTTPS listener、listener rules。
- `modules/ecs-service`：ECS cluster、ECR repositories、IAM task roles、task definitions、Fargate services、Cloud Map service registrations。
- `modules/rds`：PostgreSQL、DB subnet group/security group、`DATABASE_URL` SSM parameter。
- `modules/redis`：Redis cluster、subnet group/security group、`REDIS_URL` SSM parameter。
- `modules/cloudwatch`：service log groups、alarms、dashboard。
- `modules/s3`：runtime buckets。
- `modules/grafana`：Amazon Managed Grafana 與 AMP workspace。
- `modules/observability-collector`：ADOT collector ECS service，負責 Prometheus remote write 與 X-Ray traces。

OIDC 放在 root module 的 `github-oidc.tf`，因為它是 CI/CD 存取這整個 stack 的入口，不屬於單一服務 module。

## Environments And State

AWS stack 使用 Terraform workspaces 做環境隔離：

| Workspace | tfvars | State path |
| --- | --- | --- |
| `dev` | `infra/terraform/environments/dev/terraform.tfvars` | `s3://gamloot-terraform-state/gamloot/dev/platform/terraform.tfstate` |
| `staging` | `infra/terraform/environments/staging/terraform.tfvars` | `s3://gamloot-terraform-state/gamloot/staging/platform/terraform.tfstate` |
| `prod` | `infra/terraform/environments/prod/terraform.tfvars` | `s3://gamloot-terraform-state/gamloot/prod/platform/terraform.tfstate` |

Remote backend 設定在 `infra/terraform/backend.hcl`：

- bucket：`gamloot-terraform-state`
- key：`platform/terraform.tfstate`
- workspace prefix：`gamloot`
- lock：S3 native lockfile

`db_password` 與 `certificate_arn` 不放在 tfvars，必須由本機 `-var`、環境變數，或 GitHub Actions secrets 注入。

## GitHub Actions OIDC

`github-oidc.tf` 建立 GitHub Actions 對 AWS 的 OIDC trust。

預設允許：

- repository：`MarkForCode/GamLoot`
- branches：`main`、`develop`
- audience：`sts.amazonaws.com`

Terraform 建立的角色命名為：

```text
<project>-<environment>-github-actions-terraform
```

主要 outputs：

- `github_actions_role_arn`
- `github_oidc_provider_arn`

GitHub workflow 會從 GitHub Environment variable/secret 讀取 `AWS_TERRAFORM_ROLE_ARN`。建議在 `dev`、`staging`、`prod` environments 分別設定對應環境的 role ARN。

### Bootstrap prerequisite

第一次 apply 不能靠 OIDC，因為 OIDC provider 和 GitHub Actions IAM role 還沒被建立。Terraform 會先初始化 S3 backend，再讀取 state、規劃和建立 AWS resources；所以 `terraform init -backend-config=backend.hcl` 本身就需要既有 AWS identity 能存取 `gamloot-terraform-state`。

如果本機沒有 `AWS_PROFILE` 或 `AWS_*` credentials，會先在 backend init 階段看到 `No valid credential sources found`。建議用 AWS SSO profile 完成第一次 bootstrap：

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

把 `github_actions_role_arn` 複製到對應 GitHub Environment 的 `AWS_TERRAFORM_ROLE_ARN`。之後 GitHub Actions 會用 OIDC assume role 取得短期 AWS credentials，不需要長期 `AWS_ACCESS_KEY_ID` 或 `AWS_SECRET_ACCESS_KEY`。

## LocalStack Stack

`infra/terraform-localstack` 是 LocalStack 專用 root module。它刻意只測 LocalStack 穩定支援、且和主 stack 命名/形狀有關的資源：

- runtime S3 bucket module
- SSM `DATABASE_URL` parameter naming
- CloudWatch Logs group naming
- ECR repository naming
- ECS task execution IAM role trust policy shape

它不建立：

- ECS services
- RDS
- ElastiCache
- ALB
- Managed Grafana
- AMP
- X-Ray
- GitHub OIDC

LocalStack workflow 使用 fake AWS credentials，這是 LocalStack SDK/API 相容性需要，不代表真 AWS credential。

## Common Commands

AWS validate：

```bash
cd infra/terraform
terraform fmt -check -recursive
terraform init -backend=false
terraform validate
```

AWS plan/apply：

```bash
cd infra/terraform
terraform init -backend-config=backend.hcl -reconfigure
terraform workspace select dev || terraform workspace new dev
terraform plan \
  -var-file=environments/dev/terraform.tfvars \
  -var 'db_password=<value>' \
  -var 'certificate_arn=<value>'
terraform apply \
  -var-file=environments/dev/terraform.tfvars \
  -var 'db_password=<value>' \
  -var 'certificate_arn=<value>'
```

LocalStack test：

```bash
just tf-localstack-test
```

或拆開跑：

```bash
docker compose -f docker-compose.localstack.yml up -d localstack

cd infra/terraform-localstack
terraform init
terraform test
tflocal init
tflocal plan

cd ../terratest
go test ./... -v
```

## CI Behavior

Terraform 相關 CI 詳細寫在 `docs/ci.md`。

簡短版：

- PR 修改 `infra/terraform/**` 或 `.github/workflows/terraform-aws.yml` 時，只跑 AWS Terraform format/init/validate，不連 AWS。
- push 到 `develop` 時，AWS workflow target `dev` 並執行 plan。
- push 到 `main` 時，AWS workflow target `prod` 並執行 plan。
- 手動 `Terraform AWS` workflow 可選 `dev`、`staging`、`prod`，且只有 `apply=true` 時才 apply。
- `Terraform LocalStack` 是手動 workflow，跑 LocalStack、`terraform test`、`tflocal plan`、Terratest。

## Adding Infrastructure

新增 Terraform 資源時建議遵守：

- 優先放進既有 module；只有跨 module 或 CI/CD 基礎資源才放 root。
- 新環境差異優先放 `environments/<env>/terraform.tfvars`，不要在 module 內硬編環境名稱。
- 新 secret 優先放 SSM Parameter Store，再透過 ECS task secrets 注入。
- 新 public service 需要同時更新 `local.services`、`local.public_services`、ALB path rules、CloudWatch/observability 對應設定。
- 如果新資源能在 LocalStack 穩定測，補到 `infra/terraform-localstack` 和 Terratest；不穩定的 managed service 不硬塞。
- 改 OIDC policy 時同步檢查 `.github/workflows/terraform-aws.yml` 是否仍有足夠但不過度的 AWS 權限。

## Troubleshooting

- `terraform init -backend=false` 適合本機語法驗證，不會連 remote state。
- 第一次 bootstrap 若看到 `No valid credential sources found`，代表 S3 backend 還沒有 AWS credentials；先用 AWS SSO 登入並設定 `AWS_PROFILE`，再用 `terraform init -backend-config=backend.hcl -reconfigure`。
- `terraform plan` 缺少 `db_password` 或 `certificate_arn` 時，請用 `TF_VAR_db_password` / `TF_VAR_certificate_arn` 或 GitHub secrets 注入。
- OIDC assume role 失敗時，先確認來源分支是 `main` 或 `develop`，以及 GitHub Environment 的 `AWS_TERRAFORM_ROLE_ARN` 指向正確 workspace role。
- LocalStack 失敗時先看 `docker compose -f docker-compose.localstack.yml logs localstack`，再重跑 `just tf-localstack-down && just tf-localstack-test`。
- 真 AWS workflow 不應設定 `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`；它應透過 OIDC 取得短期 credentials。
