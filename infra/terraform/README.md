# Terraform for AWS multi-environment deployment

This folder provisions the core AWS services for this monorepo and supports multiple environments (`dev`, `staging`, `prod`, ...) through Terraform workspaces.

## What it creates

- VPC (public/private subnets across 2 AZ)
- ECS cluster + Fargate services
- ECR repositories (`user-api`, `cms-api`, `worker-order`, `worker-payment`, `worker-notification`)
- RDS PostgreSQL (Multi-AZ optional)
- ElastiCache Redis
- ALB + HTTPS listener (certificate ARN provided externally)
- CloudWatch log groups, alarms, and dashboard
- Runtime S3 buckets
- Amazon Managed Grafana + Amazon Managed Service for Prometheus
- ADOT collector for metrics and traces
- AWS X-Ray trace ingestion
- SSM Parameter Store entries for shared runtime config
- GitHub Actions OIDC provider and Terraform deploy role

## Structure

- `providers.tf` / `versions.tf`: Terraform and AWS provider config
- `backend.hcl`: S3 remote state backend config
- `variables.tf`: root variables for all environments
- `main.tf`: composes the service modules
- `github-oidc.tf`: GitHub Actions OIDC provider, trust policy, and deploy role
- `outputs.tf`: useful output values
- `environments/<env>/terraform.tfvars`: per-environment values
- `modules/alb`: ALB security group, listener, target groups, and listener rules
- `modules/ecs-service`: ECS cluster, ECR repositories, Fargate task definitions, and services
- `modules/rds`: PostgreSQL, DB security group, and `DATABASE_URL` SSM parameter
- `modules/redis`: ElastiCache Redis and `REDIS_URL` SSM parameter
- `modules/s3`: runtime S3 buckets
- `modules/cloudwatch`: service log groups, alarms, and dashboard
- `modules/grafana`: Amazon Managed Grafana and AMP workspace
- `modules/observability-collector`: ADOT collector ECS service for AMP remote write and X-Ray traces

## Observability mapping

Local Docker Compose keeps the full Grafana OSS stack for development. AWS uses managed equivalents:

| Compose service | AWS Terraform mapping |
| --- | --- |
| Grafana | Amazon Managed Grafana |
| Mimir | Amazon Managed Service for Prometheus |
| Prometheus scrape | ADOT collector scraping `user-api` and `cms-api` `/metrics` |
| Alloy | ADOT collector on ECS/Fargate |
| Loki | CloudWatch Logs |
| Tempo | AWS X-Ray |

The collector is registered in private Cloud Map as `observability-collector.<project>-<env>.local`. App tasks send OTLP traces to port `4317`, and the collector scrapes API metrics through private service discovery.

## Remote state

Terraform state is stored in S3 with native S3 state locking enabled. Create the state bucket once before `terraform init`:

```bash
aws s3api create-bucket \
  --bucket gamloot-terraform-state \
  --region us-east-1

aws s3api put-bucket-versioning \
  --bucket gamloot-terraform-state \
  --versioning-configuration Status=Enabled

aws s3api put-public-access-block \
  --bucket gamloot-terraform-state \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

If the bucket name is already taken, create a globally unique bucket name and update `backend.hcl`.

Workspace state paths:

- `dev`: `s3://gamloot-terraform-state/gamloot/dev/platform/terraform.tfstate`
- `staging`: `s3://gamloot-terraform-state/gamloot/staging/platform/terraform.tfstate`
- `prod`: `s3://gamloot-terraform-state/gamloot/prod/platform/terraform.tfstate`

## GitHub Actions OIDC

Terraform creates an IAM OIDC provider for `https://token.actions.githubusercontent.com` and a deploy role named `<project>-<env>-github-actions-terraform`. The trust policy is limited to this repository and the configured branches:

- repository: `github_oidc_repository`, default `MarkForCode/GamLoot`
- branches: `github_oidc_allowed_branches`, default `["main", "develop"]`

Bootstrap the role once with existing AWS credentials:

```bash
cd infra/terraform
terraform init -backend-config=backend.hcl
terraform workspace select dev || terraform workspace new dev
terraform apply -var-file=environments/dev/terraform.tfvars
terraform output github_actions_role_arn
```

Add the output role ARN to GitHub as `AWS_TERRAFORM_ROLE_ARN` (prefer a GitHub Environment variable or secret for each `dev`, `staging`, and `prod` environment; a repository-level value also works for single-environment bootstraps). The AWS Terraform workflow uses OIDC and does not require long-lived `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` values. It also expects `DB_PASSWORD` and `CERTIFICATE_ARN` secrets for plans.

The workflow validates pull requests without AWS access. Pushes to `develop` plan `dev`, pushes to `main` plan `prod`, and `workflow_dispatch` can target `dev`, `staging`, or `prod`. Apply is manual only through `workflow_dispatch` with `apply=true`.

## Usage

```bash
cd infra/terraform
terraform init -backend-config=backend.hcl

# dev
terraform workspace select dev || terraform workspace new dev
terraform plan  -var-file=environments/dev/terraform.tfvars
terraform apply -var-file=environments/dev/terraform.tfvars

# staging
terraform workspace select staging || terraform workspace new staging
terraform plan  -var-file=environments/staging/terraform.tfvars
terraform apply -var-file=environments/staging/terraform.tfvars

# prod
terraform workspace select prod || terraform workspace new prod
terraform plan  -var-file=environments/prod/terraform.tfvars
terraform apply -var-file=environments/prod/terraform.tfvars
```

## First-time IAM setup

See `IAM_BOOTSTRAP.md` for:

- Which IAM roles Terraform creates when ECS/observability are enabled
- Which feature flags avoid IAM role creation for low-permission bootstrap
- What first-time deployers should prepare before enabling full deployment

## Notes

- `db_password` and other secrets should be injected from CI/CD (not committed).
- Run `terraform init -backend-config=backend.hcl -migrate-state` if migrating existing local state into S3.
- Terraform workspaces are the environment boundary; keep the selected workspace aligned with the matching `terraform.tfvars`.
- `user-api` and `cms-api` are attached to the public ALB. Workers run as private ECS services only.
- Managed Grafana is created as a workspace with CloudWatch, Prometheus, and X-Ray data sources. Dashboard JSON provisioning is intentionally left for a later iteration.
- Metrics are scraped only from `user-api` and `cms-api` in the first AWS observability pass.
- Production enables deletion protection and should keep Multi-AZ enabled.
- Add Route53 and ACM lifecycle management if you want full DNS + cert automation in Terraform. For ALB, the ACM certificate must be in the same AWS region as this stack (default: ap-southeast-1).
