# IAM Bootstrap Guide

This document explains which IAM roles are involved in Terraform deployment, so first-time deployers know what must exist or be permitted.

## 1. Default Dev Mode

In `environments/dev/terraform.tfvars`, the high-permission services are disabled by default:

- `enable_ecs_services = false`
- `enable_cloudwatch = false`
- `enable_grafana = false`
- `enable_loki = false`
- `enable_observability_collector = false`
- `enable_rds = false`
- `enable_redis = false`

In this mode, Terraform does not create ECS, Loki, Grafana, or ADOT task roles, so these IAM actions are not required:

- `iam:CreateRole`
- `iam:AttachRolePolicy`
- `iam:PutRolePolicy`
- `iam:PassRole`

It also skips RDS, Redis, and observability runtime provisioning.

## 2. Roles Created When ECS Is Enabled

If `enable_ecs_services = true`, Terraform creates these roles in `modules/ecs-service`:

- `${project}-${env}-ecs-execution`
- `${project}-${env}-ecs-task`

The execution role pulls images, reads SSM parameters for runtime secrets, and starts Fargate tasks. App task definitions also include a Fluent Bit FireLens sidecar when `enable_loki = true`.

## 3. Roles Created When Loki Is Enabled

If both flags are true:

- `enable_ecs_services = true`
- `enable_loki = true`

Terraform creates these roles in `modules/loki`:

- `${project}-${env}-loki-execution`
- `${project}-${env}-loki-task`

The Loki task role needs S3 permissions for the Loki bucket:

- `s3:ListBucket`
- `s3:GetObject`
- `s3:PutObject`
- `s3:DeleteObject`

## 4. Roles Created When Grafana Is Enabled

If all below are true:

- `enable_ecs_services = true`
- `enable_loki = true`
- `enable_grafana = true`

Terraform creates these roles in `modules/grafana`:

- `${project}-${env}-grafana-execution`
- `${project}-${env}-grafana-task`

If `grafana_admin_password_parameter_name` is set, the Grafana execution role can read that SSM SecureString parameter and decrypt it with KMS.

## 5. Legacy ADOT Collector

`enable_observability_collector` is retained as a compatibility variable, but the root stack does not currently provision the ADOT collector. AWS metrics/traces are intentionally out of scope for this logs-first Loki migration.

## 6. Deployment Paths

Low-permission bootstrap:

- Keep the default dev flags disabled.
- No ECS/Loki/Grafana IAM role creation is attempted.
- RDS/Redis provisioning is skipped.

Full logs platform deployment:

- Enable ECS, Loki, and Grafana.
- Ensure the deployer principal can create and pass IAM roles:
  `iam:CreateRole`, `iam:AttachRolePolicy`, `iam:PutRolePolicy`, `iam:PassRole`.
- Ensure the deployer principal can create and manage S3 buckets used by Loki.

Other non-IAM permissions may still be needed depending on enabled modules, such as VPC, ALB, RDS, Redis, S3, ECS, and Service Discovery.
