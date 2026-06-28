# Deployment Matrix

## Local Development and Smoke Deployment

| Service | Local Method | Build Source | Health / Check |
| --- | --- | --- | --- |
| `postgres` | Docker Compose | `postgres:16-alpine` | `pg_isready -U gam_trade -d gam_trade_dev` |
| `redis` | Docker Compose | `redis:7-alpine` | `redis-cli ping` |
| `user-api` | Docker Compose or `just dev-user-api` | `rust/services/user-api/Dockerfile` | `GET /health`, `GET /metrics` |
| `cms-api` | Docker Compose or `just dev-cms-api` | `rust/services/cms-api/Dockerfile` | `GET /health`, `GET /metrics` |
| `order-worker` | Docker Compose | `rust/workers/order/Dockerfile` | TODO: no healthcheck found. |
| `payment-worker` | Docker Compose | `rust/workers/payment/Dockerfile` | TODO: no healthcheck found. |
| `notification-worker` | Docker Compose | `rust/workers/notification/Dockerfile` | TODO: no healthcheck found. |
| `user-web` | Docker Compose or `just dev-web` | `apps/user/web/Dockerfile` | `GET /health` |
| `admin-web` | Docker Compose or `just dev-admin` | `apps/admin/web/Dockerfile` | `GET /health` |
| `user-app` | Docker Compose or `just dev-app` | `apps/user/app/Dockerfile` | Container healthcheck hits Expo server on `8081`. |
| `fluent-bit` | Docker Compose | `grafana/fluent-bit-plugin-loki:latest` | TODO: no explicit healthcheck found. |
| `alloy` | Docker Compose | `grafana/alloy:latest` | Prometheus scrapes `alloy:12345/metrics`. |
| `loki` | Docker Compose | `grafana/loki:latest` | Queried by observability smoke scripts. |
| `tempo` | Docker Compose | `grafana/tempo:latest` | TODO: no explicit healthcheck found. |
| `prometheus` | Docker Compose | `prom/prometheus:latest` | Scraped/queried through observability smoke scripts. |
| `mimir` | Docker Compose | `grafana/mimir:latest` | Queried at `/prometheus/api/v1/query`. |
| `grafana` | Docker Compose | `grafana/grafana:latest` | TODO: no explicit healthcheck found. |

## AWS / Production-Like Deployment

| Service | Deployment Method | Public? | Notes |
| --- | --- | --- | --- |
| `user-api` | Terraform `modules/ecs-service`: ECR + ECS/Fargate + ALB + Cloud Map + SSM secrets | Yes | ALB path patterns `/api/user/*`, `/user/*`, `/health`; port `8080`. |
| `cms-api` | Terraform `modules/ecs-service`: ECR + ECS/Fargate + ALB + Cloud Map + SSM secrets | Yes | ALB path patterns `/api/cms/*`, `/cms/*`; port `8081`. |
| `worker-order` | Terraform `modules/ecs-service`: ECR + ECS/Fargate + SSM secrets | No | Terraform service key differs from Rust/Docker Compose name `order-worker`. |
| `worker-payment` | Terraform `modules/ecs-service`: ECR + ECS/Fargate + SSM secrets | No | Terraform service key differs from Rust/Docker Compose name `payment-worker`. |
| `worker-notification` | Terraform `modules/ecs-service`: ECR + ECS/Fargate + SSM secrets | No | Terraform service key differs from Rust/Docker Compose name `notification-worker`. |
| `postgres` | Terraform `modules/rds` | No | Creates RDS PostgreSQL and `DATABASE_URL` SSM parameter. |
| `redis` | Terraform `modules/redis` | No | Creates ElastiCache Redis and `REDIS_URL` SSM parameter. |
| `loki` | Terraform `modules/loki` | No | Deploys Loki read/write/backend/gateway ECS services with S3 storage when enabled. |
| `grafana` | Terraform `modules/grafana` | No | Private Cloud Map endpoint; configured with Loki datasource. |
| `user-web` | TODO: no AWS deployment method found. | TODO | Dockerfile exists for local/container build only. |
| `admin-web` | TODO: no AWS deployment method found. | TODO | Dockerfile exists for local/container build only. |
| `user-app` | TODO: no production mobile release method found. | TODO | Local Dockerfile and native build helpers exist. |
| `tempo` | TODO: no AWS deployment method found. | No | Terraform README says traces are not provisioned in this iteration. |
| `prometheus` / `mimir` | TODO: no AWS deployment method found. | No | Terraform README says metrics are not provisioned in this iteration. |
| `alloy` / observability collector | TODO: root Terraform module sets `observability_collector` count to `0`. | No | Module exists but is not active in root stack. |
| `fluent-bit` | FireLens sidecar in ECS task definitions when Loki logging is enabled. | No | Local service becomes AWS sidecar pattern. |

## CI/CD Workflows

| Workflow | Service Coverage | Notes |
| --- | --- | --- |
| `.github/workflows/ci.yml` | Node workspaces and Rust workspace | Runs Node install/lint/typecheck/test and Rust fmt/clippy/test. Appium smoke job is present but disabled. |
| `.github/workflows/terraform-localstack.yml` | Terraform LocalStack subset | Manual workflow for LocalStack validation and Terratest. |
| `.github/workflows/terraform-aws.yml` | AWS Terraform stack | Validates on PR; plans on push or manual dispatch when AWS role is configured; apply is manual only. |
| `.github/workflows/ai-code-review.yml` | Pull request diffs | Advisory PR review only; not a deployment path. |

## Open Deployment TODOs

- TODO: Define production deployment path for `user-web`.
- TODO: Define production deployment path for `admin-web`.
- TODO: Define production release path for `user-app`.
- TODO: Reconcile worker service naming between Rust packages, Docker Compose, Terraform, ECR, ECS, and Loki labels.
- TODO: Decide whether production traces and metrics should be provisioned, since local Compose has Alloy/Tempo/Prometheus/Mimir but Terraform README says they are not provisioned in this iteration.
