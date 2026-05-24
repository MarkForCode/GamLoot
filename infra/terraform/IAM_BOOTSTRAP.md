# IAM Bootstrap Guide (First Deployment)

This document explains which IAM roles are involved in Terraform deployment, so first-time deployers know what must exist or be permitted.

## 1) Current default dev mode (low-permission)

In `environments/dev/terraform.tfvars`, these are currently disabled:

- `enable_ecs_services = false`
- `enable_cloudwatch = false`
- `enable_grafana = false`
- `enable_observability_collector = false`
- `enable_rds = false`
- `enable_redis = false`

In this mode, Terraform does **not** create ECS/ADOT task roles, so these high-risk IAM actions are not required:

- `iam:CreateRole`
- `iam:PutRolePolicy`

It also skips:

- RDS creation (`rds:CreateDBSubnetGroup` not required)
- Redis URL SSM write (`ssm:PutParameter` on `/${project}-${env}/REDIS_URL` not required)

## 2) Roles created when ECS is enabled

If you set `enable_ecs_services = true`, Terraform creates these roles in `modules/ecs-service/main.tf`:

- `${project}-${env}-ecs-execution`
- `${project}-${env}-ecs-task`

Example for dev (`project_name=gamloot`, `environment=dev`):

- `gamloot-dev-ecs-execution`
- `gamloot-dev-ecs-task`

## 3) Additional roles created when observability collector is enabled

If all below are true:

- `enable_ecs_services = true`
- `enable_grafana = true`
- `enable_observability_collector = true`

Terraform also creates these roles in `modules/observability-collector/main.tf`:

- `${project}-${env}-adot-execution`
- `${project}-${env}-adot-task`

Example for dev:

- `gamloot-dev-adot-execution`
- `gamloot-dev-adot-task`

## 4) What first-time deployers should prepare

Choose one path:

1. Low-permission bootstrap (recommended for first run)
- Keep the six flags above as `false`.
- No ECS/ADOT IAM role creation is attempted.
- RDS/Redis provisioning is skipped.

2. Full platform deployment
- Enable ECS/observability flags.
- Ensure deployer principal is allowed to create and pass IAM roles, including:
`iam:CreateRole`, `iam:AttachRolePolicy`, `iam:PutRolePolicy`, `iam:PassRole`.

## 5) Related note

Even in low-permission mode, other non-IAM permissions may still be needed depending on enabled modules (for example VPC, ALB, RDS, Redis, S3).
