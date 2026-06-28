# Detected Infrastructure

## Local Infrastructure

| Path | Purpose |
| --- | --- |
| `docker-compose.yml` | Main local stack for database, cache, APIs, workers, and web apps. |
| `docker-compose.localstack.yml` | LocalStack support for infrastructure validation. |
| `seed/` | SQL seed data used by local development and smoke flows. |
| `ops/observability/` | Local observability stack configuration. |

## Cloud Infrastructure

| Path | Purpose |
| --- | --- |
| `infra/terraform/` | AWS Terraform modules and environment configuration. |
| `infra/terraform/environments/` | Environment-specific Terraform variables. |
| `infra/terraform-localstack/` | LocalStack Terraform subset for safer validation. |
| `infra/terratest/` | Go tests for Terraform behavior. |

## CI/CD

| Workflow | Purpose |
| --- | --- |
| `.github/workflows/ci.yml` | Node lint/typecheck/test and Rust fmt/clippy/test. |
| `.github/workflows/terraform-localstack.yml` | Manual LocalStack Terraform validation. |
| `.github/workflows/terraform-aws.yml` | AWS Terraform validate, plan, and controlled apply. |
| `.github/workflows/ai-code-review.yml` | Advisory AI PR review for same-repository PRs. |

## Observability

Local observability is Grafana-based:

```text
App logs -> Fluent Bit -> Loki -> Grafana
Rust OTLP traces -> Alloy -> Tempo -> Grafana
Rust /metrics -> Prometheus -> Mimir -> Grafana
```

Production diagnostics should preserve low-cardinality labels. Request IDs, user IDs, trace IDs, and URL paths belong in structured log fields or traces, not Loki labels.
