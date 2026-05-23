# Observability Stack

This directory contains the Grafana-based observability stack for local development with a production-shaped architecture.

The main goal is:

```text
Application availability > telemetry completeness
```

Logs, metrics, and traces are best-effort signals. If Loki, Tempo, Mimir, Prometheus, or Alloy is slow or unavailable, the Rust APIs should continue serving traffic.

## Architecture

```text
                         Grafana
                    http://localhost:3002
                  /          |          \
                 /           |           \
              Loki         Tempo         Mimir
             logs         traces        metrics
              ^             ^             ^
              |             |             |
            Alloy         Alloy       Prometheus
          file tail     OTLP traces   scrape + remote_write
              ^             ^             ^
              |             |             |
        JSON log files   Rust OTLP     Rust /metrics
              \             |             /
               \            |            /
                user-api and cms-api
```

Grafana datasources:

- `Loki`: `http://loki:3100`
- `Tempo`: `http://tempo:3200`
- `Mimir`: `http://mimir:9009/prometheus`

## Telemetry Pipelines

### Logs

```text
Rust API
  -> JSON file under ./logs/<service>/
  -> Alloy file tail
  -> Loki
  -> Grafana
```

The Rust APIs also write JSON logs to stdout. In ECS production this can be used as the CloudWatch Logs fallback path.

Loki labels must stay low-cardinality:

- `service`
- `env`
- `level`
- `cluster`

Do not promote request IDs, trace IDs, user IDs, device IDs, tokens, or full URL paths to Loki labels.

### Metrics

```text
Rust API /metrics
  -> Prometheus scrape
  -> Prometheus remote_write
  -> Mimir
  -> Grafana
```

Prometheus is used as the local scraper and remote-write agent. Mimir is the metrics backend Grafana queries.

Local Prometheus uses static Docker service names because Docker Compose service names are stable:

- `user-api:8080`
- `cms-api:8081`
- `alloy:12345`
- `prometheus:9090`

In production, replace static scrape targets with service discovery, an Alloy sidecar, or a Prometheus agent deployment.

### Traces

```text
Rust API sampled OTLP
  -> Alloy OTLP receiver
  -> Tempo
  -> Grafana
```

The default local sampling ratio is `1%`:

```text
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.01
```

For local debugging, set `OTEL_TRACES_SAMPLER_ARG=1.0`.

## Local Services

| Service | Purpose | Local URL |
| --- | --- | --- |
| Grafana | UI for logs, metrics, traces | `http://localhost:3002` |
| Loki | Log backend | `http://localhost:3100` |
| Tempo | Trace backend | `http://localhost:3200` |
| Mimir | Metrics backend | `http://localhost:9009` |
| Prometheus | Scrape and remote-write agent | `http://localhost:9090` |
| Alloy | Log tailer and OTLP trace collector | `http://localhost:12345` |
| OTLP gRPC | Trace ingestion into Alloy | `localhost:4317` |
| OTLP HTTP | Trace ingestion into Alloy | `localhost:4318` |

Grafana login:

```text
admin / admin
```

Grafana uses port `3002` locally because `user-web` already uses host port `3000`.

## Local Usage

Start the stack:

```bash
docker compose up -d --build
```

Start only observability services:

```bash
docker compose up -d loki tempo mimir prometheus grafana alloy
```

Check API health:

```bash
curl localhost:8080/health
curl localhost:8081/health
```

Check metrics:

```bash
curl localhost:8080/metrics
curl localhost:8081/metrics
```

Query Mimir directly:

```bash
curl -fsS 'http://localhost:9009/prometheus/api/v1/query?query=up'
```

Query Loki directly:

```bash
curl -fsS 'http://localhost:3100/loki/api/v1/query_range?query={service="user-api"}&limit=5'
```

## Production Mapping

Local Compose is intentionally production-shaped, but not itself production-ready.

Production should use this shape:

```text
Logs:
Rust JSON file/stdout
  -> Alloy sidecar or log agent
  -> Loki with object storage or Grafana Cloud Logs

Metrics:
Rust /metrics
  -> Alloy or Prometheus agent scrape
  -> remote_write
  -> Mimir with object storage or Grafana Cloud Metrics

Traces:
Rust sampled OTLP
  -> Alloy sidecar or gateway
  -> Tempo with object storage or Grafana Cloud Traces
```

For Mimir production deployment:

- Do not use filesystem storage except for local testing.
- Use S3 or another supported object store.
- Use `mimir/config.s3.example.yaml` as the starting point.
- In ECS, prefer task/service discovery or sidecar scraping over static targets.
- Keep scraper local retention short if all durable metrics are remote-written to Mimir.

## Failure Behavior

Expected behavior:

- Loki down: APIs keep serving; logs may queue locally or be lost after rotation.
- Tempo down: APIs keep serving; sampled traces may be dropped.
- Mimir down: APIs keep serving; Prometheus remote-write queues temporarily, then may drop if pressure persists.
- Prometheus down: APIs keep serving; metrics are not scraped during downtime.
- Alloy down: APIs keep serving; logs/traces forwarding is unavailable.

Telemetry loss is acceptable under pressure. API request handling must not depend on observability backend availability.

## Files

- `alloy/config.alloy`: file-tail logs and OTLP trace forwarding.
- `loki/config.yaml`: local Loki backend.
- `tempo/tempo.yaml`: local Tempo backend.
- `mimir/config.yaml`: local filesystem-backed Mimir backend.
- `mimir/config.s3.example.yaml`: production-oriented S3-backed Mimir example.
- `prometheus/prometheus.yml`: local scrape config and remote_write to Mimir.
- `grafana/provisioning/datasources/datasources.yaml`: Grafana datasource provisioning.
