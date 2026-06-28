# Infrastructure Services

## Local Docker Compose Infrastructure

| Service | Responsibility | Dependencies | Infrastructure | Environment Variables | Deployment Method |
| --- | --- | --- | --- | --- | --- |
| `postgres` | Local PostgreSQL database for development, APIs, workers, seed data, smoke tests. | Docker volume `postgres_data`; seed SQL mounted from `seed/`. | Docker image `postgres:16-alpine`; host port `5432`; healthcheck with `pg_isready`. | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`. | Local only via Docker Compose. Cloud equivalent is Terraform `modules/rds`. |
| `redis` | Local Redis cache/coordination dependency. | Docker volume `redis_data`. | Docker image `redis:7-alpine`; host port `6379`; healthcheck with `redis-cli ping`. | None in Docker Compose. | Local only via Docker Compose. Cloud equivalent is Terraform `modules/redis`. |
| `fluent-bit` | Receives Docker fluentd logs and writes them to Loki. | `loki`; config from `ops/observability/fluent-bit/fluent-bit.conf`. | Docker image `grafana/fluent-bit-plugin-loki:latest`; host TCP/UDP `24224`. | None in Docker Compose. | Local via Docker Compose. AWS equivalent is FireLens sidecar when `enable_loki_logging` is true. |
| `alloy` | Receives OTLP traces and forwards them to Tempo. | `loki`, `tempo`; config from `ops/observability/alloy/config.alloy`. | Docker image `grafana/alloy:latest`; ports `4317`, `4318`, `12345`; volume `alloy_data`. | None in Docker Compose. | Local via Docker Compose. Terraform `observability-collector` module exists but root module count is `0`; TODO: production trace collector deployment is not active. |
| `loki` | Local log storage/query backend. | Config from `ops/observability/loki/config.yaml`; volume `loki_data`. | Docker image `grafana/loki:latest`; host port `3100`. | None in Docker Compose. | Local via Docker Compose. AWS Terraform can deploy Loki read/write/backend/gateway ECS services with S3 storage when `enable_loki` is true. |
| `tempo` | Local trace storage/query backend. | Config from `ops/observability/tempo/tempo.yaml`; volume `tempo_data`. | Docker image `grafana/tempo:latest`; host port `3200`. | None in Docker Compose. | Local via Docker Compose. Cloud deployment TODO: Terraform README says traces are not provisioned in this iteration. |
| `prometheus` | Scrapes local metrics and remote-writes to Mimir. | `mimir`; config from `ops/observability/prometheus/prometheus.yml`; volume `prometheus_data`. | Docker image `prom/prometheus:latest`; host port `9090`. | None in Docker Compose. | Local via Docker Compose. Cloud deployment TODO: Terraform README says metrics are not provisioned in this iteration. |
| `mimir` | Local metrics backend receiving Prometheus remote write. | Config from `ops/observability/mimir/config.yaml`; volume `mimir_data`. | Docker image `grafana/mimir:latest`; host port `9009`. | None in Docker Compose. | Local via Docker Compose. Cloud deployment TODO: Terraform README says metrics are not provisioned in this iteration. |
| `grafana` | Local dashboards and exploration for logs, traces, and metrics. | `loki`, `tempo`, `mimir`; provisioning from `ops/observability/grafana/provisioning`. | Docker image `grafana/grafana:latest`; host port `3002`; volume `grafana_data`. | `GF_SECURITY_ADMIN_USER`, `GF_SECURITY_ADMIN_PASSWORD`. | Local via Docker Compose. AWS Terraform can deploy Grafana ECS service with Loki datasource when `enable_grafana` and `enable_loki` are true. |

## AWS Infrastructure

| Component | Responsibility | Source |
| --- | --- | --- |
| VPC | Public/private subnet network boundary. | `infra/terraform/main.tf` |
| ALB | Public entrypoint for `user-api` and `cms-api`. | `infra/terraform/modules/alb` |
| ECS/Fargate | Runs `user-api`, `cms-api`, and private worker services. | `infra/terraform/modules/ecs-service` |
| ECR | Container image repositories for backend API and worker services. | `infra/terraform/modules/ecs-service` |
| RDS PostgreSQL | Cloud database and `DATABASE_URL` SSM parameter. | `infra/terraform/modules/rds` |
| ElastiCache Redis | Cloud Redis and `REDIS_URL` SSM parameter. | `infra/terraform/modules/redis` |
| Cloud Map | Private service discovery namespace for ECS services. | `infra/terraform/main.tf`, `infra/terraform/modules/ecs-service` |
| CloudWatch | Optional log groups, alarms, and dashboard. | `infra/terraform/modules/cloudwatch` |
| S3 runtime buckets | Runtime object storage. | `infra/terraform/modules/s3` |
| Loki on ECS | Production log backend using ECS services and S3 storage. | `infra/terraform/modules/loki` |
| Grafana on ECS | Private Grafana service with Loki datasource provisioning. | `infra/terraform/modules/grafana` |
| GitHub Actions OIDC | AWS deploy role for Terraform workflows. | `infra/terraform/github-oidc.tf` |

## Notes

- Terraform documentation has some older wording about Amazon Managed Grafana, AMP, X-Ray, and ADOT collector. The root `infra/terraform/README.md` states the current mapping: AWS production logs use Loki/Grafana on ECS; traces and metrics are not provisioned in this iteration.
- TODO: Reconcile `docs/terraform.md` with `infra/terraform/README.md` if production observability direction has changed.
