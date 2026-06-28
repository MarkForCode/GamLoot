# Deployment Workflow

## Components

| Component | Deployment Path |
| --- | --- |
| Web apps | Docker/CI flow defined by app Dockerfiles and workflows. |
| Rust APIs | ECS/Fargate infrastructure managed by Terraform. |
| Workers | ECS/Fargate worker services managed by Terraform. |
| Infrastructure | `infra/terraform/` and GitHub Actions OIDC. |
| Observability | Terraform plus `ops/observability/` reference configs. |

## Terraform Flow

1. Format: `terraform fmt -check -recursive`.
2. Init without backend for validation: `terraform init -backend=false`.
3. Validate: `terraform validate`.
4. Plan against the target environment.
5. Apply only through an approved workflow and environment.
6. Capture outputs and monitor health.

## Release Checklist

- CI passes for changed components.
- Required secrets and environment variables are configured.
- Database migrations are forward-compatible.
- Rollback or mitigation is known.
- Health checks, logs, metrics, and traces are monitored after deploy.

## Rollback

Rollback plans should name:

- the component being rolled back;
- the previous known-good artifact or Terraform state;
- data migration implications;
- expected health signal after rollback.
