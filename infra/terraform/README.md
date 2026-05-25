# Terraform for AWS Multi-Environment Deployment

This folder provisions the core AWS services for the monorepo and supports multiple environments (`dev`, `staging`, `prod`, ...) through Terraform workspaces.

## What It Creates

- VPC with public/private subnets across 2 AZs
- ECS cluster + Fargate services
- ECR repositories (`user-api`, `cms-api`, `worker-order`, `worker-payment`, `worker-notification`)
- RDS PostgreSQL
- ElastiCache Redis
- ALB + optional HTTPS listener
- Runtime S3 buckets
- Loki on ECS Fargate with S3-backed chunks/index
- Grafana on ECS Fargate, reachable through private Cloud Map
- Fluent Bit FireLens sidecars in app tasks for stdout/stderr log shipping
- Optional CloudWatch alarms/dashboard
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
- `modules/ecs-service`: ECS cluster, ECR repositories, Fargate task definitions, services, and FireLens sidecars
- `modules/loki`: Loki read/write/backend/gateway ECS services and S3 storage
- `modules/grafana`: Grafana ECS service and Loki datasource provisioning
- `modules/rds`: PostgreSQL, DB security group, and `DATABASE_URL` SSM parameter
- `modules/redis`: ElastiCache Redis and `REDIS_URL` SSM parameter
- `modules/s3`: runtime S3 buckets
- `modules/cloudwatch`: optional AWS alarms and dashboard
- `modules/observability-collector`: legacy ADOT collector module, currently not wired into the root stack

## Observability Mapping

AWS production logs:

```text
ECS app container stdout/stderr
  -> Fluent Bit FireLens sidecar
  -> Loki gateway on ECS
  -> Loki write/read/backend targets on ECS
  -> S3 chunks/index
  -> Grafana on ECS
```

Local Docker Compose keeps traces and metrics for development:

| Signal | Local Compose | AWS Terraform |
| --- | --- | --- |
| Logs | Fluent Bit -> Loki -> Grafana | FireLens -> Loki ECS -> S3 -> Grafana ECS |
| Traces | Alloy -> Tempo -> Grafana | Not provisioned in this iteration |
| Metrics | Prometheus -> Mimir -> Grafana | Not provisioned in this iteration |

Grafana is registered in private Cloud Map as `grafana.<project>-<env>.local:3000`. Loki is registered as `loki.<project>-<env>.local:3100`.

## Remote State

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

terraform workspace select dev || terraform workspace new dev
terraform plan  -var-file=environments/dev/terraform.tfvars
terraform apply -var-file=environments/dev/terraform.tfvars
```

Enable the ECS logs stack with:

```hcl
enable_ecs_services = true
enable_loki         = true
enable_grafana      = true
```

Set `grafana_admin_password_parameter_name` to an SSM SecureString parameter when you do not want to use the Grafana image default admin password.

## First-Time IAM Setup

See `IAM_BOOTSTRAP.md` for:

- Which IAM roles Terraform creates when ECS/Loki/Grafana are enabled
- Which feature flags avoid IAM role creation for low-permission bootstrap
- What first-time deployers should prepare before enabling full deployment

## Notes

- `db_password` and other secrets should be injected from CI/CD, not committed.
- Run `terraform init -backend-config=backend.hcl -migrate-state` if migrating existing local state into S3.
- Terraform workspaces are the environment boundary; keep the selected workspace aligned with the matching `terraform.tfvars`.
- `user-api` and `cms-api` are attached to the public ALB. Workers run as private ECS services only.
- CloudWatch app logs are not required when Loki logging is enabled.
- Production should keep Multi-AZ enabled for stateful AWS services.
- Add Route53 and ACM lifecycle management if you want full DNS + cert automation in Terraform. For ALB, the ACM certificate must be in the same AWS region as this stack.
