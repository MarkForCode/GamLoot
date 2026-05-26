# Observability Stack

This directory contains the local Grafana OSS observability stack. It mirrors the production log shape while keeping traces and metrics local for development.

The operating rule is:

```text
Application availability > telemetry completeness
```

Logs, metrics, and traces are best-effort signals. If Loki, Tempo, Mimir, Prometheus, Fluent Bit, or Alloy is unavailable, the app containers should continue serving traffic.

## Architecture

```text
App stdout/stderr
  -> Docker fluentd logging driver
  -> Fluent Bit
  -> Loki
  -> Grafana

Rust OTLP traces
  -> Alloy
  -> Tempo
  -> Grafana

Rust /metrics
  -> Prometheus scrape
  -> Prometheus remote_write
  -> Mimir
  -> Grafana
```

Grafana datasources:

- `Loki`: `http://loki:3100`
- `Tempo`: `http://tempo:3200`
- `Mimir`: `http://mimir:9009/prometheus`

## Logs

Local logs follow the ECS production direction:

```text
App container stdout/stderr
  -> Fluent Bit
  -> Loki
```

Docker Compose configures the app containers with the `fluentd` logging driver. The driver sends logs to `localhost:24224`, where the `fluent-bit` service listens with the forward input and writes to Loki.

Use low-cardinality Loki labels only:

- `service`
- `env`
- `level`
- `cluster`

Do not promote request IDs, trace IDs, user IDs, device IDs, tokens, or full URL paths to Loki labels.

Query Loki directly:

```bash
curl -fsS 'http://localhost:3100/loki/api/v1/query_range?query={service="user-api"}&limit=5'
```

## Traces

Traces stay on the existing local OTLP path:

```text
Rust API sampled OTLP
  -> Alloy OTLP receiver on 4317/4318
  -> Tempo
  -> Grafana
```

The default sampling ratio is `1%`:

```text
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.01
```

For local debugging, set `OTEL_TRACES_SAMPLER_ARG=1.0`.

## Metrics

Metrics stay on the local Prometheus/Mimir path:

```text
Rust API /metrics
  -> Prometheus scrape
  -> Prometheus remote_write
  -> Mimir
  -> Grafana
```

Prometheus scrapes:

- `user-api:8080`
- `cms-api:8081`
- `alloy:12345`
- `prometheus:9090`

Query Mimir directly:

```bash
curl -fsS 'http://localhost:9009/prometheus/api/v1/query?query=up'
```

## Local Services

| Service | Purpose | Local URL |
| --- | --- | --- |
| Grafana | UI for logs, metrics, traces | `http://localhost:3002` |
| Loki | Log backend | `http://localhost:3100` |
| Fluent Bit | Log router | `localhost:24224` |
| Tempo | Trace backend | `http://localhost:3200` |
| Mimir | Metrics backend | `http://localhost:9009` |
| Prometheus | Scrape and remote-write agent | `http://localhost:9090` |
| Alloy | OTLP trace collector | `http://localhost:12345` |
| OTLP gRPC | Trace ingestion into Alloy | `localhost:4317` |
| OTLP HTTP | Trace ingestion into Alloy | `localhost:4318` |

Grafana login:

```text
admin / admin
```

Grafana uses port `3002` locally because `user-web` uses host port `3000`.

## Local Usage

Start the stack:

```bash
docker compose up -d --build
```

Start only observability services:

```bash
docker compose up -d loki fluent-bit tempo mimir prometheus grafana alloy
```

Check API health:

```bash
curl localhost:8080/health
curl localhost:8081/health
```

Check metrics endpoints:

```bash
curl localhost:8080/metrics
curl localhost:8081/metrics
```

## Production Mapping

AWS Terraform now implements the production logs path:

```text
ECS app stdout/stderr
  -> Fluent Bit FireLens sidecar
  -> Loki on ECS Fargate
  -> S3 chunks/index
  -> Grafana on ECS
```

Tempo, Prometheus, and Mimir remain local development services in this iteration. They are not provisioned by the AWS Terraform stack.

Current local/Terraform signal mapping:

| Signal | Local Docker Compose | AWS Terraform |
| --- | --- | --- |
| Logs | Docker fluentd driver -> Fluent Bit -> Loki -> Grafana | FireLens Fluent Bit sidecar -> Loki gateway/read/write/backend on ECS -> S3 chunks/index -> Grafana on ECS |
| Traces | Alloy OTLP receiver -> Tempo -> Grafana | Not provisioned. The legacy `observability-collector` module exists, but the root module currently sets `count = 0`. |
| Metrics | Prometheus scrape -> remote_write -> Mimir -> Grafana | Not provisioned through the Grafana OSS path. CloudWatch can provide AWS service alarms/dashboard when enabled. |

Terraform-specific notes:

- Grafana on ECS is provisioned with a Loki datasource only. Local Grafana also has Tempo and Mimir datasources, plus trace/log linking.
- Loki on Terraform runs as separate `write`, `read`, `backend`, and `gateway` ECS services, with S3-backed TSDB storage and retention enabled.
- App ECS task definitions set OTEL environment variables. When the collector is disabled, the OTLP endpoint is empty and traces are not exported.
- `enable_observability_collector` is currently a placeholder flag: the root module does not use it to create the collector service yet.
- When Loki logging is enabled, app containers use the `awsfirelens` log driver and a `log-router` sidecar. Keep the application-availability rule in mind when changing FireLens behavior.
- Terraform adds a `container` Loki label in addition to the local low-cardinality labels. This is currently low cardinality because it matches the service/container name, but avoid adding request/user/device identifiers as labels.

## Failure Behavior

- Fluent Bit down: APIs keep serving; Docker may buffer briefly, then logs can be lost.
- Loki down: APIs keep serving; logs may be dropped after Fluent Bit retry/buffer pressure.
- Tempo down: APIs keep serving; sampled traces may be dropped.
- Mimir down: APIs keep serving; Prometheus remote-write queues temporarily, then may drop samples.
- Prometheus down: APIs keep serving; metrics are not scraped during downtime.
- Alloy down: APIs keep serving; trace forwarding is unavailable.

Telemetry loss is acceptable under pressure. API request handling must not depend on observability backend availability.

## Files

- `fluent-bit/fluent-bit.conf`: local stdout/stderr log routing to Loki.
- `alloy/config.alloy`: OTLP trace forwarding to Tempo.
- `loki/config.yaml`: local filesystem-backed Loki backend.
- `tempo/tempo.yaml`: local Tempo backend.
- `mimir/config.yaml`: local filesystem-backed Mimir backend.
- `mimir/config.s3.example.yaml`: production-oriented S3-backed Mimir example.
- `prometheus/prometheus.yml`: local scrape config and remote_write to Mimir.
- `grafana/provisioning/datasources/datasources.yaml`: Grafana datasource provisioning.
