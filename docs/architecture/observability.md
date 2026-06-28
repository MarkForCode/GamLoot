# Observability Architecture

## Local Stack

| Component | Purpose |
| --- | --- |
| Grafana | Unified dashboards and exploration. |
| Loki | Logs. |
| Fluent Bit | Log collection. |
| Tempo | Traces. |
| Mimir | Metrics backend. |
| Prometheus | Metrics scraping. |
| Alloy | OpenTelemetry collection. |

## Signal Flow

```text
Logs    -> Fluent Bit -> Loki  -> Grafana
Traces  -> Alloy      -> Tempo -> Grafana
Metrics -> Prometheus -> Mimir -> Grafana
```

## Label Policy

Use low-cardinality labels only:

- `service`
- `env`
- `level`
- `cluster`

Do not promote request IDs, trace IDs, user IDs, session IDs, URLs, or payload values to labels. Keep them in structured fields.

## Diagnostics

Temporary diagnostics should be explicit, structured, and easy to disable. Prefer request IDs for correlation and avoid logging secrets or raw user payloads.
